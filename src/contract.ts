import { ABICoder, FunctionCall, Script} from "./abi";
import { serializeState, State } from "./serializer";
import { bsv, DEFAULT_FLAGS, path2uri, readFileByLine } from "./utils";
import { SupportedParamType} from './scryptTypes';
import { StructEntity, ABIEntity, DebugModeAsmWord, CompileResult} from "./compilerWrapper";
import { basename } from 'path';
export interface TxContext {
  tx?: any;
  inputIndex?: number;
  inputSatoshis?: number;
}


export type VerifyError = string;


export interface VerifyResult {
  success: boolean;
  error?: VerifyError; 
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
  public static debugAsm?: DebugModeAsmWord[];

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

  static findMappableAsmWord(debugAsm: DebugModeAsmWord[], pc: number): DebugModeAsmWord | undefined {
    while (--pc > 0) {
      if (debugAsm[pc].file && debugAsm[pc].file !== "std" && debugAsm[pc].line > 0) {
        return debugAsm[pc];
      }
    }
  }


  static getExectFailedOpcode(opcode0: string, opcode1: string): string {
    switch(opcode0) {
      case 'OP_CHECKSIG':
      case 'OP_NUMEQUAL':
      case 'OP_EQUAL':
      case 'OP_EQUALVERIFY':
      case 'OP_VERIFY':
      case 'OP_0NOTEQUAL':
      case 'OP_NUMEQUALVERIFY':
        return opcode0;
      default:
        return opcode1;
    }
  }

  run_verify(unlockingScriptASM: string, txContext?: TxContext): VerifyResult {
    const txCtx: TxContext = Object.assign({}, this._txContext || {}, txContext || {});

    const us = bsv.Script.fromASM(unlockingScriptASM.trim());
    const ls = this.lockingScript;
    const tx = txCtx.tx;
    const inputIndex = txCtx.inputIndex || 0;
    const inputSatoshis = txCtx.inputSatoshis || 0;

    const bsi = bsv.Script.Interpreter();
  
    let stepCouter = 0;
		bsi.stepListener = function (step: any, stack: any[], altstack: any[]) {
      stepCouter++;
    };

    
    const debugAsm: DebugModeAsmWord[] =  Object.getPrototypeOf(this).constructor.debugAsm;

    const result = bsi.verify(us, ls, tx, inputIndex, DEFAULT_FLAGS, new bsv.crypto.BN(inputSatoshis));

    let error = bsi.errstr;

    const offset = unlockingScriptASM.trim().split(' ').length;
    
    // the complete script will have op_return and data, but debugAsm do not have, so we need to make sure the index in bound.
    const debugAsm_pc = Math.min(stepCouter -  offset,  debugAsm.length -1);

    if(!result && debugAsm && debugAsm[debugAsm_pc]) {

      let asmWord = debugAsm[debugAsm_pc]; 

      if(!asmWord.file || asmWord.file === "std") {

        let asmWordMappable  = AbstractContract.findMappableAsmWord(debugAsm, debugAsm_pc);

        asmWord.file = asmWordMappable.file;
        asmWord.line = asmWordMappable.line;
        asmWord.opcode = AbstractContract.getExectFailedOpcode(asmWord.opcode, asmWordMappable.opcode);
      }

      const line =  readFileByLine(asmWord.file, asmWord.line);

      error = `VerifyError: message:${bsi.errstr} [link](${asmWord.file}#${asmWord.line}) failed opcode:${asmWord.opcode}\n`;
    }
    
 

    return {
      success: result,
      error: error
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

export function buildContractClass(desc: CompileResult): any {

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

    get asmVars(): AsmVarValues | null {
      return AbstractContract.getAsmVars(Contract.asm, this.scriptedConstructor.toASM());
    }
  };

  ContractClass.contractName = desc.contract;
  ContractClass.abi = desc.abi;
  ContractClass.asm = desc.asm;
  ContractClass.abiCoder = new ABICoder(desc.abi, desc.structs);
  ContractClass.debugAsm = desc.debugAsm;

  ContractClass.abi.forEach(entity => {
    ContractClass.prototype[entity.name] = function (...args: SupportedParamType[]): FunctionCall {
      return ContractClass.abiCoder.encodePubFunctionCall(this, entity.name, args);
    };
  });

  return ContractClass;
}
