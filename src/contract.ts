import { ABICoder, Arguments, FunctionCall, Script} from "./abi";
import { serializeState, State } from "./serializer";
import { bsv, DEFAULT_FLAGS,  resolveType,  path2uri } from "./utils";
import { Struct, SupportedParamType, StructObject, ScryptType, VariableType, Int, Bytes, BasicScryptType, ValueType} from './scryptTypes';
import { StructEntity, ABIEntity, OpCode, CompileResult, desc2CompileResult, AliasEntity} from "./compilerWrapper";

export interface TxContext {
  tx?: any;
  inputIndex?: number;
  inputSatoshis?: number;
  opReturn?: string;
}


export type VerifyError = string;


export interface VerifyResult {
  success: boolean;
  error?: VerifyError; 
}

export interface ContractDescription {
  version: number;
  compilerVersion: string;
  contract: string;
  md5: string;
  structs: Array<StructEntity>;
  alias: Array<AliasEntity>
  abi: Array<ABIEntity>;
  asm: string;
  file: string;
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
  public static structs: StructEntity[];

  scriptedConstructor: FunctionCall;
  calls: Map<string, FunctionCall> = new Map();
  asmArgs: AsmVarValues | null = null;

  get lockingScript(): Script {
    let lsASM = this.scriptedConstructor.toASM();
    if (typeof this._dataPart === 'string') {
      const dp = this._dataPart.trim();
      if (dp) {
        lsASM += ` OP_RETURN ${dp}`;
      } else {
        lsASM += ` OP_RETURN`;  // note there is no space after op_return
      }
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
    this.asmArgs = asmVarValues;
    this.scriptedConstructor.init(asmVarValues);
  }

  static findSrcInfo(steps: any[], opcodes: OpCode[], stepIndex: number, opcodesIndex: number): OpCode | undefined {
    while (--stepIndex > 0 && --opcodesIndex > 0) {
      if (opcodes[opcodesIndex].pos && opcodes[opcodesIndex].pos.file !== "std" && opcodes[opcodesIndex].pos.line > 0 && steps[stepIndex].fExec) {
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

      if (typeof this._dataPart === 'string') {
        opcodes.push({opcode: 'OP_RETURN',  stack:[]});
        const dp = this._dataPart.trim();
        if (dp) {
          dp.split(' ').forEach(data => {
            opcodes.push({opcode: data, stack:[]});
          });
        }
      }
      
      let opcodeIndex = lastStepIndex -  offset;
      if(stepCounter < (opcodes.length + offset)) {
        // not all opcodes were executed, stopped in the middle at opcode like OP_VERIFY
         opcodeIndex += 1;
      }

      if(!result && opcodes[opcodeIndex]) {

        const opcode = opcodes[opcodeIndex]; 
  
        if(!opcode.pos || opcode.pos.file === "std") {
  
          const srcInfo  = AbstractContract.findSrcInfo(steps, opcodes, lastStepIndex, opcodeIndex);

          if(srcInfo) {
            opcode.pos = srcInfo.pos;
          }
        }
  
        // in vscode termianal need to use [:] to jump to file line, but here need to use [#] to jump to file line in output channel.
        if(opcode.pos) {
          error = `VerifyError: ${bsi.errstr} \n\t[Go to Source](${path2uri(opcode.pos.file)}#${opcode.pos.line})  fails at ${opcode.opcode}\n`;
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

  public arguments(pubFuncName: string) : Arguments {
    if(pubFuncName === 'constructor') {
      return this.scriptedConstructor.args;
    } 

    if(this.calls.has(pubFuncName)) {
      return this.calls.get(pubFuncName).args;
    }

    return [];
  }
}


const invalidMethodName = ["arguments", "setDataPart", "run_verify", "replaceAsmVars", "asmVars", "asmArguments", "dataPart", "lockingScript", "txContext"];

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

    get asmArguments(): AsmVarValues | null {
      //TODO: @deprecate AbstractContract.getAsmVars , using asmArguments

      return null;
    }

  };

  ContractClass.contractName = desc.contract;
  ContractClass.abi = desc.abi;
  ContractClass.asm = desc.asm.map(item => item["opcode"].trim()).join(' ');
  ContractClass.abiCoder = new ABICoder(desc.abi, desc.structs);
  ContractClass.opcodes = desc.asm;
  ContractClass.file = desc.file;
  ContractClass.structs = desc.structs;

  ContractClass.abi.forEach(entity => {
    if(invalidMethodName.indexOf(entity.name) > -1) {
      throw new Error(`Method name [${entity.name}] is used by scryptlib now, Pelease change you contract method name!`);
    }
    ContractClass.prototype[entity.name] = function (...args: SupportedParamType[]): FunctionCall {
      const call = ContractClass.abiCoder.encodePubFunctionCall(this, entity.name, args);
      this.calls.set(entity.name, call);
      return call;
    };
  });

  return ContractClass;
}


function buildStructsClass(desc: CompileResult | ContractDescription): Record<string, typeof Struct> {

  const structTypes: Record<string, typeof Struct> = {};

  const structs: StructEntity[] = desc.structs || [];
  structs.forEach(element => {
    const name = element.name;

    Object.assign(structTypes, {
      [name]: class extends Struct {
        constructor(o: StructObject) {
          super(o);
          this.bind(element);
        }
      }
    });

  });

  return structTypes;
}



export function buildTypeClasses(desc: CompileResult | ContractDescription): Record<string, typeof ScryptType> {

  const structClasses = buildStructsClass(desc);
  const aliasTypes: Record<string, typeof ScryptType> = {};
  const structs: StructEntity[] = desc.structs || [];
  const alias: AliasEntity[] = desc.alias || [];

  alias.forEach(element => {
    const finalType = resolveType(alias, structs, element.name);
    const C = BasicScryptType[finalType];
    if(C) {
      const Class = C as typeof ScryptType;
      Object.assign(aliasTypes, {
        [element.name]: class extends Class {
          constructor(o: ValueType) {
            super(o);
            this._type = element.name;
            this._finalType = finalType;
          }
        }
      });
    } else if(finalType.indexOf('[') > -1) {
      Object.assign(aliasTypes, {
        [element.name]: class extends Array<typeof C> {}
      });
     } else {
      Object.assign(aliasTypes, {
        [element.name]: class extends structClasses[finalType] {
          constructor(o: StructObject) {
            super(o);
            this._type = element.name;
            this._finalType = finalType;
          }
        }
      });
    }
  });

  Object.assign(aliasTypes, structClasses);

  return aliasTypes;
}
