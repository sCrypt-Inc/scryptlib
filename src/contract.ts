import { ABICoder, ABIEntity, FunctionCall, SupportedParamType, Script } from "./abi";
import { bsv, DEFAULT_FLAGS } from "./utils";

export interface TxContext {
  inputSatoshis?: number;
  tx?: any;
  hex?: string;
  inputIndex?: number;
  sighashFlags?: number;
}

export interface ContractDescription {
  compilerVersion: string;
  contract: string;
  md5: string;
  abi: Array<ABIEntity>;
  asm: string;
}

export class AbstractContract {

  public static contracName: string;
  public static abi: ABIEntity[];
  public static asm: string;
  public static abiCoder: ABICoder;

  scriptedConstructor: FunctionCall;

  get lockingScript(): Script {
    let lsASM = this.scriptedConstructor.toASM();
    if (this._opReturn !== undefined) {
      lsASM += ` OP_RETURN ${this._opReturn}`;
    }
    return bsv.Script.fromASM(lsASM);
  }

  private _txContext?: TxContext;

  set txContext(txContext: TxContext) {
    this._txContext = txContext;
  }

  get txContext(): TxContext {
    return this._txContext;
  }

  verify(unlockingScriptASM: string, txContext?: TxContext): boolean {
    const txCtx: TxContext = Object.assign({}, this._txContext || {}, txContext || {});

    const us = bsv.Script.fromASM(unlockingScriptASM);
    const ls = this.lockingScript;
    const tx = txCtx.tx || (txCtx.hex ? new bsv.Transaction(txCtx.hex) : null);
    const inputIndex = txCtx.inputIndex || 0;
    const flags = txCtx.sighashFlags || DEFAULT_FLAGS;
    const inputSatoshis = txCtx.inputSatoshis || 0;

    const si = bsv.Script.Interpreter();
    const result = si.verify(us, ls, tx, inputIndex, flags, new bsv.crypto.BN(inputSatoshis));

    // if (!result) {
    //   console.debug(`verify failed due to ${si.errstr}, context:`);
    //   console.debug({
    //     'lockingScript': ls.toASM(),
    //     'unlockingScript': us.toASM(),
    //     'txHex': tx ? tx.toString('hex') : undefined,
    //     inputIndex,
    //     flags,
    //     inputSatoshis
    //   });
    // }

    return result;
  }

  private _opReturn?: string;

  set opReturn(opReturnInHex: string | undefined | null) {
    if (opReturnInHex === undefined || opReturnInHex === null) {
      this._opReturn = undefined;
    } else {
      this._opReturn = opReturnInHex.trim();
    }
  }

  get opReturn(): string {
    return this._opReturn;
  }

  get codePart(): Script {
    return this.scriptedConstructor.lockingScript;
  }

  get dataPart(): Script | undefined {
    if (this._opReturn !== undefined && this._opReturn !== null) {
      return bsv.Script.fromASM(this._opReturn);
    }
    return undefined;
  }
}

export function buildContractClass(description: ContractDescription): any {

  if (!description.contract) {
    throw new Error('missing field `contract` in description');
  }

  if (!description.abi) {
    throw new Error('missing field `abi` in description');
  }

  if (!description.asm) {
    throw new Error('missing field `asm` in description');
  }

  const ContractClass = class Contract extends AbstractContract {
    constructor(...ctorParams: SupportedParamType[]) {
      super();
      this.scriptedConstructor = Contract.abiCoder.encodeConstructorCall(this, Contract.asm, ...ctorParams);
    }
  };

  ContractClass.contracName = description.contract;
  ContractClass.abi = description.abi;
  ContractClass.asm = description.asm;
  ContractClass.abiCoder = new ABICoder(description.abi);

  ContractClass.abi.forEach(entity => {
    ContractClass.prototype[entity.name] = function (...args: SupportedParamType[]): FunctionCall {
      return ContractClass.abiCoder.encodePubFunctionCall(this, entity.name, args);
    };
  });

  return ContractClass;
}