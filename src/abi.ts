import { bin2num } from './builtins';
import { ABIEntity, ABIEntityType } from './compilerWrapper';
import { AbstractContract, AsmVarValues, TxContext, VerifyResult } from './contract';
import { deserializeArgfromHex } from './deserializer';
import { genLaunchConfigFile } from './launchConfig';
import { SupportedParamType, TypeResolver, Int } from './scryptTypes';
import { toScriptHex } from './serializer';
import Stateful from './stateful';
import { flatternArg } from './typeCheck';
import { buildContractCode } from './utils';

import { Chain, UnlockingScript, LockingScript, Script, ScriptChunk } from './chain';

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

  private _unlockingScript?: UnlockingScript;

  private _lockingScript?: LockingScript;

  get unlockingScript(): UnlockingScript | undefined {
    return this._unlockingScript;
  }

  get lockingScript(): LockingScript | undefined {
    return this._lockingScript;
  }

  set lockingScript(s: LockingScript | undefined) {
    this._lockingScript = s;
  }

  constructor(
    public methodName: string,
    binding: {
      contract: AbstractContract;
      unlockingScript?: UnlockingScript;
      lockingScript?: LockingScript;
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
      return this.unlockingScript;
    }
  }

  toHex(): string {
    return this.toScript().toHex();
  }



  genLaunchConfig(): FileUri {

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

    const txCtx: TxContext = Object.assign({}, this.contract.txContext || {}, state) as TxContext;


    return genLaunchConfigFile(this.contract.resolver, this.contract.ctorArgs(), this.args, pubFunc, name, program, txCtx, asmArgs);
  }

  verify(): VerifyResult {
    const result = this.contract.run_verify(this.unlockingScript);

    if (!result.success) {
      const debugUrl = this.genLaunchConfig();
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
  unlockingScript: UnlockingScript;
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

    const hasCodePartTemplate = hexTemplate.match(/<__codePart__>/g) ? true : false;
    if (hasCodePartTemplate) {
      contract.hexTemplateArgs.set('<__codePart__>', '00');
    }

    // Check if inline ASM var values are expected to be set.
    const templateMatches = hexTemplate.match(/<.*?>/g);
    const templateCount = templateMatches ? templateMatches.length : 0;
    contract.hasInlineASMVars = hasCodePartTemplate ?
      templateCount > contract.hexTemplateArgs.size + 1 :
      templateCount > contract.hexTemplateArgs.size;

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
    const script = Chain.getFactory().LockingScript.fromHex(raw);
    const constructorABI = this.abi.filter(entity => entity.type === ABIEntityType.CONSTRUCTOR)[0];
    const cParams = constructorABI?.params || [];


    let offset = 0;

    let dataPartInHex: string | undefined = undefined;
    let codePartEndIndex = -1;

    const err = new Error(`the raw script cannot match the ASM template of contract ${contract.contractName}`);
    function checkOp(chunk: ScriptChunk) {

      const op = hexTemplate.substring(offset, offset + 2);
      if (parseInt(op, 16) != chunk.op) {
        throw err;
      }
      offset = offset + 2;
    }

    function checkPushByteLength(chunk: ScriptChunk) {

      const op = hexTemplate.substring(offset, offset + 2);
      if (parseInt(op, 16) != chunk.op) {
        throw err;
      }
      offset = offset + 2;

      const data = hexTemplate.substring(offset, offset + chunk.data.length * 2);

      if (Chain.getFactory().Utils.toHex(chunk.data) != data) {
        throw err;
      }
      offset = offset + chunk.data.length * 2;
    }


    function checkPushData1(chunk: ScriptChunk) {

      const op = hexTemplate.substring(offset, offset + 2);
      if (parseInt(op, 16) != chunk.op) {
        throw err;
      }
      offset = offset + 2;

      const next1Byte = hexTemplate.substring(offset, offset + 2);

      if (parseInt(next1Byte, 16) != chunk.data.length) {
        throw err;
      }

      offset = offset + 2;

      const data = hexTemplate.substring(offset, offset + chunk.data.length * 2);

      if (Chain.getFactory().Utils.toHex(chunk.data) != data) {
        throw err;
      }
      offset = offset + chunk.data.length * 2;
    }

    function checkPushData2(chunk: ScriptChunk) {

      const op = hexTemplate.substring(offset, offset + 2);
      if (parseInt(op, 16) != chunk.op) {
        throw err;
      }
      offset = offset + 2;

      const next2Byte = hexTemplate.substring(offset, offset + 4);

      if (bin2num(next2Byte) != BigInt(chunk.data.length)) {
        throw err;
      }

      offset = offset + 4;

      const data = hexTemplate.substring(offset, offset + chunk.data.length * 2);

      if (Chain.getFactory().Utils.toHex(chunk.data) != data) {
        throw err;
      }
      offset = offset + chunk.data.length * 2;
    }

    function checkPushData4(chunk: ScriptChunk) {

      const op = hexTemplate.substring(offset, offset + 2);
      if (parseInt(op, 16) != chunk.op) {
        throw err;
      }
      offset = offset + 2;

      const next4Byte = hexTemplate.substring(offset, offset + 8);

      if (bin2num(next4Byte) != BigInt(chunk.data.length)) {
        throw err;
      }

      offset = offset + 8;

      const data = hexTemplate.substring(offset, offset + chunk.data.length * 2);

      if (Chain.getFactory().Utils.toHex(chunk.data) != data) {
        throw err;
      }

      offset = offset + chunk.data.length * 2;
    }

    function findTemplateVariable() {
      if (hexTemplate.charAt(offset) == '<') {

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

        return hexTemplate.substring(start, offset);
      }
    }

    function saveTemplateVariableValue(name: string, chunk: ScriptChunk) {
      const bw = Chain.getFactory().Writer.from();

      bw.writeUInt8(chunk.op);
      if (chunk.op > 0) {
        if (chunk.op < Chain.getFactory().OP.OP_PUSHDATA1) {
          bw.write(chunk.data);
        } else if (chunk.op === Chain.getFactory().OP.OP_PUSHDATA1) {
          bw.writeUInt8(chunk.data.length);
          bw.write(chunk.data);
        } else if (chunk.op === Chain.getFactory().OP.OP_PUSHDATA2) {
          bw.writeUInt16LE(chunk.data.length);
          bw.write(chunk.data);
        } else if (chunk.op === Chain.getFactory().OP.OP_PUSHDATA4) {
          bw.writeUInt32LE(chunk.data.length);
          bw.write(chunk.data);
        }
      }



      if (name.startsWith(`<${contract.contractName}.`)) { //inline asm
        contract.hexTemplateInlineASM.set(name, Chain.getFactory().Utils.toHex(bw.toArray()));
      } else {
        contract.hexTemplateArgs.set(name, Chain.getFactory().Utils.toHex(bw.toArray()));
      }

    }


    for (let index = 0; index < script.chunks.length; index++) {
      const chunk = script.chunks[index];

      let breakfor = false;
      switch (true) {
        case (chunk.op === 106):
          {

            if (offset >= hexTemplate.length) {

              const b = Chain.getFactory().LockingScript.from(script.chunks.slice(index + 1));

              dataPartInHex = b.toHex();
              codePartEndIndex = index;
              breakfor = true;
            } else {
              checkOp(chunk);
            }

            break;
          }
        case (chunk.op === 0): {
          const variable = findTemplateVariable();

          if (variable) {
            saveTemplateVariableValue(variable, chunk);
          } else {
            checkOp(chunk);
          }

          break;
        }

        case (chunk.op >= 1 && chunk.op <= 75):
          {
            const variable = findTemplateVariable();

            if (variable) {
              saveTemplateVariableValue(variable, chunk);
            } else {
              checkPushByteLength(chunk);
            }

            break;
          }
        case (chunk.op >= 79 && chunk.op <= 96):
          {
            const variable = findTemplateVariable();

            if (variable) {
              saveTemplateVariableValue(variable, chunk);
            } else {
              checkOp(chunk);
            }

            break;
          }
        case (chunk.op === 76):
          {
            const variable = findTemplateVariable();

            if (variable) {
              saveTemplateVariableValue(variable, chunk);
            } else {
              checkPushData1(chunk);
            }
            break;
          }
        case (chunk.op === 77):
          {
            const variable = findTemplateVariable();

            if (variable) {
              saveTemplateVariableValue(variable, chunk);
            } else {
              checkPushData2(chunk);
            }
            break;
          }
        case (chunk.op === 78):
          {
            const variable = findTemplateVariable();

            if (variable) {
              saveTemplateVariableValue(variable, chunk);
            } else {
              checkPushData4(chunk);
            }
            break;
          }
        default:
          {
            checkOp(chunk);
          }
      }

      if (breakfor) {
        break;
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
      lockingScript: codePartEndIndex > -1 ? Chain.getFactory().LockingScript.from(script.chunks.slice(0, codePartEndIndex)) : script,
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
          hex += `${Chain.getFactory().Utils.num2bin(BigInt(pubFuncIndex))}`;
        }
        return new FunctionCall(name, {
          contract, unlockingScript: Chain.getFactory().UnlockingScript.fromHex(hex), args: entity.params.map((param, index) => ({
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

    const unlockingScript = Chain.getFactory().UnlockingScript.fromHex(hex);

    const usASM = unlockingScript.toASM();

    const pubFunAbis = this.abi.filter(entity => entity.type === 'function');
    const pubFunCount = pubFunAbis.length;

    let entity: ABIEntity | undefined = undefined;
    if (pubFunCount === 1) {
      entity = pubFunAbis[0];
    } else {

      const pubFuncIndexASM = usASM.slice(usASM.lastIndexOf(' ') + 1);

      const pubFuncIndex = Chain.getFactory().Utils.asm2num(pubFuncIndexASM);

      entity = this.abi.find(entity => entity.index === Number(pubFuncIndex));
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

      hexTemplateArgs.set(`<${farg.name}>`, Chain.getFactory().UnlockingScript.fromASM(asmOpcodes[index]).toHex());

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