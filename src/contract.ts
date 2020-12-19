import { ABICoder, FunctionCall, Script} from "./abi";
import { serializeState, State } from "./serializer";
import { bsv, DEFAULT_FLAGS } from "./utils";
import { SupportedParamType} from './scryptTypes';
import { StructEntity, ABIEntity} from "./compilerWrapper";

export interface TxContext {
  tx?: any;
  inputIndex?: number;
  inputSatoshis?: number;
}

export interface VerifyResult {
  success: boolean;
  error: string; 
}

export interface ContractDescription {
  compilerVersion: string;
  contract: string;
  md5: string;
  structs: Array<StructEntity>;
  abi: Array<ABIEntity>;
  asm: string;
}

export type AsmVarValues = { [key: string]: string }

export class AbstractContract {

  public static contractName: string;
  public static abi: ABIEntity[];
  public static asm: string;
  public static abiCoder: ABICoder;

  scriptedConstructor: FunctionCall;

  get lockingScript(): Script {
    let lsASM = this.scriptedConstructor.toASM();
    if (this._dataPart !== undefined && this._dataPart !== null) {
      lsASM += ` OP_RETURN ${this._dataPart}`;
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

  // replace assembly variables with assembly values
  replaceAsmVars(asmVarValues: AsmVarValues): void {
    this.scriptedConstructor.init(asmVarValues);
  }

  run_verify(unlockingScriptASM: string, txContext?: TxContext): VerifyResult {
    const txCtx: TxContext = Object.assign({}, this._txContext || {}, txContext || {});

    const us = bsv.Script.fromASM(unlockingScriptASM);
    const ls = this.lockingScript;
    const tx = txCtx.tx;
    const inputIndex = txCtx.inputIndex || 0;
    const inputSatoshis = txCtx.inputSatoshis || 0;

    const si = bsv.Script.Interpreter();
    const result = si.verify(us, ls, tx, inputIndex, DEFAULT_FLAGS, new bsv.crypto.BN(inputSatoshis));

    return {
      success: result,
      error: si.errstr
    };
  }

  private _dataPart: string | undefined;

  set dataPart(dataInScript: Script | undefined) {
    throw new Error('Setter for dataPart is not available. Please use: setDataPart() instead');
  }
  
  get dataPart(): Script | undefined {
    return this._dataPart !== undefined ? bsv.Script.fromASM(this._dataPart) : undefined;
  }

  setDataPart(state: State | string): void {
    if (typeof state === 'string') {
      // TODO: validate hex string
      this._dataPart = state.trim();
    } else {
      this._dataPart = serializeState(state);
    }
  }

  get codePart(): Script {
    const codeASM = this.scriptedConstructor.toASM();
    // note: do not trim the trailing space
    return bsv.Script.fromASM(codeASM + ` OP_RETURN`);
  }

  static getAsmVars(contractAsm, instAsm): AsmVarValues | null {
    const regex = /(\$\S+)/g;
    const vars = contractAsm.match(regex);
    if(vars===null) {
      return null;
    }
    const asmArray = contractAsm.split(/\s/g);
    const lsASMArray = instAsm.split(/\s/g);
    const result = {};
    for(let i=0; i<asmArray.length; i++) {
      for(let j=0; j<vars.length; j++) {
        if(vars[j] === asmArray[i]) {
          result[vars[j].replace('$','')] = lsASMArray[i];
        }
      }
    }
    return result;
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
      if(ctorParams.length>0 || Contract.abi.find(fn => (fn.type === "constructor" && fn.params.length === 0))) {
        this.scriptedConstructor = Contract.abiCoder.encodeConstructorCall(this, Contract.asm, ...ctorParams);
      }
    }

    //When create a contract instance using UTXO, 
    //use fromHex or fromASM because you do not know the parameters of constructor.
    
    /**
     * Create a contract instance using UTXO asm
     * @param hex 
     */
    static fromASM(asm: string) {
      const obj = new this();
      obj.scriptedConstructor = Contract.abiCoder.encodeConstructorCallFromASM(obj, asm );
      return obj;
    }

    /**
     * Create a contract instance using UTXO hex
     * @param hex 
     */
    static fromHex(hex: string) {
      return ContractClass.fromASM((new bsv.Script(hex)).toASM());
    }

    /**
     * Get the parameter of the constructor and inline asm vars,
     * all values is hex string, need convert it to number or bytes on using
     */
    get asmVars(): AsmVarValues | null {
      return AbstractContract.getAsmVars(Contract.asm, this.scriptedConstructor.toASM());
    }
  };

  ContractClass.contractName = desc.contract;
  ContractClass.abi = desc.abi;
  ContractClass.asm = desc.asm;
  ContractClass.abiCoder = new ABICoder(desc.abi, desc.structs);

  ContractClass.abi.forEach(entity => {
    ContractClass.prototype[entity.name] = function (...args: SupportedParamType[]): FunctionCall {
      return ContractClass.abiCoder.encodePubFunctionCall(this, entity.name, args);
    };
  });

  return ContractClass;
}
