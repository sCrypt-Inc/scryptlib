import { oc } from 'ts-optchain';
import { literal2Asm, int2Asm, bool2Asm, bsv } from "./utils";
import { AbstractContract, TxContext } from './contract';

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

export interface AbiJSON {
  compilerVersion: string;
  contract: string;
  interfaces: Array<ABIEntity>;
  asm: string;
}

export type AsmString = string;

export type SupportedParamType = string | boolean | number;

export class FunctionCall {

  readonly contract: AbstractContract;

  readonly lockingScript?: string;

  readonly unlockingScript?: string;

  constructor(
    public methodName: string,
    public params: SupportedParamType[],
    binding: {
      contract: AbstractContract;
      lockingScript?: AsmString;
      unlockingScript?: AsmString;
    }
  ) {

    if (binding.lockingScript === undefined && binding.unlockingScript === undefined) {
      throw new Error(`param binding.lockingScript & binding.unlockingScript cannot both be empty`);
    }

    this.contract = binding.contract;
    this.lockingScript = binding.lockingScript;
    this.unlockingScript = binding.unlockingScript;
  }

  toASM(): string {
    if (this.lockingScript) {
      return this.lockingScript;
    } else {
      return this.unlockingScript;
    }
  }

  toString(): string {
    return this.toHex();
  }

  toScript(): any {
    return bsv.Script.fromASM(this.toASM());
  }

  toHex(): string {
    return this.toScript().toHex();
  }

  verify(txContext?: TxContext): boolean {
    if (this.unlockingScript) {
      return this.contract.verify(this.unlockingScript, txContext);
    }

    throw new Error("verification failed, missing unlockingScript");
  }

}

export class ABICoder {

  constructor(public interfaces: ABIEntity[]) { }

  encodeConstructorCall(contract: AbstractContract, asmTemplate: string, ...args: SupportedParamType[]): FunctionCall {

    const constructorABI = this.interfaces.filter(entity => entity.type === ABIEntityType.CONSTRUCTOR)[0];
    const cParams = oc(constructorABI).params([]);

    if (args.length !== cParams.length) {
      throw new Error(`wrong arguments length for #constructor, expected ${cParams.length} but got ${args.length}`);
    }

    let lockingScript = asmTemplate;

    cParams.forEach((param, index) => {
      if (!asmTemplate.includes(`$${param.name}`)) {
        throw new Error(`abi constructor params mismatch with args provided: missing ${param.name} in asm tempalte`);
      }
      lockingScript = lockingScript.replace(`$${param.name}`, this.encodeParam(args[index], param.type));
    });

    if (contract.opReturn !== undefined) {
      lockingScript += ` OP_RETURN ${contract.opReturn}`;
    }

    return new FunctionCall('constructor', args, { contract, lockingScript });
  }

  encodePubFunctionCall(contract: AbstractContract, name: string, args: SupportedParamType[]): FunctionCall {

    for (const entity of this.interfaces) {
      if (entity.name === name) {
        if (entity.params.length !== args.length) {
          throw new Error(`wrong arguments length for #${name}, expected ${entity.params.length} but got ${args.length}`);
        }
        let asm = this.encodeParams(args, entity.params.map(p => p.type));
        if (this.interfaces.length > 2 && entity.index) {
          const pubFuncIndex = entity.index + 1;
          asm += ` ${int2Asm(pubFuncIndex.toString())}`;
        }
        return new FunctionCall(name, args, { contract, unlockingScript: asm });
      }
    }

    throw new Error(`no function named '${name}' found in abi`);
  }

  encodeParams(args: SupportedParamType[], scryptTypes: string[]): AsmString {
    if (args.length !== scryptTypes.length) {
      throw new Error(`wrong arguments length, expected ${scryptTypes.length} but got ${args.length}`);
    }
    return args.map((arg, i) => {
      return this.encodeParam(arg, scryptTypes[i]);
    }).join(' ');
  }

  encodeParam(arg: SupportedParamType, scryptType: string): AsmString {
    const argType = typeof arg;

    if (scryptType === 'bool') {
      if (argType !== "boolean") {
        throw new Error(`wrong argument type, expected boolean but got ${argType}`);
      }
      return bool2Asm(arg.toString());
    }

    if (scryptType === 'int') {
      if (argType !== 'number') {
        throw new Error(`wrong argument type, expected number but got ${argType}`);
      }
      return int2Asm(arg.toString());
    }

    if (argType !== 'string') {
      throw new Error(`wrong argument type, expected string but got ${argType}`);
    }

    return literal2Asm(`b'${arg.toString()}'`)[0];
  }

}