import { ABICoder, ABIEntity, ScriptedMethodCall, SupportedParamType } from "./scryptjs-abi";
import { AbiJSON } from './scryptjs-compiler';
import { bsv, FLAGS, deserialize } from "./scryptjs-utils";

export interface TxContext {
  tx?: any;
  hex?: string;
  inputSatoshis?: number;
  inputIndex?: number;
  sighashFlags?: number;
}

export class AbstractContract {

  public static contracName: string;
  public static abi: ABIEntity[];
  public static asm: string;
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

  private _txContext?: TxContext;

  set txContext(txContext: TxContext) {
    this._txContext = txContext;
  }

  get txContext() {
    return this._txContext;
  }

  verify(unlockingScript: string, inputSatoshis: number, txContext?: TxContext): boolean {
    txContext = Object.assign({}, this._txContext || {}, txContext || {});

    const us = bsv.Script.fromASM(unlockingScript);
    const ls = this.toScript();
    const tx = txContext.tx || (txContext.hex ? deserialize(txContext.hex) : null);
    const inputIndex = txContext.inputIndex || 0;
    const flags = txContext.sighashFlags || FLAGS;

    const si = bsv.Script.Interpreter();
    return si.verify(us, ls, tx, inputIndex, flags, new bsv.crypto.BN(inputSatoshis));
  }

  private _opReturn?: string;

  set opReturn(opReturnInHex: string) {
    this.opReturn = opReturnInHex.trim();
  }

  get opReturn() {
    return this._opReturn;
  }
}

export function getContractClass(abiJSON: AbiJSON): any {

  const ContractClass = class Contract extends AbstractContract {
    constructor(...ctorParams: SupportedParamType[]) {
      super();
      this.scriptedConstructor = Contract.abiCoder.encodeConstructor(this, Contract.asm, ...ctorParams);
    }
  };

  ContractClass.contracName = abiJSON.contract;
  ContractClass.abi = abiJSON.abi;
  ContractClass.asm = abiJSON.asm;
  ContractClass.abiCoder = new ABICoder(abiJSON.abi);

  ContractClass.abi.forEach(entity => {
    ContractClass.prototype[entity.name] = function (...args: SupportedParamType[]): ScriptedMethodCall {
      return ContractClass.abiCoder.encodeFunctionCall(this, entity.name, args);
    };
  });

  return ContractClass as any;
}