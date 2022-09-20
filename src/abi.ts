import { int2Asm, bsv, genLaunchConfigFile, isArrayType, checkSupportedParamType, flatternArray, deserializeArgfromHex, parseStateHex, buildContractCode, buildDefaultStateProps, flatternCtorArgs, flatternParams, bin2num } from './utils';
import { AbstractContract, TxContext, VerifyResult, AsmVarValues } from './contract';
import { ScryptType, Bool, Int, SupportedParamType, ScryptTypeResolver } from './scryptTypes';
import { ABIEntityType, ABIEntity, ParamEntity } from './compilerWrapper';

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
  txContext?: any;
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
      return this.unlockingScript;
    }
  }

  toHex(): string {
    return this.toScript().toHex();
  }



  genLaunchConfig(txContext?: TxContext): FileUri {

    const constructorArgs: SupportedParamType[] = this.contract.ctorArgs().map(p => p.value);
    const pubFuncArgs: SupportedParamType[] = this.args.map(arg => arg.value);
    const pubFunc: string = this.methodName;
    const name = `Debug ${this.contract.contractName}`;
    const program = `${this.contract.file}`;

    const asmArgs: AsmVarValues = this.contract.asmArgs || {};

    const state: string = !AbstractContract.isStateful(this.contract) && this.contract.dataPart ? this.contract.dataPart.toASM() : undefined;
    const txCtx: TxContext = Object.assign({}, this.contract.txContext || {}, txContext || {}, { opReturn: state });
    if (AbstractContract.isStateful(this.contract)) {
      Object.assign(txCtx, { opReturnHex: this.contract.dataPart.toHex() });
    } else if (this.contract.dataPart) {
      Object.assign(txCtx, { opReturn: this.contract.dataPart.toASM() });
    }

    return genLaunchConfigFile(constructorArgs, pubFuncArgs, pubFunc, name, program, txCtx, asmArgs);
  }

  verify(txContext?: TxContext): VerifyResult {
    const result = this.contract.run_verify(this.unlockingScript.toASM() || '', txContext);

    if (!result.success) {
      const debugUrl = this.genLaunchConfig(txContext);
      if (debugUrl) {
        result.error = result.error + `\t[Launch Debugger](${debugUrl.replace(/file:/i, 'scryptlaunch:')})\n`;
      }
    }
    return result;
  }

}

export class ABICoder {

  constructor(public abi: ABIEntity[], public resolver: ScryptTypeResolver) { }

  checkArgs(contractname: string, funname: string, params: ParamEntity[], ...args: SupportedParamType[]): void {

    if (args.length !== params.length) {
      throw new Error(`wrong number of arguments for '${contractname}.${funname}', expected ${params.length} but got ${args.length}`);
    }

    params.forEach((param, index) => {
      const arg = args[index];
      const error = checkSupportedParamType(arg, param, this.resolver.resolverType);
      if (error) throw error;
    });
  }

  encodeConstructorCall(contract: AbstractContract, hexTemplate: string, ...args: SupportedParamType[]): FunctionCall {

    const constructorABI = this.abi.filter(entity => entity.type === ABIEntityType.CONSTRUCTOR)[0];
    const cParams = constructorABI?.params || [];
    this.checkArgs(contract.contractName, 'constructor', cParams, ...args);

    // handle array type
    const flatteredArgs = flatternCtorArgs(cParams.map((p, index) => (Object.assign({ ...p }, {
      value: args[index]
    }))), this.resolver.resolverType);



    flatteredArgs.forEach(arg => {
      if (!hexTemplate.includes(`<${arg.name}>`)) {
        throw new Error(`abi constructor params mismatch with args provided: missing ${arg.name} in ASM tempalte`);
      }

      contract.hexTemplateArgs.set(`<${arg.name}>`, this.encodeParam(arg.value, arg));
    });

    contract.hexTemplateArgs.set('<__codePart__>', '00');

    contract.statePropsArgs = buildDefaultStateProps(contract);

    const lockingScript = buildContractCode(contract.hexTemplateArgs, contract.hexTemplateInlineASM, hexTemplate);

    return new FunctionCall('constructor', {
      contract,
      lockingScript: lockingScript,
      args: cParams.map((param, index) => ({
        name: param.name,
        type: param.type,
        value: args[index]
      }))
    });

  }

