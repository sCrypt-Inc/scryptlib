import { int2Asm, bsv, arrayTypeAndSize, genLaunchConfigFile, getStructNameByType, isArrayType, isStructType, checkArray, flatternArray, typeOfArg, flatternStruct, createStruct, createArray, asm2ScryptType } from './utils';
import { AbstractContract, TxContext, VerifyResult, AsmVarValues } from './contract';
import { ScryptType, Bool, Int, SingletonParamType, SupportedParamType, Struct, TypeResolver } from './scryptTypes';
import { ABIEntityType, ABIEntity, ParamEntity } from './compilerWrapper';
import { buildContractASM } from './internal';

export interface Script {
  toASM(): string;
  toHex(): string;
}

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
    return this._unlockingScriptAsm === undefined ? undefined : bsv.Script.fromASM(this._unlockingScriptAsm);
  }

  get lockingScript(): Script | undefined {
    return this._lockingScriptAsm === undefined ? undefined : bsv.Script.fromASM(this._lockingScriptAsm);
  }

  init(asmVarValues: AsmVarValues): void {
    for (const key in asmVarValues) {
      const val = asmVarValues[key];
      const re = new RegExp(`\\$${key}`, 'g');
      this._lockingScriptAsm = this._lockingScriptAsm.replace(re, val);
    }
  }

  constructor(
    public methodName: string,
    public params: SupportedParamType[],
    binding: {
      contract: AbstractContract;
      lockingScriptASM?: string;
      unlockingScriptASM?: string;
    }
  ) {

    if (binding.lockingScriptASM === undefined && binding.unlockingScriptASM === undefined) {
      throw new Error('param binding.lockingScriptASM & binding.unlockingScriptASM cannot both be empty');
    }

    this.contract = binding.contract;


    this.args = Object.getPrototypeOf(this.contract).constructor.abi.filter((entity: ABIEntity) => {
      if ('constructor' === methodName) {
        return entity.type === 'constructor';
      }
      return entity.name === methodName;
    }).map((entity: ABIEntity) => {
      return entity.params.map((param, index) => {
        return {
          name: param.name,
          type: param.type,
          value: params[index]
        };
      });
    }).flat(1);

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



  genLaunchConfigFile(txContext?: TxContext): FileUri {

    const constructorArgs: SupportedParamType[] = this.contract.scriptedConstructor.params;

    const pubFuncArgs: SupportedParamType[] = this.params;
    const pubFunc: string = this.methodName;
    const name = `Debug ${Object.getPrototypeOf(this.contract).constructor.contractName}`;
    const program = `${Object.getPrototypeOf(this.contract).constructor.file}`;

    const asmArgs: AsmVarValues = this.contract.asmArgs || {};
    const dataPart: string = this.contract.dataPart ? this.contract.dataPart.toASM() : undefined;
    const txCtx: TxContext = Object.assign({}, this.contract.txContext || {}, txContext || {}, { opReturn: dataPart });

    return genLaunchConfigFile(constructorArgs, pubFuncArgs, pubFunc, name, program, txCtx, asmArgs);
  }

  verify(txContext?: TxContext): VerifyResult {
    if (this.unlockingScript) {
      const result = this.contract.run_verify(this.unlockingScript.toASM(), txContext, this.args);

      if (!result.success) {
        const debugUrl = this.genLaunchConfigFile(txContext);
        if (debugUrl) {
          result.error = result.error + `\t[Launch Debugger](${debugUrl.replace(/file:/i, 'scryptlaunch:')})\n`;
        }
      }
      return result;
    }

    return {
      success: false,
      error: 'verification failed, missing unlockingScript'
    };
  }

}

export class ABICoder {

  constructor(public abi: ABIEntity[], public finalTypeResolver: TypeResolver) { }


