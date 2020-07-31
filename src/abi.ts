import { oc } from 'ts-optchain';
import { int2Asm, bsv } from "./utils";
import { AbstractContract, TxContext } from './contract';
import { ScryptType, Bool, Int } from './scryptTypes';

export enum ABIEntityType {
  FUNCTION = 'function',
  CONSTRUCTOR = 'constructor'
}

export interface ABIEntity {
  type: ABIEntityType;
  name: string;
  params: Array<{ name: string, type: string }>;
  index?: number;
}

export interface Script {
  toASM(): string;
  toHex(): string;
}

export type SupportedParamType = ScryptType | boolean | number;

export class FunctionCall {

  readonly contract: AbstractContract;

  readonly lockingScript?: Script;

  readonly unlockingScript?: Script;

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
      this.lockingScript = bsv.Script.fromASM(binding.lockingScriptASM);
    }

    if (binding.unlockingScriptASM) {
      this.unlockingScript = bsv.Script.fromASM(binding.unlockingScriptASM);
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

  verify(txContext?: TxContext): boolean {
    if (this.unlockingScript) {
      return this.contract.verify(this.unlockingScript.toASM(), txContext);
    }

    throw new Error("verification failed, missing unlockingScript");
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
      lsASM = lsASM.replace(`$${param.name}`, this.encodeParam(args[index], param.type));
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
          const pubFuncIndex = entity.index + 1;
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

    if (arg.constructor.name.toLowerCase() !== scryptTypeName.toLowerCase()) {
      throw new Error(`wrong argument type, expected ${scryptTypeName} but got ${arg.constructor.name}`);
    }

    return (arg as ScryptType).toASM();
  }

}