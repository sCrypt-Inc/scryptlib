import { bin2num } from './builtins';
import { ABIEntity, ABIEntityType } from './compilerWrapper';
import { AbstractContract, AsmVarValues, TxContext, VerifyResult } from './contract';
import { deserializeArgfromHex } from './deserializer';
import { genLaunchConfigFile } from './launchConfig';
import { SupportedParamType, TypeResolver, Int } from './scryptTypes';
import { toScriptHex } from './serializer';
import Stateful from './stateful';
import { flatternArg } from './typeCheck';
import { asm2int, bsv, buildContractCode, int2Asm } from './utils';

export type Script = bsv.Script;

export type FileUri = string;

/**
     * Configuration for a debug session.
     */
export interface DebugConfiguration {
  type: 'scrypt';
  request: 'launch';
  internalConsoleOptions: 'openOnSessionStart',
  name: string;
  program: string;
  constructorArgs: SupportedParamType[];
  pubFunc: string;
  pubFuncArgs: SupportedParamType[];
  asmArgs?: AsmVarValues;
  txContext?: TxContext;
}

export interface DebugLaunch {
  version: '0.2.0';
  configurations: DebugConfiguration[];
}


export interface Argument {
  name: string,
  type: string,
  value: SupportedParamType
}

export type Arguments = Argument[];


export class FunctionCall {

  readonly contract: AbstractContract;

  readonly args: Arguments = [];

  private _unlockingScript?: Script;

  private _lockingScript?: Script;

  get unlockingScript(): Script | undefined {
    return this._unlockingScript;
  }

  get lockingScript(): Script | undefined {
    return this._lockingScript;
  }

  set lockingScript(s: Script | undefined) {
    this._lockingScript = s;
  }

  constructor(
    public methodName: string,
    binding: {
      contract: AbstractContract;
      unlockingScript?: Script;
      lockingScript?: Script;
      args: Arguments;
    }
  ) {

    if (binding.lockingScript === undefined && binding.unlockingScript === undefined) {
      throw new Error('param binding.lockingScript & binding.unlockingScript cannot both be empty');
    }

    this.contract = binding.contract;

    this.args = binding.args;

    if (binding.lockingScript) {
      this._lockingScript = binding.lockingScript;
    }

    if (binding.unlockingScript) {
      this._unlockingScript = binding.unlockingScript;
    }
  }

  toASM(): string {
    return this.toScript().toASM();
  }

  toString(): string {
    return this.toHex();
  }

  toScript(): Script {
    if (this.lockingScript) {
      return this.lockingScript;
    } else {
      return this.unlockingScript as Script;
    }
  }

  toHex(): string {
    return this.toScript().toHex();
  }



  genLaunchConfig(txContext?: TxContext): FileUri {

    const pubFunc: string = this.methodName;
    const name = `Debug ${this.contract.contractName}`;
    const program = `${this.contract.file}`;

    const asmArgs: AsmVarValues = this.contract.asmArgs || {};

    const state = {};
    if (AbstractContract.isStateful(this.contract)) {
      Object.assign(state, { opReturnHex: this.contract.dataPart?.toHex() || '' });
    } else if (this.contract.dataPart) {
      Object.assign(state, { opReturn: this.contract.dataPart.toASM() });
    }

    const txCtx: TxContext = Object.assign({}, this.contract.txContext || {}, txContext || {}, state) as TxContext;


    return genLaunchConfigFile(this.contract.resolver, this.contract.ctorArgs(), this.args, pubFunc, name, program, txCtx, asmArgs);
  }

  verify(txContext?: TxContext): VerifyResult {
    const result = this.contract.run_verify(this.unlockingScript, txContext);

    if (!result.success) {
      const debugUrl = this.genLaunchConfig(txContext);
      if (debugUrl) {
        result.error = result.error + `\t[Launch Debugger](${debugUrl.replace(/file:/i, 'scryptlaunch:')})\n`;
      }
    }
    return result;
  }

}

/**
 * Calldata is the relevant information when the contract is called, such as the public function name and function arguments when the call occurs.
 */
export interface CallData {
  /** name of public function */
  methodName: string;
  /** unlocking Script */
  unlockingScript: bsv.Script;
  /** function arguments */
  args: Arguments;
}

export class ABICoder {

  constructor(public abi: ABIEntity[], public resolver: TypeResolver, public contractName: string) { }


