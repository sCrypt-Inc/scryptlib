import { ABICoder, ABIEntity, ScriptedMethodCall, SupportedParamType } from "./scryptjs-abi";
import { compile } from './scryptjs-compiler';

export class AbstractContract {

  public static abi: ABIEntity[];
  public static asmTemplate: string;
  public static abiCoder: ABICoder;

  scriptedConstructor: ScriptedMethodCall;

  toHex(): string {
    return this.scriptedConstructor.toHex();
  }

  toASM(): string {
    return this.scriptedConstructor.toASM();
  }

  toScript(): any {
    return this.scriptedConstructor.toScript();
  }

};

export function getContractClass(abi: ABIEntity[], asmTemplate: string): any {

  const ContractClass = class Contract extends AbstractContract {
    constructor(...ctorParams: SupportedParamType[]) {
      super();
      this.scriptedConstructor = Contract.abiCoder.encodeConstructor(Contract.asmTemplate, ...ctorParams);
    }
  };

  ContractClass.abi = abi;
  ContractClass.asmTemplate = asmTemplate;
  ContractClass.abiCoder = new ABICoder(abi);

  ContractClass.abi.forEach(entity => {
    ContractClass.prototype[entity.name] = function (...args: SupportedParamType[]): ScriptedMethodCall {
      return ContractClass.abiCoder.encodeFunctionCall(entity.name, args);
    };
  });

  return ContractClass as any;
}