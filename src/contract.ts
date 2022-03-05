import { isLibraryType, isStructType, LibraryEntity, ParamEntity } from '.';
import { StaticEntity } from './compilerWrapper';
import {
  ABICoder, Arguments, FunctionCall, Script, serializeState, State, bsv, DEFAULT_FLAGS, resolveType, path2uri, getNameByType, isArrayType,
  Struct, SupportedParamType, StructObject, ScryptType, BasicScryptType, ValueType, TypeResolver, arrayTypeAndSize, resolveArrayType, toLiteralArrayType,
  StructEntity, ABIEntity, OpCode, CompileResult, desc2CompileResult, AliasEntity, buildContractState, ABIEntityType, checkSupportedParamType, hash160, buildDefaultStateProps, isStructOrLibraryType
} from './internal';
import { HashedMap, HashedSet, Library, ScryptTypeResolver } from './scryptTypes';


export interface TxContext {
  tx?: any;
  inputIndex?: number;
  inputSatoshis?: number;
  opReturn?: string;
  opReturnHex?: string;
}


export type VerifyError = string;


export interface VerifyResult {
  success: boolean;
  error?: VerifyError;
}

export interface ContractDescription {
  version: number;
  compilerVersion: string;
  buildType: string;
  contract: string;
  md5: string;
  stateProps: Array<ParamEntity>;
  structs: Array<StructEntity>;
  library: Array<LibraryEntity>;
  alias: Array<AliasEntity>
  abi: Array<ABIEntity>;
  asm: string;
  hex: string;
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
  public static stateProps: Array<ParamEntity>;
  public static types: Record<string, typeof ScryptType>;
  public static asmContract: boolean;
  public static statics: Array<StaticEntity>;

  public static resolver: ScryptTypeResolver;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor(...ctorParams: SupportedParamType[]) {
  }

  [key: string]: any;

  scriptedConstructor: FunctionCall;
  calls: Map<string, FunctionCall> = new Map();
  asmArgs: AsmVarValues | null = null;
  asmTemplateArgs: Map<string, string> = new Map();
  statePropsArgs: Arguments = [];
  // If true, the contract will read the state from property, if false, the contract will read the state from preimage
  // A newly constructed contract always has this set to true, and after invocation, always has it set to false
  firstCall = true;

  get lockingScript(): Script {

    if (this.dataPart) {
      const lsHex = this.codePart.toHex() + this.dataPart.toHex();
      return bsv.Script.fromHex(lsHex);
    }

    const lsASM = this.scriptedConstructor.toASM();

    return bsv.Script.fromASM(lsASM.trim());
  }

  private _txContext?: TxContext;

  set txContext(txContext: TxContext) {
    this._txContext = txContext;
  }

  get txContext(): TxContext {
    return this._txContext;
  }

  get typeResolver(): TypeResolver {
    const resolver = this.resolver;
    return resolver.resolverType;
  }

  get resolver(): ScryptTypeResolver {
    return Object.getPrototypeOf(this).constructor.resolver as ScryptTypeResolver;
  }

  // replace assembly variables with assembly values
  replaceAsmVars(asmVarValues: AsmVarValues): void {
    this.asmArgs = asmVarValues;
    this.scriptedConstructor.init(asmVarValues);
  }

  static findSrcInfo(interpretStates: any[], opcodes: OpCode[], stepIndex: number, opcodesIndex: number): OpCode | undefined {
    while (--stepIndex > 0 && --opcodesIndex > 0) {
      if (opcodes[opcodesIndex].pos && opcodes[opcodesIndex].pos.file !== 'std' && opcodes[opcodesIndex].pos.line > 0 && interpretStates[stepIndex].step.fExec) {
        return opcodes[opcodesIndex];
      }
    }
  }

  getTypeClassByType(type: string): typeof ScryptType {
    const types: typeof ScryptType[] = Object.getPrototypeOf(this).constructor.types;

    if (isStructOrLibraryType(type)) {
      const structName = getNameByType(type);
      if (Object.prototype.hasOwnProperty.call(types, structName)) {
        return types[structName];
      }
    } else {
      return types[type];
    }
  }


