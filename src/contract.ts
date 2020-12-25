import { ABICoder, FunctionCall, Script} from "./abi";
import { serializeState, State } from "./serializer";
import { bsv, DEFAULT_FLAGS,  path2uri } from "./utils";
import { SupportedParamType} from './scryptTypes';
import { StructEntity, ABIEntity, OpCode, CompileResult, desc2CompileResult} from "./compilerWrapper";
import { assert } from "console";

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
  sources: Array<string>;
  sourceMap: Array<string>;
}

export type AsmVarValues = { [key: string]: string }
export type StepIndex = number;

export class AbstractContract {

  public static contractName: string;
  public static abi: ABIEntity[];
  public static asm: string;
  public static abiCoder: ABICoder;
  public static opcodes?: OpCode[];
  public static file: string;

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

  static findSrcInfo(steps: any[], opcodes: OpCode[], stepIndex: number, offset: number): OpCode | undefined {
    while (--stepIndex > 0) {
      const opcodesIndex = stepIndex - offset + 1;
      if (opcodes[opcodesIndex].file && opcodes[opcodesIndex].file !== "std" && opcodes[opcodesIndex].line > 0 && steps[stepIndex].fExec) {
        return opcodes[opcodesIndex];
      }
    }
  }



  static findLastfExec(steps: any[], stepIndex: StepIndex): StepIndex {
    while (--stepIndex > 0) {
      if (steps[stepIndex].fExec) {
        return stepIndex;
      }
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
  
    let stepCounter: StepIndex = 0;
    const steps = [];
		bsi.stepListener = function (step: any, stack: any[], altstack: any[]) {
      steps.push(step);
      stepCounter++;
    };

    
    const opcodes: OpCode[] =  Object.getPrototypeOf(this).constructor.opcodes;

    const result = bsi.verify(us, ls, tx, inputIndex, DEFAULT_FLAGS, new bsv.crypto.BN(inputSatoshis));

    let error = `VerifyError: ${bsi.errstr}`;



    // some time there is no opcodes, such as when sourcemap flag is closeed. 
    if(opcodes) {
      const offset = unlockingScriptASM.trim().split(' ').length;
      // the complete script may have op_return and data, but compiled output does not have it. So we need to make sure the index is in boundary.

      const lastStepIndex = AbstractContract.findLastfExec(steps, stepCounter);

      if(this._dataPart !== undefined && this._dataPart !== null) {
        opcodes.push({opcode: 'OP_RETURN', file: undefined, line: undefined, endLine: undefined, column: undefined, endColumn: undefined, stack:[]})
        this._dataPart.split(' ').forEach(data => {
          opcodes.push({opcode: data, file: undefined, line: undefined, endLine: undefined, column: undefined, endColumn: undefined, stack:[]})
        })
      }
      let pc = lastStepIndex -  offset;
      if(stepCounter === (opcodes.length + offset)) { // all opcode  was exec
        
      } else { //not all opcode was exec, break like OP_VERIFY
        pc += 1;
      }

      if(!result && opcodes[pc]) {

        const opcode = opcodes[pc]; 
  
        if(!opcode.file || opcode.file === "std") {
  
          const srcInfo  = AbstractContract.findSrcInfo(steps, opcodes, lastStepIndex, offset);

          if(srcInfo) {
            opcode.file = srcInfo.file;
            opcode.line = srcInfo.line;
          }
        }
  
        // in vscode termianal need to use [:] to jump to file line, but here need to use [#] to jump to file line in output channel.
        if(opcode.file && opcode.line) {
          error = `VerifyError: ${bsi.errstr} \n\t[Go to Source](${path2uri(opcode.file)}#${opcode.line})  fails at ${opcode.opcode}\n`;
        }  
      } 
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

export function buildContractClass(desc: CompileResult | ContractDescription): any {

  if (!desc.contract) {
    throw new Error('missing field `contract` in description');
  }

  if (!desc.abi) {
    throw new Error('missing field `abi` in description');
  }

  if (!desc.asm) {
    throw new Error('missing field `asm` in description');
  }

  if(!desc["errors"]) {
    desc = desc2CompileResult(desc as ContractDescription);
  } else {
    desc = desc as CompileResult;
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
  ContractClass.asm = desc.asm.map(item => item["opcode"].trim()).join(' ');
  ContractClass.abiCoder = new ABICoder(desc.abi, desc.structs);
  ContractClass.opcodes = desc.asm;
  ContractClass.file = desc.file;

  ContractClass.abi.forEach(entity => {
    ContractClass.prototype[entity.name] = function (...args: SupportedParamType[]): FunctionCall {
      return ContractClass.abiCoder.encodePubFunctionCall(this, entity.name, args);
    };
  });

  return ContractClass;
}