  encodeConstructorCall(contract: AbstractContract, hexTemplate: string, ...args: SupportedParamType[]): FunctionCall {

    const constructorABI = this.abi.filter(entity => entity.type === ABIEntityType.CONSTRUCTOR)[0];
    const cParams = constructorABI?.params || [];

    const args_ = contract.checkArgs('constructor', cParams, ...args);

    // handle array type
    const flatteredArgs = cParams.flatMap((p, index) => {
      const a = Object.assign({ ...p }, {
        value: args_[index]
      }) as Argument;

      return flatternArg(a, this.resolver, { state: false, ignoreValue: false });
    });

    flatteredArgs.forEach(arg => {
      if (!hexTemplate.includes(`<${arg.name}>`)) {
        throw new Error(`abi constructor params mismatch with args provided: missing ${arg.name} in ASM tempalte`);
      }

      contract.hexTemplateArgs.set(`<${arg.name}>`, toScriptHex(arg.value, arg.type));
    });

    contract.hexTemplateArgs.set('<__codePart__>', '00');

    contract.statePropsArgs = Stateful.buildDefaultStateArgs(contract);

    const lockingScript = buildContractCode(contract.hexTemplateArgs, contract.hexTemplateInlineASM, hexTemplate);

    return new FunctionCall('constructor', {
      contract,
      lockingScript: lockingScript,
      args: cParams.map((param, index) => ({
        name: param.name,
        type: param.type,
        value: args_[index]
      }))
    });

  }

  encodeConstructorCallFromRawHex(contract: AbstractContract, hexTemplate: string, raw: string): FunctionCall {
    const script = bsv.Script.fromHex(raw);
    const constructorABI = this.abi.filter(entity => entity.type === ABIEntityType.CONSTRUCTOR)[0];
    const cParams = constructorABI?.params || [];


    let offset = 0;

    let dataPartInHex: string | undefined = undefined;
    let codePartEndIndex = -1;
    for (let index = 0; index < script.chunks.length; index++) {
      const chunk = script.chunks[index];

      if (offset >= hexTemplate.length && chunk.opcodenum == 106/*OP_RETURN*/) {

        const b = bsv.Script.fromChunks(script.chunks.slice(index + 1));

        dataPartInHex = b.toHex();
        codePartEndIndex = index;
        break;

      } else if (hexTemplate.charAt(offset) == '<') {

        const start = offset;

        let found = false;
        while (!found && offset < hexTemplate.length) {
          offset++;
          if (hexTemplate.charAt(offset) == '>') {
            offset++;
            found = true;
          }
        }

        if (!found) {
          throw new Error('cannot found break >');
        }

        const name = hexTemplate.substring(start, offset);


        const bw = new bsv.encoding.BufferWriter();

        bw.writeUInt8(chunk.opcodenum);
        if (chunk.buf) {
          if (chunk.opcodenum < bsv.Opcode.OP_PUSHDATA1) {
            bw.write(chunk.buf);
          } else if (chunk.opcodenum === bsv.Opcode.OP_PUSHDATA1) {
            bw.writeUInt8(chunk.len);
            bw.write(chunk.buf);
          } else if (chunk.opcodenum === bsv.Opcode.OP_PUSHDATA2) {
            bw.writeUInt16LE(chunk.len);
            bw.write(chunk.buf);
          } else if (chunk.opcodenum === bsv.Opcode.OP_PUSHDATA4) {
            bw.writeUInt32LE(chunk.len);
            bw.write(chunk.buf);
          }
        }



        if (name.startsWith(`<${contract.contractName}.`)) { //inline asm
          contract.hexTemplateInlineASM.set(name, bw.toBuffer().toString('hex'));
        } else {
          contract.hexTemplateArgs.set(name, bw.toBuffer().toString('hex'));
        }

      } else {


        const op = hexTemplate.substring(offset, offset + 2);

        offset = offset + 2;

        if (parseInt(op, 16) != chunk.opcodenum) {
          throw new Error(`the raw script cannot match the ASM template of contract ${contract.contractName}`);
        }

        if (chunk.len > 0) {

          const data = hexTemplate.substring(offset, offset + chunk.len * 2);

          if (chunk.buf.toString('hex') != data) {
            throw new Error(`the raw script cannot match the ASM template of contract ${contract.contractName}`);
          }

          offset = offset + chunk.len * 2;
        }
      }
    }


    const ctorArgs: Arguments = cParams.map(param => deserializeArgfromHex(contract.resolver, Object.assign(param, {
      value: false // fake value
    }), contract.hexTemplateArgs, { state: false }));


    if (AbstractContract.isStateful(contract) && dataPartInHex) {


      const scriptHex = dataPartInHex;
      const metaScript = dataPartInHex.substr(scriptHex.length - 10, 10);
      const version = bin2num(metaScript.substr(metaScript.length - 2, 2));

      switch (version) {
        case Int(0):
          {
            const [isGenesis, args] = Stateful.parseStateHex(contract, scriptHex);
            contract.statePropsArgs = args;
            contract.isGenesis = isGenesis;
          }
          break;
      }


    } else if (dataPartInHex) {
      contract.setDataPartInHex(dataPartInHex);
    }

    return new FunctionCall('constructor', {
      contract,
      lockingScript: codePartEndIndex > -1 ? bsv.Script.fromChunks(script.chunks.slice(0, codePartEndIndex)) : script,
      args: ctorArgs
    });

  }