  /**
   * @param states an object. Each key of the object is the name of a state property, and each value is the value of the state property.
   * @returns a locking script that includes the new states. If you only provide some but not all state properties, other state properties are not modified when calculating the locking script.
   */
  getNewStateScript(states: Record<string, SupportedParamType>): Script {

    const stateArgs = this.statePropsArgs;
    const contractName = Object.getPrototypeOf(this).constructor.contractName;
    if (stateArgs.length === 0) {
      throw new Error(`Contract ${contractName} does not have any stateful property`);
    }

    const resolveKeys: string[] = [];
    const newState: Arguments = stateArgs.map(arg => {
      if (Object.prototype.hasOwnProperty.call(states, arg.name)) {
        resolveKeys.push(arg.name);
        const state = states[arg.name];
        const error = checkSupportedParamType(state, arg, this.typeResolver);

        if (error) {
          throw error;
        }

        return Object.assign(
          {
            ...arg
          },
          {
            value: states[arg.name]
          }
        );
      } else {
        return arg;
      }
    });


    Object.keys(states).forEach(key => {
      if (resolveKeys.indexOf(key) === -1) {
        throw new Error(`Contract ${contractName} does not have stateful property ${key}`);
      }
    });

    return bsv.Script.fromHex(this.codePart.toHex() + buildContractState(newState, false, this.typeResolver));
  }

