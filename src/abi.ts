import { oc } from 'ts-optchain';
import { int2Asm, bsv } from "./utils";
import { AbstractContract, TxContext, VerifyResult, AsmVarValues } from './contract';
import { ScryptType, Bool, Int } from './scryptTypes';

export enum ABIEntityType {
  FUNCTION = 'function',
  CONSTRUCTOR = 'constructor'
}

export interface ABIEntity {
  type: ABIEntityType;
  name?: string;
  params: Array<{ name: string, type: string }>;
  index?: number;
}

export interface Script {
  toASM(): string;
  toHex(): string;
}

export type SupportedParamType = ScryptType | boolean | number | BigInt;

export class FunctionCall {

  readonly contract: AbstractContract;

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

  verify(txContext?: TxContext): VerifyResult {
    if (this.unlockingScript) {
      return this.contract.run_verify(this.unlockingScript.toASM(), txContext);
    }

    return {
      success: false,
      error: "verification failed, missing unlockingScript"
    };
  }

}

export class ABICoder {

  constructor(public abi: ABIEntity[]) { }

  encodeConstructorCall(contract: AbstractContract, asmTemplate: string, ...args: SupportedParamType[]): FunctionCall {

    const constructorABI = this.abi.filter(entity => entity.type === ABIEntityType.CONSTRUCTOR)[0];
    const cParams = oc(constructorABI).params([]);

    if (args.length !== cParams.length) {
      throw new Error(`wrong arguments length for #constructor, expected ${cParams.length} but got ${args.length}`);
    }

    let lsASM = asmTemplate;

    cParams.forEach((param, index) => {
      if (!asmTemplate.includes(`$${param.name}`)) {
        throw new Error(`abi constructor params mismatch with args provided: missing ${param.name} in asm tempalte`);
      }
      // '$' needs doulbe '\\' to escape
      const re = new RegExp(`\\$${param.name}`, 'g');
      lsASM = lsASM.replace(re, this.encodeParam(args[index], param.type));
    });

    return new FunctionCall('constructor', args, { contract, lockingScriptASM: lsASM });
  }

  encodePubFunctionCall(contract: AbstractContract, name: string, args: SupportedParamType[]): FunctionCall {

    for (const entity of this.abi) {
      if (entity.name === name) {
        if (entity.params.length !== args.length) {
          throw new Error(`wrong arguments length for #${name}, expected ${entity.params.length} but got ${args.length}`);
        }
        let asm = this.encodeParams(args, entity.params.map(p => p.type));
        if (this.abi.length > 2 && entity.index !== undefined) {
          const pubFuncIndex = entity.index;
          asm += ` ${int2Asm(pubFuncIndex.toString())}`;
        }
        return new FunctionCall(name, args, { contract, unlockingScriptASM: asm });
      }
    }

    throw new Error(`no function named '${name}' found in abi`);
  }

  encodeParams(args: SupportedParamType[], scryptTypeNames: string[]): string {
    if (args.length !== scryptTypeNames.length) {
      throw new Error(`wrong arguments length, expected ${scryptTypeNames.length} but got ${args.length}`);
    }
    return args.map((arg, i) => {
      return this.encodeParam(arg, scryptTypeNames[i]);
    }).join(' ');
  }

  encodeParam(arg: SupportedParamType, scryptTypeName: string): string {
    const typeofArg = typeof arg;

    if (typeofArg === 'boolean') {
      arg = new Bool(arg as boolean);
    }

    if (typeofArg === 'number') {
      arg = new Int(arg as number);
    }

    if (typeofArg === 'bigint') {
      arg = new Int(arg as BigInt);
    }

    let ctorName = arg.constructor.name;
    if (ctorName === 'Bytes') {
      // "Bytes" is alias for "byte[]"
      ctorName = 'byte[]';
    }
    if (ctorName.toLowerCase() !== scryptTypeName.toLowerCase()) {
      throw new Error(`wrong argument type, expected ${scryptTypeName} but got ${ctorName}`);
    }

    return (arg as ScryptType).toASM();
  }

}