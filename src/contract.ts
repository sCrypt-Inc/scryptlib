import { ABICoder, ABIEntity, FunctionCall, SupportedParamType, AbiJSON } from "./abi";
import { bsv, DEFAULT_FLAGS, deserialize } from "./utils";

export interface TxContext {
  inputSatoshis: number;
  tx?: any;
  hex?: string;
  inputIndex?: number;
  sighashFlags?: number;
}

export class AbstractContract {

  public static contracName: string;
  public static interfaces: ABIEntity[];
  public static asm: string;
  public static abiCoder: ABICoder;

  scriptedConstructor: FunctionCall;

  toHex(): string {
    return this.scriptedConstructor.toHex();
  }

  toASM(): string {
    return this.scriptedConstructor.toASM();
  }

  toScript(): any {
    return this.scriptedConstructor.toScript();
  }

  get lockingScript(): string {
    return this.toASM();
  }

  private _txContext?: TxContext;

  set txContext(txContext: TxContext) {
    this._txContext = txContext;
  }

  get txContext() {
    return this._txContext;
  }

  verify(unlockingScript: string, txContext?: TxContext): boolean {
    const txCtx: TxContext = Object.assign({ inputSatoshis: 0 }, this._txContext || {}, txContext || {});

    const us = bsv.Script.fromASM(unlockingScript);
    const ls = this.toScript();
    const tx = txCtx.tx || (txCtx.hex ? deserialize(txCtx.hex) : null);
    const inputIndex = txCtx.inputIndex || 0;
    const flags = txCtx.sighashFlags || DEFAULT_FLAGS;

    const si = bsv.Script.Interpreter();
    return si.verify(us, ls, tx, inputIndex, flags, new bsv.crypto.BN(txCtx.inputSatoshis));
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
      this.scriptedConstructor = Contract.abiCoder.encodeConstructorCall(this, Contract.asm, ...ctorParams);
    }
  };

  ContractClass.contracName = abiJSON.contract;
  ContractClass.interfaces = abiJSON.interfaces;
  ContractClass.asm = abiJSON.asm;
  ContractClass.abiCoder = new ABICoder(abiJSON.interfaces);

  ContractClass.interfaces.forEach(entity => {
    ContractClass.prototype[entity.name] = function (...args: SupportedParamType[]): FunctionCall {
      return ContractClass.abiCoder.encodePubFunctionCall(this, entity.name, args);
    };
  });

  return ContractClass as any;
}