  run_verify(unlockingScriptASM: string, txContext?: TxContext, args?: Arguments): VerifyResult {
    const txCtx: TxContext = Object.assign({}, this._txContext || {}, txContext || {});

    const us = unlockingScriptASM.trim() ? bsv.Script.fromASM(unlockingScriptASM.trim()) : new bsv.Script();
    const ls = this.lockingScript;
    const tx = txCtx.tx;
    const inputIndex = txCtx.inputIndex || 0;
    const inputSatoshis = txCtx.inputSatoshis || 0;


    bsv.Script.Interpreter.MAX_SCRIPT_ELEMENT_SIZE = Number.MAX_SAFE_INTEGER;
    bsv.Script.Interpreter.MAXIMUM_ELEMENT_SIZE = Number.MAX_SAFE_INTEGER;


    const bsi = bsv.Script.Interpreter();

    let stepCounter: StepIndex = 0;
    const interpretStates: { step: any, mainstack: any, altstack: any }[] = [];
    bsi.stepListener = function (step: any, stack: any[], altstack: any[]) {
      interpretStates.push({ mainstack: stack, altstack: altstack, step: step });
      stepCounter++;
    };


    const opcodes: OpCode[] = Object.getPrototypeOf(this).constructor.opcodes;

    const result = bsi.verify(us, ls, tx, inputIndex, DEFAULT_FLAGS, new bsv.crypto.BN(inputSatoshis));

    let error = result ? '' : `VerifyError: ${bsi.errstr}`;



    // some time there is no opcodes, such as when sourcemap flag is disabled. 
    if (opcodes) {
      const offset = unlockingScriptASM.trim() ? unlockingScriptASM.trim().split(' ').length : 0;
      // the complete script may have op_return and data, but compiled output does not have it. So we need to make sure the index is in boundary.

      const lastStepIndex = stepCounter - 1;

      if (typeof this._dataPart === 'string') {
        opcodes.push({ opcode: 'OP_RETURN', stack: [] });
        const dp = this._dataPart.trim();
        if (dp) {
          dp.split(' ').forEach(data => {
            opcodes.push({ opcode: data, stack: [] });
          });
        }
      } else if (AbstractContract.isStateful(this)) {
        opcodes.push({ opcode: 'OP_RETURN', stack: [] });
        const stateHex = this.dataPart.toHex();
        const dp = bsv.Script.fromHex(stateHex).toASM();
        dp.split(' ').forEach(data => {
          opcodes.push({ opcode: data, stack: [] });
        });
      }

      const opcodeIndex = lastStepIndex - offset;


      if (!result && opcodes[opcodeIndex]) {

        const opcode = opcodes[opcodeIndex];

        if (!opcode.pos || opcode.pos.file === 'std') {

          const srcInfo = AbstractContract.findSrcInfo(interpretStates, opcodes, lastStepIndex, opcodeIndex);

          if (srcInfo) {
            opcode.pos = srcInfo.pos;
          }
        }

        // in vscode termianal need to use [:] to jump to file line, but here need to use [#] to jump to file line in output channel.
        if (opcode.pos) {
          error = `VerifyError: ${bsi.errstr} \n\t[Go to Source](${path2uri(opcode.pos.file)}#${opcode.pos.line})  fails at ${opcode.opcode}\n`;

          if (args && ['OP_CHECKSIG', 'OP_CHECKSIGVERIFY', 'OP_CHECKMULTISIG', 'OP_CHECKMULTISIGVERIFY'].includes(opcode.opcode)) {
            if (!txCtx) {
              throw new Error('should provide txContext when verify');
            } if (!tx) {
              throw new Error('should provide txContext.tx when verify');
            }
          }
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

    if (AbstractContract.isStateful(this)) {
      const state = buildContractState(this.statePropsArgs, this.firstCall, this.typeResolver);
      return bsv.Script.fromHex(state);
    }

    return this._dataPart !== undefined ? bsv.Script.fromASM(this._dataPart) : undefined;
  }

  setDataPart(state: State | string, isStateHex = false): void {
    if (isStateHex == false) {
      if (typeof state === 'string') {
        // TODO: validate hex string
        this._dataPart = state.trim();
      } else {
        this._dataPart = serializeState(state);
      }
    } else {
      const abiCoder = Object.getPrototypeOf(this).constructor.abiCoder as ABICoder;
      this.statePropsArgs = abiCoder.parseStateHex(this, state as string);
    }
  }

  get codePart(): Script {
    const codeASM = this.scriptedConstructor.toASM();
    // note: do not trim the trailing space
    return bsv.Script.fromASM(codeASM + ' OP_RETURN');
  }

  get codeHash(): string {
    if (this.dataPart) {
      return hash160(this.codePart.toHex());
    } else {
      return hash160(this.lockingScript.toHex());
    }
  }

  static getAsmVars(contractAsm, instAsm): AsmVarValues | null {
    const regex = /(\$\S+)/g;
    const vars = contractAsm.match(regex);
    if (vars === null) {
      return null;
    }
    const asmArray = contractAsm.split(/\s/g);
    const lsASMArray = instAsm.split(/\s/g);
    const result = {};
    for (let i = 0; i < asmArray.length; i++) {
      for (let j = 0; j < vars.length; j++) {
        if (vars[j] === asmArray[i]) {
          result[vars[j].replace('$', '')] = lsASMArray[i];
        }
      }
    }
    return result;
  }

  public arguments(pubFuncName: string): Arguments {
    if (pubFuncName === 'constructor') {
      return this.scriptedConstructor.args;
    }

    if (this.calls.has(pubFuncName)) {
      return this.calls.get(pubFuncName).args;
    }

    return [];
  }

  public ctorArgs(): Arguments {
    return this.arguments('constructor');
  }

  static fromASM(asm: string): AbstractContract {
    return null;
  }

  static fromHex(hex: string): AbstractContract {
    return null;
  }
  static fromTransaction(hex: string, outputIndex = 0): AbstractContract {
    return null;
  }
  static isStateful(contract: AbstractContract): boolean {
    const stateProps = Object.getPrototypeOf(contract).constructor.stateProps as Array<ParamEntity>;
    return stateProps.length > 0;
  }
}


const invalidMethodName = ['arguments',
  'setDataPart',
  'run_verify',
  'replaceAsmVars',
  'asmVars',
  'asmArguments',
  'dataPart',
  'lockingScript',
  'codeHash',
  'codePart',
  'typeResolver',
  'getTypeClassByType',
  'getNewStateScript',
  'allTypes',
  'txContext'];

export function buildContractClass(desc: CompileResult | ContractDescription): typeof AbstractContract {

  if (!desc.contract) {
    throw new Error('missing field `contract` in description');
  }

  if (!desc.abi) {
    throw new Error('missing field `abi` in description');
  }

  if (!desc.asm) {
    throw new Error('missing field `asm` in description');
  }

  if (!desc['errors']) {
    desc = desc2CompileResult(desc as ContractDescription);
  } else {
    desc = desc as CompileResult;
  }



  const ContractClass = class Contract extends AbstractContract {
    constructor(...ctorParams: SupportedParamType[]) {
      super();
      if (!Contract.asmContract) {
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
      return ContractClass.fromHex(bsv.Script.fromASM(asm).toHex());
    }

    /**
     * Create a contract instance using UTXO hex
     * @param hex 
     */
    static fromHex(hex: string) {
      Contract.asmContract = true;
      const obj = new this();
      Contract.asmContract = false;
      obj.scriptedConstructor = Contract.abiCoder.encodeConstructorCallFromRawHex(obj, Contract.asm, hex);
      return obj;
    }


    /**
     * Create a contract instance using raw Transaction
     * @param hex 
     */
    static fromTransaction(hex: string, outputIndex = 0) {
      const tx = new bsv.Transaction(hex);
      return ContractClass.fromHex(tx.outputs[outputIndex].script.toHex());
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


  const statics = desc.statics || [];
  ContractClass.resolver = buildScryptTypeResolver(desc);

  ContractClass.contractName = desc.contract;
  ContractClass.abi = desc.abi;
  ContractClass.asm = desc.asm.map(item => item['opcode'].trim()).join(' ');
  ContractClass.abiCoder = new ABICoder(desc.abi, ContractClass.resolver);
  ContractClass.opcodes = desc.asm;
  ContractClass.file = desc.file;
  ContractClass.structs = desc.structs;
  ContractClass.statics = statics;
  ContractClass.types = buildTypeClasses(desc);
  ContractClass.stateProps = desc.stateProps;


  ContractClass.abi.forEach(entity => {
    if (invalidMethodName.indexOf(entity.name) > -1) {
      throw new Error(`Method name [${entity.name}] is used by scryptlib now, Pelease change you contract method name!`);
    }
    ContractClass.prototype[entity.name] = function (...args: SupportedParamType[]): FunctionCall {
      const call = ContractClass.abiCoder.encodePubFunctionCall(this, entity.name, args);
      this.calls.set(entity.name, call);
      return call;
    };
  });

  ContractClass.stateProps.forEach(p => {

    Object.defineProperty(ContractClass.prototype, p.name, {
      get() {
        const arg = this.statePropsArgs.find(arg => {
          return arg.name === p.name;
        });

        if (arg) {
          return arg.value;
        } else {
          throw new Error(`property ${p.name} does not exists`);
        }
      },
      set(value: SupportedParamType) {
        const arg = this.statePropsArgs.find(arg => {
          return arg.name === p.name;
        });

        if (arg) {
          arg.value = value;
          this.firstCall = false;
        } else {
          throw new Error(`property ${p.name} does not exists`);
        }
      }
    });
  });

  return ContractClass;
}



/**
 * @deprecated use buildTypeClasses
 * @param desc CompileResult or ContractDescription
 */
export function buildStructsClass(desc: CompileResult | ContractDescription): Record<string, typeof Struct> {

  const structTypes: Record<string, typeof Struct> = {};
  const structs: StructEntity[] = desc.structs || [];
  const finalTypeResolver = buildTypeResolverFromDesc(desc);
  structs.forEach(element => {
    const name = element.name;

    Object.assign(structTypes, {
      [name]: class extends Struct {
        constructor(o: StructObject) {
          super(o);
          this._typeResolver = finalTypeResolver; //we should assign this before bind
          this.bind();
        }
      }
    });

    structTypes[name].structAst = element;
  });

  return structTypes;
}


function buildStdLibraryClass(): Record<string, typeof Library> {

  const libraryTypes: Record<string, typeof Library> = {};

  Object.assign(libraryTypes, {
    ['HashedMap']: HashedMap
  });

  Object.assign(libraryTypes, {
    ['HashedSet']: HashedSet
  });

  return libraryTypes;
}

export function buildLibraryClass(desc: CompileResult | ContractDescription): Record<string, typeof Library> {

  const libraryTypes: Record<string, typeof Library> = {};

  // map LibraryEntity to StructEntity, as we treat library as struct
  const library: LibraryEntity[] = desc.library || [];

  const finalTypeResolver = buildTypeResolverFromDesc(desc);

  Object.assign(libraryTypes, buildStdLibraryClass());

  library.forEach(element => {
    const name = element.name;


    const libraryClass = class extends Library {
      constructor(...args: SupportedParamType[]) {
        super(...args);
        this._typeResolver = finalTypeResolver; //we should assign this before bind
        this.bind();
      }
    };


    libraryClass.libraryAst = element;

    Object.assign(libraryTypes, {
      [name]: libraryClass
    });

  });

  return libraryTypes;
}

export function buildTypeClasses(descOrClas: CompileResult | ContractDescription | typeof AbstractContract): Record<string, typeof ScryptType> {

  if (Object.prototype.hasOwnProperty.call(descOrClas, 'types')) {
    const CLASS = descOrClas as typeof AbstractContract;
    return CLASS.types;
  }

  const desc = descOrClas as CompileResult | ContractDescription;

  const structClasses = buildStructsClass(desc);
  const libraryClasses = buildLibraryClass(desc);

  const allTypeClasses: Record<string, typeof ScryptType> = {};
  const alias: AliasEntity[] = desc.alias || [];

  const finalTypeResolver = buildTypeResolverFromDesc(desc);
  alias.forEach(element => {
    const finalType = finalTypeResolver(element.name);
    if (isStructType(finalType)) {
      const type = getNameByType(finalType);
      Object.assign(allTypeClasses, {
        [element.name]: class extends structClasses[type] {
          constructor(o: StructObject) {
            super(o);
            this._type = element.name;
            this._typeResolver = finalTypeResolver;
          }
        }
      });
    } else if (isArrayType(finalType)) {
      //not need to build class type for array, we only build class type for array element
    } else {
      const C = BasicScryptType[finalType];
      if (C) {
        const aliasClass = class extends C {
          constructor(o: ValueType) {
            super(o);
            this._type = element.name;
            this._typeResolver = finalTypeResolver;
          }
        };

        Object.assign(allTypeClasses, {
          [element.name]: aliasClass
        });
      } else {
        throw new Error(`can not resolve type alias ${element.name} ${element.type}`);
      }
    }
  });

  Object.assign(allTypeClasses, structClasses);
  Object.assign(allTypeClasses, libraryClasses);
  Object.assign(allTypeClasses, BasicScryptType);

  return allTypeClasses;
}


export function buildTypeResolverFromDesc(desc: CompileResult | ContractDescription): TypeResolver {
  const alias: AliasEntity[] = desc.alias || [];
  const library: LibraryEntity[] = desc.library || [];
  const structs: StructEntity[] = desc.structs || [];
  const statics = desc['statics'] || [];
  const contract = desc.contract;
  return buildTypeResolver(contract, alias, structs, library, statics);

}

// build a resolver witch can only resolve type
export function buildTypeResolver(contract: string, alias: AliasEntity[], structs: StructEntity[], library: LibraryEntity[], statics: StaticEntity[]): TypeResolver {

  const resolvedTypes: Record<string, string> = {};
  structs.forEach(element => {
    resolvedTypes[element.name] = `struct ${element.name} {}`;
  });

  library.forEach(element => {
    resolvedTypes[element.name] = `library ${element.name} {}`;
  });

  alias.forEach(element => {
    resolvedTypes[element.name] = resolveType(element.name, resolvedTypes, contract, statics, alias, library);
  });

  // add std type

  resolvedTypes['HashedMap'] = 'library HashedMap {}';
  resolvedTypes['HashedSet'] = 'library HashedSet {}';
  resolvedTypes['PubKeyHash'] = 'Ripemd160';



  const resolver = (type: string) => {

    if (BasicScryptType[type]) {
      return `${type}`;
    }

    if (resolvedTypes[type]) {
      return `${resolvedTypes[type]}`;
    }

    return resolveType(type, resolvedTypes, contract, statics, alias, library);
  };

  return resolver;
}

// build a resolver which can resolve type and ScryptType class
export function buildScryptTypeResolver(desc: CompileResult | ContractDescription): ScryptTypeResolver {
  const resolver = buildTypeResolverFromDesc(desc);
  const allTypes = buildTypeClasses(desc);

  return {
    resolverType: resolver,
    resolverClass: (type: string) => {
      const finalType = resolver(type);
      const typeName = getNameByType(finalType) ? getNameByType(finalType) : finalType;
      return allTypes[typeName];
    },
    allTypes: () => {
      return allTypes;
    }
  };
}