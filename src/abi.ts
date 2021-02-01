import { oc } from 'ts-optchain';
import { int2Asm, bsv, findStructByType, path2uri, isEmpty, arrayTypeAndSize, findStructByName, genLaunchConfigFile} from "./utils";
import { AbstractContract, TxContext, VerifyResult, AsmVarValues } from './contract';
import { ScryptType, Bool, Int , SingletonParamType, SupportedParamType, Struct} from './scryptTypes';
import { ABIEntityType, ABIEntity, StructEntity} from './compilerWrapper';
import { mkdtempSync, writeFileSync } from 'fs';
import { join, sep} from 'path';
import { tmpdir } from 'os';

export interface Script {
  toASM(): string;
  toHex(): string;
}

export type FileUri = string;

/**
     * Configuration for a debug session.
     */
export interface DebugConfiguration {
  type: "scrypt";
  request: "launch";
  internalConsoleOptions: "openOnSessionStart",
  name: string;
  program: string;
  constructorArgs: SupportedParamType[];
  pubFunc: string;
  pubFuncArgs: SupportedParamType[];
  asmArgs?: AsmVarValues;
  txContext?: any;
}

export interface DebugLaunch {
  version: "0.2.0";
  configurations: DebugConfiguration[];
}

function escapeRegExp(stringToGoIntoTheRegex) {
  return stringToGoIntoTheRegex.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
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
      throw new Error(`param binding.lockingScriptASM & binding.unlockingScriptASM cannot both be empty`);
    }

    this.contract = binding.contract;


    this.args =  Object.getPrototypeOf(this.contract).constructor.abi.filter((entity:ABIEntity)  => {
      if('constructor' === methodName) {
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
    const dataPart: string = this.contract.dataPart ? this.contract.dataPart.toASM() : '';
    const txCtx: TxContext = Object.assign({}, this.contract.txContext || {}, txContext || {}, {opReturn: dataPart});

    return genLaunchConfigFile(constructorArgs, pubFuncArgs, pubFunc, name, program, txCtx, asmArgs);
  }
  
  verify(txContext?: TxContext): VerifyResult {
    if (this.unlockingScript) {
      const result = this.contract.run_verify(this.unlockingScript.toASM(), txContext);
      
      if(!result.success) {
        const debugUrl = this.genLaunchConfigFile(txContext);
        if(debugUrl) {
          result.error = result.error + `\t[Launch Debugger](${debugUrl.replace(/file:/i, "scryptlaunch:")})\n`;
        }
      }
      return result;
    }

    return {
      success: false,
      error: "verification failed, missing unlockingScript"
    };
  }

}

export class ABICoder {

  constructor(public abi: ABIEntity[], public structs: StructEntity[]) { }


  encodeConstructorCall(contract: AbstractContract, asmTemplate: string, ...args: SupportedParamType[]): FunctionCall {

    const constructorABI = this.abi.filter(entity => entity.type === ABIEntityType.CONSTRUCTOR)[0];
    const cParams = oc(constructorABI).params([]);

    if (args.length !== cParams.length) {
      throw new Error(`wrong number of arguments for #constructor, expected ${cParams.length} but got ${args.length}`);
    }

    // handle array type
    const cParams_: Array<{ name: string, type: string }> = [];
    const args_: SupportedParamType[] = [];
    cParams.forEach((param, index) =>{
      const arg = args[index];
      if (Array.isArray(arg)) {
        const [elemTypeName, arraySize] = arrayTypeAndSize(param.type);
        if (arraySize !== arg.length) {
          throw new Error(`Array arguments wrong size for '${param.name}' in constructor, expected [${arraySize}] but got [${arg.length}]`);
        }
        // flattern array
        arg.forEach((e, idx) => {
          cParams_.push({ name:`${param.name}[${idx}]`, type: elemTypeName});
          args_.push(e);
        });
      } else if(Struct.isStruct(arg)) {

        const s = findStructByType(param.type, this.structs);
        const argS = arg as Struct;
        if(s && s.name != argS.structName ) {
          throw new Error(`expect struct ${s.name} but got struct ${argS.structName}`);
        } else if(s && s.name == argS.structName) {
          s.params.forEach(e => {
            cParams_.push({ name:`${param.name}.${e.name}`, type: e.type});
            args_.push((arg as Struct).value[e.name]);
          });

        } else {
          throw new Error(`constructor does not accept struct ${argS.structName} at ${index}-th parameter`);
        }
      }
      else {
        cParams_.push(param);
        args_.push(arg);
      }
    });

    let lsASM = asmTemplate;

    cParams_.forEach((param, index) => {
      if (!asmTemplate.includes(`$${param.name}`)) {
        throw new Error(`abi constructor params mismatch with args provided: missing ${param.name} in ASM tempalte`);
      }
      const re = new RegExp(escapeRegExp(`$${param.name}`), 'g');
      lsASM = lsASM.replace(re, this.encodeParam(args_[index], param.type));
    });

    return new FunctionCall('constructor', args, { contract, lockingScriptASM: lsASM });
  }

  encodeConstructorCallFromASM(contract: AbstractContract, lsASM: string): FunctionCall {
    return new FunctionCall('constructor', [], { contract, lockingScriptASM: lsASM });
  }

  encodePubFunctionCall(contract: AbstractContract, name: string, args: SupportedParamType[]): FunctionCall {

    for (const entity of this.abi) {
      if (entity.name === name) {
        if (entity.params.length !== args.length) {
          throw new Error(`wrong number of arguments for #${name}, expected ${entity.params.length} but got ${args.length}`);
        }
        let asm = this.encodeParams(args, entity.params.map(p => p.type));
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

  encodeParams(args: SupportedParamType[], scryptTypeNames: string[]): string {
    return args.map((arg, i) => this.encodeParam(arg, scryptTypeNames[i])).join(' ');
  }

  encodeParamArray(args: SingletonParamType[], arrayTypeName: string): string {
      if (args.length === 0) {
        throw new Error('Empty array not allowed');
      }

      const t = typeof args[0];
      if (!args.every(arg => typeof arg === t)) {
        throw new Error('Array arguments are not of the same type');
      }

      const [elemTypeName, arraySize] = arrayTypeAndSize(arrayTypeName);

      if (arraySize !== args.length) {
        throw new Error(`Array arguments wrong size, expected [${arraySize}] but got [${args.length}]`);
      }

      return args.map(arg => this.encodeParam(arg, elemTypeName)).join(' ');
    }


  encodeParam(arg: SupportedParamType, scryptTypeName: string): string {
    if (Array.isArray(arg)) {
      return this.encodeParamArray(arg, scryptTypeName);
    }

    if (Struct.isStruct(arg)) {
      const s = findStructByType(scryptTypeName, this.structs);
      const argS = arg as Struct;
      if(s && s.name != argS.structName ) {

        throw new Error(`expect struct ${s.name} but got struct ${argS.structName}`);
      } 
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

    const scryptType = (arg as ScryptType).type;
    if (scryptType !== scryptTypeName) {
      throw new Error(`wrong argument type, expected ${scryptTypeName} but got ${scryptType}`);
    }

    return (arg as ScryptType).toASM();
  }

}