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
    if (this._dataLoad !== undefined) {
      lsASM += ` OP_RETURN ${this._dataLoad}`;
    }
    return bsv.Script.fromASM(lsASM.trim());
  }

  private _txContext?: TxContext;

  set txContext(txContext: TxContext) {
    this._txContext = txContext;
  }

  get txContext(): TxContext {
    return this._txContext;
  }

  run_verify(unlockingScriptASM: string, txContext?: TxContext): boolean {
    const txCtx: TxContext = Object.assign({}, this._txContext || {}, txContext || {});

    const us = bsv.Script.fromASM(unlockingScriptASM);
    const ls = this.lockingScript;
    const tx = txCtx.tx || (txCtx.hex ? new bsv.Transaction(txCtx.hex) : null);
    const inputIndex = txCtx.inputIndex || 0;
    const inputSatoshis = txCtx.inputSatoshis || 0;

    const si = bsv.Script.Interpreter();
    const result = si.verify(us, ls, tx, inputIndex, DEFAULT_FLAGS, new bsv.crypto.BN(inputSatoshis));

    if (!result) {
      throw new VerificationError(`failed to verify due to ${si.errstr}`,
        {
          'lockingScriptASM': ls.toASM(),
          'unlockingScriptASM': us.toASM(),
          'txHex': tx ? tx.toString('hex') : undefined,
          inputIndex,
          inputSatoshis
        });
    }

    return true;
  }

  private _dataLoad?: string;

  set dataLoad(dataInHex: string | undefined | null) {
    if (dataInHex === undefined || dataInHex === null) {
      this._dataLoad = undefined;
    } else {
      this._dataLoad = dataInHex.trim();
    }
  }

  get dataLoad(): string {
    return this._dataLoad;
  }

  get codePart(): Script {
    return this.scriptedConstructor.lockingScript;
  }

  get dataPart(): Script | undefined {
    if (this._dataLoad !== undefined && this._dataLoad !== null) {
      return bsv.Script.fromASM(this._dataLoad);
    }
    return undefined;
  }
}

export function buildContractClass(desc: ContractDescription): any {

  if (!desc.contract) {
    throw new Error('missing field `contract` in description');
  }

  if (!desc.abi) {
    throw new Error('missing field `abi` in description');
  }

  if (!desc.asm) {
    throw new Error('missing field `asm` in description');
  }

  const ContractClass = class Contract extends AbstractContract {
    constructor(...ctorParams: SupportedParamType[]) {
      super();
      this.scriptedConstructor = Contract.abiCoder.encodeConstructorCall(this, Contract.asm, ...ctorParams);
    }
  };

  ContractClass.contracName = desc.contract;
  ContractClass.abi = desc.abi;
  ContractClass.asm = desc.asm;
  ContractClass.abiCoder = new ABICoder(desc.abi);

  ContractClass.abi.forEach(entity => {
    ContractClass.prototype[entity.name] = function (...args: SupportedParamType[]): FunctionCall {
      return ContractClass.abiCoder.encodePubFunctionCall(this, entity.name, args);
    };
  });

  return ContractClass;
}

export class VerificationError extends Error {

  constructor(public message: string, public context: Record<string, any>) {
    super(message);
  }

  toString(): string {
    return `Error: ${this.message}`;
  }

}