  encodeConstructorCall(contract: AbstractContract, asmTemplate: string, ...args: SupportedParamType[]): FunctionCall {

    const constructorABI = this.abi.filter(entity => entity.type === ABIEntityType.CONSTRUCTOR)[0];
    const cParams = constructorABI?.params || [];

    if (args.length !== cParams.length) {
      throw new Error(`wrong number of arguments for #constructor, expected ${cParams.length} but got ${args.length}`);
    }

    // handle array type
    const cParams_: Array<ParamEntity> = [];
    const args_: SupportedParamType[] = [];
    cParams.map(p => ({
      name: p.name,
      type: this.finalTypeResolver(p.type),
      state: p.state
    })).forEach((param, index) => {
      const arg = args[index];
      if (isArrayType(param.type)) {
        const [elemTypeName, arraySizes] = arrayTypeAndSize(param.type);

        if (Array.isArray(arg)) {
          if (checkArray(arg, [elemTypeName, arraySizes])) {
            // flattern array
            flatternArray(arg, param.name, param.type).forEach((e) => {
              cParams_.push({ name: e.name, type: this.finalTypeResolver(e.type), state: param.state });
              args_.push(e.value);
            });
          } else {
            throw new Error(`constructor ${index}-th parameter should be ${param.type}`);
          }
        } else {
          throw new Error(`constructor ${index}-th parameter should be ${param.type}`);
        }
      } else if (isStructType(param.type)) {

        const argS = arg as Struct;

        if (param.type != argS.finalType) {
          throw new Error(`expect struct ${getStructNameByType(param.type)} but got struct ${argS.type}`);
        }

        flatternStruct(argS, param.name).forEach(v => {
          cParams_.push({ name: `${v.name}`, type: this.finalTypeResolver(v.type), state: param.state });
          args_.push(v.value);
        });
      }
      else {
        cParams_.push(param);
        args_.push(arg);
      }
    });



    cParams_.forEach((param, index) => {
      if (!asmTemplate.includes(`$${param.name}`)) {
        throw new Error(`abi constructor params mismatch with args provided: missing ${param.name} in ASM tempalte`);
      }

      contract.asmTemplateArgs.set(`$${param.name}`, this.encodeParam(args_[index], param));

    });


    return new FunctionCall('constructor', args, { contract, lockingScriptASM: buildContractASM(contract.asmTemplateArgs, asmTemplate) });
  }


  encodeState(contract: AbstractContract, param: ParamEntity, value: SupportedParamType): void {

    // handle array type
    const cParams_: Array<ParamEntity> = [];
    const args_: SupportedParamType[] = [];

    param.type = this.finalTypeResolver(param.type);

    if (isArrayType(param.type)) {
      const [elemTypeName, arraySizes] = arrayTypeAndSize(param.type);

      if (Array.isArray(value)) {
        if (checkArray(value, [elemTypeName, arraySizes])) {
          // flattern array
          flatternArray(value, param.name, param.type).forEach((e) => {
            cParams_.push({ name: e.name, type: this.finalTypeResolver(e.type), state: param.state });
            args_.push(e.value);
          });
        } else {
          throw new Error(`state ${param.name} should be ${param.type}`);
        }
      } else {
        throw new Error(`state ${param.name} should be ${param.type}`);
      }
    } else if (isStructType(param.type)) {

      const argS = value as Struct;

      if (param.type != argS.finalType) {
        throw new Error(`state ${param.name} expect struct ${getStructNameByType(param.type)} but got struct ${argS.type}`);
      }

      flatternStruct(argS, param.name).forEach(v => {
        cParams_.push({ name: `${v.name}`, type: this.finalTypeResolver(v.type), state: param.state });
        args_.push(v.value);
      });
    }
    else {
      cParams_.push(param);
      args_.push(value);
    }

    cParams_.forEach((param, index) => {
      if (!contract.asmTemplateArgs.has(`$${param.name}`)) {
        throw new Error(`abi constructor params mismatch with args provided: missing ${param.name} in ASM tempalte`);
      }

      contract.asmTemplateArgs.set(`$${param.name}`, this.encodeParam(args_[index], param));

    });
  }

  encodeConstructorCallFromASM(contract: AbstractContract, asmTemplate: string, lsASM: string): FunctionCall {
    const constructorABI = this.abi.filter(entity => entity.type === ABIEntityType.CONSTRUCTOR)[0];
    const cParams = constructorABI?.params || [];
    const contractName = Object.getPrototypeOf(contract).constructor.contractName;
    const opcodesMap = new Map<string, string>();

    const asmTemplateOpcodes = asmTemplate.split(' ');
    const asmOpcodes = lsASM.split(' ');


    if (asmTemplateOpcodes.length > asmOpcodes.length) {
      throw new Error(`the raw script cannot match the asm template of contract ${contractName}`);
    }

    asmTemplateOpcodes.forEach((opcode, index) => {

      if (opcode.startsWith('$')) {
        opcodesMap.set(opcode, asmOpcodes[index]);
      } else if (bsv.Script.fromASM(opcode).toHex() !== bsv.Script.fromASM(asmOpcodes[index]).toHex()) {
        throw new Error(`the raw script cannot match the asm template of contract ${contractName}`);
      }
    });

    if (asmTemplateOpcodes.length < asmOpcodes.length) {
      const opcode = asmOpcodes[asmTemplateOpcodes.length];
      if (opcode !== 'OP_RETURN') {
        throw new Error(`the raw script cannot match the asm template of contract ${contractName}`);
      }
    }

    const args: SupportedParamType[] = [];
    cParams.map(p => ({
      name: p.name,
      type: this.finalTypeResolver(p.type)
    })).forEach((param) => {

      if (isStructType(param.type)) {

        const stclass = contract.getTypeClassByType(getStructNameByType(param.type));

        args.push(createStruct(contract, stclass as typeof Struct, param.name, opcodesMap, this.finalTypeResolver));
      } else if (isArrayType(param.type)) {

        args.push(createArray(contract, param.type, param.name, opcodesMap, this.finalTypeResolver));

      } else {
        args.push(asm2ScryptType(param.type, opcodesMap.get(`$${param.name}`)));
      }

    });


    return new FunctionCall('constructor', args, { contract, lockingScriptASM: lsASM });
  }

