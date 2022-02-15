import { int2Asm, bsv, genLaunchConfigFile, isArrayType, checkSupportedParamType, flatternArray, typeOfArg, deserializeArgfromASM, num2bin, bin2num } from './utils';
import { AbstractContract, TxContext, VerifyResult, AsmVarValues } from './contract';
import { ScryptType, Bool, Int, SupportedParamType, Struct, TypeResolver, VariableType, ScryptTypeResolver } from './scryptTypes';
import { ABIEntityType, ABIEntity, ParamEntity } from './compilerWrapper';
import { asm2int, buildContractCodeASM, buildDefaultStateProps, deserializeArgfromState, flatternCtorArgs, flatternParams, readBytes } from './internal';

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

  private _unlockingScriptAsm?: string;

  private _lockingScriptAsm?: string;

  get unlockingScript(): Script | undefined {
    return this._unlockingScriptAsm === undefined ? new bsv.Script() : bsv.Script.fromASM(this._unlockingScriptAsm);
  }

  get lockingScript(): Script | undefined {
    return this._lockingScriptAsm === undefined ? undefined : bsv.Script.fromASM(this._lockingScriptAsm);
  }

  init(asmVarValues: AsmVarValues): void {
    for (const key in asmVarValues) {
      const val = asmVarValues[key];
      const re = new RegExp(key.startsWith('$') ? `\\${key}` : `\\$${key}`, 'g');
      this._lockingScriptAsm = this._lockingScriptAsm.replace(re, val);
    }
  }

  constructor(
    public methodName: string,
    binding: {
      contract: AbstractContract;
      lockingScriptASM?: string;
      unlockingScriptASM?: string;
      args: Arguments;
    }
  ) {

    if (binding.lockingScriptASM === undefined && binding.unlockingScriptASM === undefined) {
      throw new Error('param binding.lockingScriptASM & binding.unlockingScriptASM cannot both be empty');
    }

    this.contract = binding.contract;

    this.args = binding.args;

    if (binding.lockingScriptASM) {
      this._lockingScriptAsm = binding.lockingScriptASM;
    }

    if (binding.unlockingScriptASM) {
      this._unlockingScriptAsm = binding.unlockingScriptASM;
    }
  }

  toASM(): string {
    if (this.lockingScript) {
      return this.lockingScript.toASM();
    } else {
      return this.unlockingScript.toASM();
    }
  }

  toString(): string {
    return this.toHex();
  }

  toScript(): Script {
    return bsv.Script.fromASM(this.toASM());
  }

  toHex(): string {
    return this.toScript().toHex();
  }



  genLaunchConfig(txContext?: TxContext): FileUri {

    const constructorArgs: SupportedParamType[] = this.contract.ctorArgs().map(p => p.value);
    const pubFuncArgs: SupportedParamType[] = this.args.map(arg => arg.value);
    const pubFunc: string = this.methodName;
    const name = `Debug ${Object.getPrototypeOf(this.contract).constructor.contractName}`;
    const program = `${Object.getPrototypeOf(this.contract).constructor.file}`;

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
    const result = this.contract.run_verify(this.unlockingScript.toASM() || '', txContext, this.args);

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

  encodeConstructorCall(contract: AbstractContract, asmTemplate: string, ...args: SupportedParamType[]): FunctionCall {

    const constructorABI = this.abi.filter(entity => entity.type === ABIEntityType.CONSTRUCTOR)[0];
    const cParams = constructorABI?.params || [];
    const contractName = Object.getPrototypeOf(contract).constructor.contractName as string;
    this.checkArgs(contractName, 'constructor', cParams, ...args);

    // handle array type
    const flatteredArgs = flatternCtorArgs(cParams.map((p, index) => (Object.assign({ ...p }, {
      value: args[index]
    }))), this.resolver.resolverType);



    flatteredArgs.forEach(arg => {
      if (!asmTemplate.includes(`$${arg.name}`)) {
        throw new Error(`abi constructor params mismatch with args provided: missing ${arg.name} in ASM tempalte`);
      }
      contract.asmTemplateArgs.set(`$${arg.name}`, this.encodeParam(arg.value, arg));
    });

    contract.asmTemplateArgs.set('$__codePart__', 'OP_0');

    contract.statePropsArgs = buildDefaultStateProps(contract);

    return new FunctionCall('constructor', {
      contract,
      lockingScriptASM: buildContractCodeASM(contract.asmTemplateArgs, asmTemplate),
      args: cParams.map((param, index) => ({
        name: param.name,
        type: param.type,
        value: args[index]
      }))
    });

  }

  parseStateHex(contract: AbstractContract, scriptHex: string): Arguments {

    const metaScript = scriptHex.substr(scriptHex.length - 10, 10);
    const version = bin2num(metaScript.substr(metaScript.length - 2, 2)) as number;
    const stateLen = bin2num(metaScript.substr(0, 8)) as number;


    const stateHex = scriptHex.substr(scriptHex.length - 10 - stateLen * 2, stateLen * 2);

    const br = new bsv.encoding.BufferReader(stateHex);

    const opcodenum = br.readUInt8();

    contract.firstCall = opcodenum == 1;

    const stateAsmTemplateArgs: Map<string, string> = new Map();

    const stateProps = Object.getPrototypeOf(contract).constructor.stateProps as Array<ParamEntity>;
    const flatternparams = flatternParams(stateProps, contract.resolver);


    flatternparams.forEach((param) => {
      if (param.type === VariableType.BOOL) {
        const opcodenum = br.readUInt8();
        stateAsmTemplateArgs.set(`$${param.name}`, opcodenum === 1 ? '01' : '00');
      } else {
        const { data } = readBytes(br);
        if (param.type === VariableType.INT || param.type === VariableType.PRIVKEY) {
          stateAsmTemplateArgs.set(`$${param.name}`, new Int(bin2num(data)).toASM());
        } else {
          stateAsmTemplateArgs.set(`$${param.name}`, data);
        }
      }
    });


    return stateProps.map(param => deserializeArgfromState(contract.resolver, Object.assign(param, {
      value: undefined
    }), stateAsmTemplateArgs));
  }

  encodeConstructorCallFromRawHex(contract: AbstractContract, asmTemplate: string, raw: string): FunctionCall {
    const script = bsv.Script.fromHex(raw);
    const constructorABI = this.abi.filter(entity => entity.type === ABIEntityType.CONSTRUCTOR)[0];
    const cParams = constructorABI?.params || [];
    const contractName = Object.getPrototypeOf(contract).constructor.contractName;

    const asmTemplateOpcodes = asmTemplate.split(' ');

    let lsASM = script.toASM();
    const asmOpcodes: string[] = lsASM.split(' ');

    if (asmTemplateOpcodes.length > asmOpcodes.length) {
      throw new Error(`the raw script cannot match the ASM template of contract ${contractName}`);
    }

    for (let index = 0; index < asmTemplateOpcodes.length; index++) {
      const element = asmTemplateOpcodes[index];
      if (!element.startsWith('$')) {
        let tmp = asmOpcodes[index];
        if (tmp === '0') tmp = 'OP_0';
        if (element !== tmp) {
          throw new Error(`the raw script cannot match the ASM template of contract ${contractName}`);
        }
      }
    }


    let dataPart = undefined;

    if (asmTemplateOpcodes.length < asmOpcodes.length) {
      const opcode = asmOpcodes[asmTemplateOpcodes.length];
      if (opcode !== 'OP_RETURN') {
        throw new Error(`the raw script cannot match the ASM template of contract ${contractName}`);
      }

      // If it is a stateful contract with OP_RETURN, only script before OP_RETURN is used to make lsASM consistent with the output of the compiler
      lsASM = asmOpcodes.slice(0, asmTemplateOpcodes.length).join(' ');
      dataPart = asmOpcodes.slice(asmTemplateOpcodes.length + 1).join(' ');
    }

    asmTemplateOpcodes.forEach((opcode, index) => {

      if (opcode.startsWith('$')) {
        contract.asmTemplateArgs.set(opcode, asmOpcodes[index]);
      } else if (bsv.Script.fromASM(opcode).toHex() !== bsv.Script.fromASM(asmOpcodes[index]).toHex()) {
        throw new Error(`the raw script cannot match the ASM template of contract ${contractName}`);
      }
    });

    const ctorArgs: Arguments = cParams.map(param => deserializeArgfromASM(contract.resolver, Object.assign(param, {
      value: undefined
    }), contract.asmTemplateArgs));


    if (AbstractContract.isStateful(contract)) {

      const scriptHex = script.toHex();
      const metaScript = script.toHex().substr(scriptHex.length - 10, 10);
      const version = bin2num(metaScript.substr(metaScript.length - 2, 2)) as number;
      const stateLen = bin2num(metaScript.substr(0, 8)) as number;
      const opReturnHex = scriptHex.substr(scriptHex.length - 12 - stateLen * 2, 2);

      if (opReturnHex != num2bin(bsv.Opcode.OP_RETURN, 1)) {
        throw new Error('parse state fail, no OP_RETURN before state hex');
      }

      switch (version) {
        case 0:
          {
            contract.statePropsArgs = this.parseStateHex(contract, scriptHex);
          }
          break;
      }

      lsASM = buildContractCodeASM(contract.asmTemplateArgs, asmTemplate);
    } else if (dataPart) {
      contract.setDataPart(dataPart);
    }

    return new FunctionCall('constructor', { contract, lockingScriptASM: lsASM, args: ctorArgs });

  }

  encodePubFunctionCall(contract: AbstractContract, name: string, args: SupportedParamType[]): FunctionCall {
    const contractName = Object.getPrototypeOf(contract).constructor.contractName as string;
    for (const entity of this.abi) {
      if (entity.name === name) {
        this.checkArgs(contractName, name, entity.params, ...args);
        let asm = this.encodeParams(args, entity.params.map(p => ({
          name: p.name,
          type: this.resolver.resolverType(p.type)
        })));
        if (this.abi.length > 2 && entity.index !== undefined) {
          // selector when there are multiple public functions
          const pubFuncIndex = entity.index;
          asm += ` ${int2Asm(pubFuncIndex.toString())}`;
        }
        return new FunctionCall(name, {
          contract, unlockingScriptASM: asm, args: entity.params.map((param, index) => ({
            name: param.name,
            type: param.type,
            value: args[index]
          }))
        });
      }
    }

    throw new Error(`no public function named '${name}' found in contract '${contractName}'`);
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
    const contractName = Object.getPrototypeOf(contract).constructor.contractName;
    if (!entity) {
      throw new Error(`no public function named '${name}' found in contract '${contractName}'`);
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
      throw new Error(`the raw unlockingScript cannot match the arguments of public function ${name} of contract ${contractName}`);
    }

    const asmTemplateArgs: Map<string, string> = new Map();

    flatternArgs.forEach((farg, index) => {

      asmTemplateArgs.set(`$${farg.name}`, asmOpcodes[index]);

    });


    const args: Arguments = cParams.map(param => deserializeArgfromASM(contract.resolver, Object.assign(param, {
      value: undefined
    }), asmTemplateArgs));

    return new FunctionCall(name, { contract, unlockingScriptASM: usASM, args: args });

  }

  encodeParams(args: SupportedParamType[], paramsEntitys: ParamEntity[]): string {
    return args.map((arg, i) => this.encodeParam(arg, paramsEntitys[i])).join(' ');
  }

  encodeParamArray(args: SupportedParamType[], arrayParam: ParamEntity): string {
    return flatternArray(args, arrayParam.name, arrayParam.type).map(arg => {
      return this.encodeParam(arg.value, { name: arg.name, type: this.resolver.resolverType(arg.type) });
    }).join(' ');
  }


  encodeParam(arg: SupportedParamType, paramEntity: ParamEntity): string {

    if (isArrayType(paramEntity.type)) {
      return this.encodeParamArray(arg as SupportedParamType[], paramEntity);
    }

    if (arg instanceof ScryptType) {
      return arg.toASM();
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

    return (arg as ScryptType).toASM();
  }

}