  encodeConstructorCallFromRawHex(contract: AbstractContract, hexTemplate: string, raw: string): FunctionCall {
    const script = bsv.Script.fromHex(raw);
    const constructorABI = this.abi.filter(entity => entity.type === ABIEntityType.CONSTRUCTOR)[0];
    const cParams = constructorABI?.params || [];


    let offset = 0;

    let dataPartInHex: string | undefined = undefined;
    for (let index = 0; index < script.chunks.length; index++) {
      const chunk = script.chunks[index];

      if (offset >= hexTemplate.length && chunk.opcodenum == 106/*OP_RETURN*/) {

        const b = bsv.Script.fromChunks(script.chunks.slice(index + 1));

        dataPartInHex = b.toHex();
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
      value: undefined
    }), contract.hexTemplateArgs));


    if (AbstractContract.isStateful(contract)) {


      const scriptHex = dataPartInHex;
      const metaScript = dataPartInHex.substr(scriptHex.length - 10, 10);
      const version = bin2num(metaScript.substr(metaScript.length - 2, 2)) as number;




      switch (version) {
        case 0:
          {
            const [firstCall, args] = parseStateHex(contract, scriptHex);
            contract.statePropsArgs = args;
            contract.firstCall = firstCall;
          }
          break;
      }


    } else if (dataPartInHex) {
      contract.setDataPartInHex(dataPartInHex);
    }

    return new FunctionCall('constructor', { contract, lockingScript: script, args: ctorArgs });

  }

  encodePubFunctionCall(contract: AbstractContract, name: string, args: SupportedParamType[]): FunctionCall {
    for (const entity of this.abi) {
      if (entity.name === name) {
        this.checkArgs(contract.contractName, name, entity.params, ...args);
        let hex = this.encodeParams(args, entity.params.map(p => ({
          name: p.name,
          type: this.resolver.resolverType(p.type).finalType
        })));
        if (this.abi.length > 2 && entity.index !== undefined) {
          // selector when there are multiple public functions
          const pubFuncIndex = entity.index;
          hex += `${bsv.Script.fromASM(int2Asm(pubFuncIndex.toString())).toHex()}`;
        }
        return new FunctionCall(name, {
          contract, unlockingScript: bsv.Script.fromHex(hex), args: entity.params.map((param, index) => ({
            name: param.name,
            type: param.type,
            value: args[index]
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
  encodePubFunctionCallFromHex(contract: AbstractContract, name: string, hex: string): FunctionCall {
    const script = bsv.Script.fromHex(hex);
    const entity = this.abi.filter(entity => entity.type === 'function' && entity.name === name)[0];
    if (!entity) {
      throw new Error(`no public function named '${name}' found in contract '${contract.contractName}'`);
    }
    const cParams = entity?.params || [];


    const flatternArgs = flatternParams(cParams, contract.resolver);

    let fArgsLen = flatternArgs.length;
    if (this.abi.length > 2 && entity.index !== undefined) {
      fArgsLen += 1;
    }

    const usASM = script.toASM();
    const asmOpcodes = usASM.split(' ');

    if (fArgsLen != asmOpcodes.length) {
      throw new Error(`the raw unlockingScript cannot match the arguments of public function ${name} of contract ${contract.contractName}`);
    }

    const hexTemplateArgs: Map<string, string> = new Map();

    flatternArgs.forEach((farg, index) => {

      hexTemplateArgs.set(`<${farg.name}>`, bsv.Script.fromASM(asmOpcodes[index]).toHex());

    });


    const args: Arguments = cParams.map(param => deserializeArgfromHex(contract.resolver, Object.assign(param, {
      value: undefined
    }), hexTemplateArgs));

    return new FunctionCall(name, { contract, unlockingScript: script, args: args });

  }

  encodeParams(args: SupportedParamType[], paramsEntitys: ParamEntity[]): string {
    return args.map((arg, i) => this.encodeParam(arg, paramsEntitys[i])).join('');
  }

  encodeParamArray(args: SupportedParamType[], arrayParam: ParamEntity): string {
    return flatternArray(args, arrayParam.name, arrayParam.type).map(arg => {
      return this.encodeParam(arg.value, { name: arg.name, type: this.resolver.resolverType(arg.type).finalType });
    }).join('');
  }


  encodeParam(arg: SupportedParamType, paramEntity: ParamEntity): string {

    if (isArrayType(paramEntity.type)) {
      return this.encodeParamArray(arg as SupportedParamType[], paramEntity);
    }

    if (arg instanceof ScryptType) {
      return arg.toHex();
    }

    const typeofArg = typeof arg;

    if (typeofArg === 'boolean') {
      arg = new Bool(arg as boolean);
    } else if (typeofArg === 'number') {
      arg = new Int(arg as number);
    } else if (typeofArg === 'bigint') {
      arg = new Int(arg as bigint);
    } else if (typeof arg === 'string') {
      arg = new Int(arg as string);
    } else {
      //we call checkArg before encodeParam, shouldn't get here under normal circumstances
      throw new Error(`The value of parameter ${paramEntity.name} is unknown type: ${typeofArg}`);
    }

    return (arg as ScryptType).toHex();
  }

}