  encodePubFunctionCall(contract: AbstractContract, name: string, args: SupportedParamType[]): FunctionCall {

    for (const entity of this.abi) {
      if (entity.name === name) {
        if (entity.params.length !== args.length) {
          throw new Error(`wrong number of arguments for #${name}, expected ${entity.params.length} but got ${args.length}`);
        }
        let asm = this.encodeParams(args, entity.params.map(p => ({
          name: p.name,
          type: this.finalTypeResolver(p.type),
          state: p.state
        })));
        if (this.abi.length > 2 && entity.index !== undefined) {
          // selector when there are multiple public functions
          const pubFuncIndex = entity.index;
          asm += ` ${int2Asm(pubFuncIndex.toString())}`;
        }
        return new FunctionCall(name, args, { contract, unlockingScriptASM: asm });
      }
    }

    throw new Error(`no function named '${name}' found in abi`);
  }

  encodeParams(args: SupportedParamType[], paramsEntitys: ParamEntity[]): string {
    return args.map((arg, i) => this.encodeParam(arg, paramsEntitys[i])).join(' ');
  }

  encodeParamArray(args: SingletonParamType[], arrayParam: ParamEntity): string {
    if (args.length === 0) {
      throw new Error('Empty array not allowed');
    }

    const t = typeof args[0];

    if (!args.every(arg => typeof arg === t)) {
      throw new Error('Array arguments are not of the same type');
    }

    const [elemTypeName, arraySizes] = arrayTypeAndSize(arrayParam.type);
    if (checkArray(args, [elemTypeName, arraySizes])) {
      return flatternArray(args, arrayParam.name, arrayParam.type).map(arg => {
        return this.encodeParam(arg.value, { name: arg.name, type: this.finalTypeResolver(arg.type), state: arrayParam.state });
      }).join(' ');
    } else {
      throw new Error(`checkArray ${arrayParam.type} fail`);
    }
  }


  encodeParam(arg: SupportedParamType, paramEntity: ParamEntity): string {

    if (isArrayType(paramEntity.type)) {
      if (Array.isArray(arg)) {
        return this.encodeParamArray(arg, paramEntity);
      } else {
        const scryptType = typeOfArg(arg);
        throw new Error(`expect param ${paramEntity.name} as ${paramEntity.type} but got ${scryptType}`);
      }
    }

    if (isStructType(paramEntity.type)) {

      if (Struct.isStruct(arg)) {
        const argS = arg as Struct;
        if (paramEntity.type != argS.finalType) {
          throw new Error(`expect struct ${getStructNameByType(paramEntity.type)} but got struct ${argS.type}`);
        }
      } else {
        const scryptType = (arg as ScryptType).type;
        throw new Error(`expect param ${paramEntity.name} as struct ${getStructNameByType(paramEntity.type)} but got ${scryptType}`);
      }
    }


    const scryptType = typeOfArg(arg);
    if (scryptType != paramEntity.type) {
      throw new Error(`wrong argument type, expected ${paramEntity.type} but got ${scryptType}`);
    }

    const typeofArg = typeof arg;

    if (typeofArg === 'boolean') {
      arg = new Bool(arg as boolean);
    }

    if (typeofArg === 'number') {
      arg = new Int(arg as number);
    }

    if (typeofArg === 'bigint') {
      arg = new Int(arg as bigint);
    }

    if (typeof arg === 'string') {
      arg = new Int(arg as string);
    }

    return (arg as ScryptType).toASM();
  }

}