  encodePubFunctionCall(contract: AbstractContract, name: string, args: SupportedParamType[]): FunctionCall {
    for (const entity of this.abi) {
      if (entity.name === name) {
        const args_ = contract.checkArgs(name, entity.params, ...args);

        const flatteredArgs = entity.params.flatMap((p, index) => {
          const a = Object.assign({ ...p }, {
            value: args_[index]
          }) as Argument;

          return flatternArg(a, this.resolver, { state: false, ignoreValue: false });
        });

        let hex = flatteredArgs.map(a => toScriptHex(a.value, a.type)).join('');

        if (this.abi.length > 2 && entity.index !== undefined) {
          // selector when there are multiple public functions
          const pubFuncIndex = entity.index;
          hex += `${bsv.Script.fromASM(int2Asm(pubFuncIndex.toString())).toHex()}`;
        }
        return new FunctionCall(name, {
          contract, unlockingScript: bsv.Script.fromHex(hex), args: entity.params.map((param, index) => ({
            name: param.name,
            type: param.type,
            value: args_[index]
          }))
        });
      }
    }

    throw new Error(`no public function named '${name}' found in contract '${contract.contractName}'`);
  }

  /**
   * build a FunctionCall by function name and unlocking script in hex.
   * @param contract 
   * @param name name of public function
   * @param hex hex of unlocking script
   * @returns a FunctionCall which contains the function parameters that have been deserialized
   */
  encodePubFunctionCallFromHex(contract: AbstractContract, hex: string): FunctionCall {
    const callData = this.parseCallData(hex);
    return new FunctionCall(callData.methodName, { contract, unlockingScript: callData.unlockingScript, args: callData.args });
  }



  /**
   * build a CallData by unlocking script in hex.
   * @param hex hex of unlocking script
   * @returns a CallData which contains the function parameters that have been deserialized
   */
  parseCallData(hex: string): CallData {

    const unlockingScript = bsv.Script.fromHex(hex);

    const usASM = unlockingScript.toASM() as string;

    const pubFunAbis = this.abi.filter(entity => entity.type === 'function');
    const pubFunCount = pubFunAbis.length;

    let entity: ABIEntity | undefined = undefined;
    if (pubFunCount === 1) {
      entity = pubFunAbis[0];
    } else {

      const pubFuncIndexASM = usASM.slice(usASM.lastIndexOf(' ') + 1);

      const pubFuncIndex = asm2int(pubFuncIndexASM);

      entity = this.abi.find(entity => entity.index === pubFuncIndex);
    }

    if (!entity) {
      throw new Error(`the raw unlocking script cannot match the contract ${this.constructor.name}`);
    }

    const cParams = entity.params || [];

    const dummyArgs = cParams.map(p => {
      const dummyArg = Object.assign({}, p, { value: false });
      return flatternArg(dummyArg, this.resolver, { state: true, ignoreValue: true });
    }).flat(Infinity) as Arguments;


    let fArgsLen = dummyArgs.length;
    if (this.abi.length > 2 && entity.index !== undefined) {
      fArgsLen += 1;
    }

    const asmOpcodes = usASM.split(' ');

    if (fArgsLen != asmOpcodes.length) {
      throw new Error(`the raw unlockingScript cannot match the arguments of public function ${entity.name} of contract ${this.contractName}`);
    }

    const hexTemplateArgs: Map<string, string> = new Map();

    dummyArgs.forEach((farg: Argument, index: number) => {

      hexTemplateArgs.set(`<${farg.name}>`, bsv.Script.fromASM(asmOpcodes[index]).toHex());

    });


    const args: Arguments = cParams.map(param => deserializeArgfromHex(this.resolver, Object.assign(param, {
      value: false //fake value
    }), hexTemplateArgs, { state: false }));


    return {
      methodName: entity.name,
      args,
      unlockingScript
    };

  }
}