import { LibraryEntity, ParamEntity } from '.';
import { ContractEntity, getFullFilePath, loadSourceMapfromDesc, OpCode, StaticEntity } from './compilerWrapper';
import {
  ABICoder, Arguments, FunctionCall, Script, serializeState, State, bsv, DEFAULT_FLAGS, resolveType, path2uri, getNameByType, isArrayType,
  Struct, SupportedParamType, StructObject, ScryptType, BasicScryptType, ValueType, TypeResolver,
  StructEntity, ABIEntity, CompileResult, AliasEntity, buildContractState, checkSupportedParamType, hash160, buildContractCode, JSONParserSync, uri2path, findSrcInfoV2, findSrcInfoV1,
} from './internal';
import { HashedMap, HashedSet, Library, ScryptTypeResolver, SymbolType, TypeInfo } from './scryptTypes';
import { basename, dirname } from 'path';


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
export const CURRENT_CONTRACT_DESCRIPTION_VERSION = 9;

export const SUPPORTED_MINIMUM_VERSION = 8;
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
  sources?: Array<string>; // deprecated
  sourceMap?: Array<string>; // deprecated
  sourceMapFile: string;
}

export type AsmVarValues = { [key: string]: string }
export type StepIndex = number;

export class AbstractContract {

  public static desc: ContractDescription;
  public static opcodes?: OpCode[];
  public static hex: string;
  public static abi: ABIEntity[];
  public static abiCoder: ABICoder;
  public static stateProps: Array<ParamEntity>;
  public static types: Record<string, typeof ScryptType>;
  public static asmContract: boolean;

  public static resolver: ScryptTypeResolver;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor(...ctorParams: SupportedParamType[]) {
  }

  [key: string]: any;

  scriptedConstructor: FunctionCall;
  calls: Map<string, FunctionCall> = new Map();
  hexTemplateInlineASM: Map<string, string> = new Map();
  hexTemplateArgs: Map<string, string> = new Map();
  statePropsArgs: Arguments = [];
  // If true, the contract will read the state from property, if false, the contract will read the state from preimage
  // A newly constructed contract always has this set to true, and after invocation, always has it set to false
  firstCall = true;

  get lockingScript(): Script {

    if (!this.dataPart) {
      return this.scriptedConstructor.lockingScript;
    }

    // append dataPart script to codePart if there is dataPart
    return this.codePart.add(this.dataPart);
  }

  private _txContext?: TxContext;

  set txContext(txContext: TxContext) {
    this._txContext = txContext;
  }

  get txContext(): TxContext {
    return this._txContext;
  }

  get sourceMapFile(): string {
    const desc = Object.getPrototypeOf(this).constructor.desc as ContractDescription;
    return desc.sourceMapFile;
  }

  get file(): string {
    const desc = Object.getPrototypeOf(this).constructor.desc as ContractDescription;
    return desc.file;
  }

  get contractName(): string {
    const desc = Object.getPrototypeOf(this).constructor.desc as ContractDescription;
    return desc.contract;
  }

  get stateProps(): ParamEntity[] {
    const desc = Object.getPrototypeOf(this).constructor.desc as ContractDescription;
    return desc.stateProps || [];
  }

  get version(): number {
    const desc = Object.getPrototypeOf(this).constructor.desc as ContractDescription;
    return desc.version || 0;
  }


  get resolver(): ScryptTypeResolver {
    return Object.getPrototypeOf(this).constructor.resolver as ScryptTypeResolver;
  }

  // replace assembly variables with assembly values
  replaceAsmVars(asmVarValues: AsmVarValues): void {

    if (asmVarValues) {
      for (const key in asmVarValues) {
        const val = asmVarValues[key];
        this.hexTemplateInlineASM.set(`<${key.startsWith('$') ? key.substring(1) : key}>`, bsv.Script.fromASM(val).toHex());
      }
    }

    const hexTemplate = Object.getPrototypeOf(this).constructor.hex;

    const lockingScript = buildContractCode(this.hexTemplateArgs, this.hexTemplateInlineASM, hexTemplate);

    this.scriptedConstructor.lockingScript = lockingScript;

  }

  // replace assembly variables with assembly values
  get asmArgs(): AsmVarValues {

    const result: AsmVarValues = {};

    for (const entry of this.hexTemplateInlineASM.entries()) {
      const name = entry[0].replace('<', '').replace('>', '');
      const value = entry[1];
      result[name] = bsv.Script.fromHex(value).toASM();
    }

    return result;
  }



  getTypeClassByType(type: string): typeof ScryptType {
    return this.resolver.resolverClass(type);
  }


  /**
   * @param states an object. Each key of the object is the name of a state property, and each value is the value of the state property.
   * @returns a locking script that includes the new states. If you only provide some but not all state properties, other state properties are not modified when calculating the locking script.
   */
  getNewStateScript(states: Record<string, SupportedParamType>): Script {

    const stateArgs = this.statePropsArgs;
    if (stateArgs.length === 0) {
      throw new Error(`Contract ${this.contractName} does not have any stateful property`);
    }

    const resolveKeys: string[] = [];
    const newState: Arguments = stateArgs.map(arg => {
      if (Object.prototype.hasOwnProperty.call(states, arg.name)) {
        resolveKeys.push(arg.name);
        const state = states[arg.name];
        const error = checkSupportedParamType(state, arg, this.resolver.resolverType);

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
        throw new Error(`Contract ${this.contractName} does not have stateful property ${key}`);
      }
    });

    return bsv.Script.fromHex(this.codePart.toHex() + buildContractState(newState, false, this.resolver.resolverType));
  }

  run_verify(unlockingScriptASM: string, txContext?: TxContext): VerifyResult {
    const txCtx: TxContext = Object.assign({}, this._txContext || {}, txContext || {});

    const us = unlockingScriptASM.trim() ? bsv.Script.fromASM(unlockingScriptASM.trim()) : new bsv.Script();
    const ls = this.lockingScript;
    const tx = txCtx.tx;
    const inputIndex = txCtx.inputIndex || 0;
    const inputSatoshis = txCtx.inputSatoshis || 0;


    bsv.Script.Interpreter.MAX_SCRIPT_ELEMENT_SIZE = Number.MAX_SAFE_INTEGER;
    bsv.Script.Interpreter.MAXIMUM_ELEMENT_SIZE = Number.MAX_SAFE_INTEGER;


    const bsi = bsv.Script.Interpreter();

    let lastfExecs: any = {};

    bsi.stepListener = function (step: any) {
      if (step.fExec || (bsv.Opcode.OP_IF <= step.opcode.toNumber() && step.opcode.toNumber() <= bsv.Opcode.OP_ENDIF)) {
        if ((bsv.Opcode.OP_IF <= step.opcode.toNumber() && step.opcode.toNumber() <= bsv.Opcode.OP_ENDIF) || step.opcode.toNumber() === bsv.Opcode.OP_RETURN) /**Opreturn */ {
          lastfExecs.opcode = step.opcode;
        } else {
          lastfExecs = step;
        }
      }
    };

    const result = bsi.verify(us, ls, tx, inputIndex, DEFAULT_FLAGS, new bsv.crypto.BN(inputSatoshis));
    if (result) {
      return {
        success: true,
        error: ''
      };
    }



    const failedOpCode: number = lastfExecs.opcode.toNumber();

    if ([bsv.Opcode.OP_CHECKSIG, bsv.Opcode.OP_CHECKSIGVERIFY, bsv.Opcode.OP_CHECKMULTISIG, bsv.Opcode.OP_CHECKMULTISIGVERIFY].includes(failedOpCode)) {
      if (!txCtx) {
        throw new Error('should provide txContext when verify');
      } if (!tx) {
        throw new Error('should provide txContext.tx when verify');
      }
    }


    let error = `VerifyError: ${bsi.errstr}, fails at ${new bsv.Opcode(failedOpCode)}\n`;

    if (this.sourceMapFile) {
      const sourceMapFilePath = uri2path(this.sourceMapFile);
      const sourceMap = JSONParserSync(sourceMapFilePath);

      const sourcePath = uri2path(this.file);

      const srcDir = dirname(sourcePath);
      const sourceFileName = basename(sourcePath);

      const sources = sourceMap.sources.map(source => getFullFilePath(source, srcDir, sourceFileName));

      const pos = findSrcInfoV2(lastfExecs.pc, sourceMap);

      if (pos && sources[pos[1]]) {
        error = `VerifyError: ${bsi.errstr} \n\t[Go to Source](${path2uri(sources[pos[1]])}#${pos[2]})  fails at ${new bsv.Opcode(failedOpCode)}\n`;
      }
    } else if (this.version === 8) {

      const desc = Object.getPrototypeOf(this).constructor.desc as ContractDescription;

      const sourceMap = loadSourceMapfromDesc(desc);


      if (sourceMap.length > 0) {
        // the complete script may have op_return and data, but compiled output does not have it. So we need to make sure the index is in boundary.

        const opcodeIndex = lastfExecs.pc;


        if (sourceMap[opcodeIndex]) {

          const opcode = sourceMap[opcodeIndex];

          if (!opcode.pos || opcode.pos.file === 'std') {

            const srcInfo = findSrcInfoV1(sourceMap, opcodeIndex);

            if (srcInfo) {
              opcode.pos = srcInfo.pos;
            }
          }

          // in vscode termianal need to use [:] to jump to file line, but here need to use [#] to jump to file line in output channel.
          if (opcode && opcode.pos) {
            error = `VerifyError: ${bsi.errstr} \n\t[Go to Source](${path2uri(opcode.pos.file)}#${opcode.pos.line})  fails at ${new bsv.Opcode(failedOpCode)}\n`;
          }
        }
      }
    }

    return {
      success: result,
      error: error
    };
  }

  private _dataPartInASM: string;
  private _dataPartInHex: string;

  set dataPart(dataInScript: Script | undefined) {
    throw new Error('Setter for dataPart is not available. Please use: setDataPart() instead');
  }

  get dataPart(): Script | undefined {

    if (AbstractContract.isStateful(this)) {
      const state = buildContractState(this.statePropsArgs, this.firstCall, this.resolver.resolverType);
      return bsv.Script.fromHex(state);
    }


    if (this._dataPartInASM) {
      return bsv.Script.fromASM(this._dataPartInASM);
    }

    if (this._dataPartInHex) {
      return bsv.Script.fromHex(this._dataPartInHex);
    }

  }

  setDataPart(state: State | string, isStateHex = false): void {
    if (isStateHex == false) {
      console.warn('deprecated, using setDataPartInASM');
      this.setDataPartInASM(state);
    } else {
      console.warn('deprecated, using setDataPartInHex');
      this.setDataPartInHex(state as string);
    }
  }

  setDataPartInASM(state: State | string): void {
    if (typeof state === 'string') {
      this._dataPartInASM = state.trim();
    } else {
      this._dataPartInASM = serializeState(state);
    }
  }

  setDataPartInHex(hex: string): void {
    this._dataPartInHex = hex.trim();
    if (AbstractContract.isStateful(this)) {
      const abiCoder = Object.getPrototypeOf(this).constructor.abiCoder as ABICoder;
      this.statePropsArgs = abiCoder.parseStateHex(this, this._dataPartInHex);
    }
  }

  get codePart(): Script {
    const lockingScript = this.scriptedConstructor.toScript();
    // note: do not trim the trailing space
    return new bsv.Script({ chunks: lockingScript.chunks.slice() }).add(bsv.Script.fromHex('6a'));
  }

  get codeHash(): string {
    if (this.dataPart) {
      return hash160(this.codePart.toHex());
    } else {
      return hash160(this.lockingScript.toHex());
    }
  }

  static getAsmVars(lockingScriptHex: string): AsmVarValues {
    const instance = this.fromHex(lockingScriptHex);
    return instance.asmArgs;
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
    return contract.stateProps.length > 0;
  }
}


const invalidMethodName = ['arguments',
  'setDataPart',
  'setDataPartInASM',
  'setDataPartInHex',
  'version',
  'stateProps',
  'sourceMapFile',
  'file',
  'contractName',
  'ctorArgs',
  'run_verify',
  'replaceAsmVars',
  'asmVars',
  'asmArguments',
  'dataPart',
  'lockingScript',
  'codeHash',
  'codePart',
  'resolver',
  'getTypeClassByType',
  'getNewStateScript',
  'txContext'];

export function buildContractClass(desc: ContractDescription | CompileResult): typeof AbstractContract {


  if (desc instanceof CompileResult) {
    desc = desc.toDesc();
  }

  if (!desc.contract) {
    throw new Error('missing field `contract` in description');
  }

  if (!desc.version) {
    throw new Error('missing field `version` in description');
  }

  if (desc.version < SUPPORTED_MINIMUM_VERSION) {
    throw new Error(`Contract description version deprecated, The minimum version number currently supported is ${SUPPORTED_MINIMUM_VERSION}`);
  }

  if (!desc.abi) {
    throw new Error('missing field `abi` in description');
  }

  if (!desc.hex) {
    throw new Error('missing field `hex` in description');
  }


  const ContractClass = class Contract extends AbstractContract {
    constructor(...ctorParams: SupportedParamType[]) {
      super();
      if (!Contract.asmContract) {
        this.scriptedConstructor = Contract.abiCoder.encodeConstructorCall(this, Contract.hex, ...ctorParams);
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
      obj.scriptedConstructor = Contract.abiCoder.encodeConstructorCallFromRawHex(obj, Contract.hex, hex);
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
      return ContractClass.getAsmVars(this.scriptedConstructor.toHex());
    }

    get asmArguments(): AsmVarValues | null {
      //TODO: @deprecate AbstractContract.getAsmVars , using asmArguments

      return null;
    }

  };

  ContractClass.desc = desc;
  ContractClass.resolver = buildScryptTypeResolver(desc);
  ContractClass.abi = desc.abi;
  ContractClass.hex = desc.hex;
  ContractClass.abiCoder = new ABICoder(desc.abi, ContractClass.resolver);
  ContractClass.types = buildTypeClasses(desc);
  ContractClass.stateProps = desc.stateProps || [];



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
export function buildStructsClass(desc: ContractDescription): Record<string, typeof Struct> {

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

export function buildLibraryClass(desc: ContractDescription): Record<string, typeof Library> {

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

export function buildTypeClasses(desc: ContractDescription | typeof AbstractContract): Record<string, typeof ScryptType> {

  if (Object.prototype.hasOwnProperty.call(desc, 'types')) {
    const CLASS = desc as typeof AbstractContract;
    return CLASS.types;
  }

  desc = desc as ContractDescription;

  const structClasses = buildStructsClass(desc);
  const libraryClasses = buildLibraryClass(desc);

  const allTypeClasses: Record<string, typeof ScryptType> = {};
  const alias: AliasEntity[] = desc.alias || [];

  const resolver = buildTypeResolverFromDesc(desc);
  alias.forEach(element => {
    const typeInfo = resolver(element.name);
    if (!isArrayType(typeInfo.finalType)) { //not need to build class type for array, we only build class type for array element
      if (typeInfo.symbolType === SymbolType.Struct) {
        const type = getNameByType(typeInfo.finalType);
        Object.assign(allTypeClasses, {
          [element.name]: class extends structClasses[type] {
            constructor(o: StructObject) {
              super(o);
              this._type = element.name;
              this._typeResolver = resolver;
            }
          }
        });
      } else {
        const C = BasicScryptType[typeInfo.finalType];
        if (C) {
          const aliasClass = class extends C {
            constructor(o: ValueType) {
              super(o);
              this._type = element.name;
              this._typeResolver = resolver;
            }
          };

          Object.assign(allTypeClasses, {
            [element.name]: aliasClass
          });
        } else {
          throw new Error(`can not resolve type alias ${element.name} ${element.type}`);
        }
      }
    }
  });

  Object.assign(allTypeClasses, structClasses);
  Object.assign(allTypeClasses, libraryClasses);
  Object.assign(allTypeClasses, BasicScryptType);

  return allTypeClasses;
}


export function buildTypeResolverFromDesc(desc: ContractDescription): TypeResolver {
  const alias: AliasEntity[] = desc.alias || [];
  const library: LibraryEntity[] = desc.library || [];
  const structs: StructEntity[] = desc.structs || [];
  const contract = desc.contract;
  return buildTypeResolver(contract, alias, structs, library);
}


// build a resolver witch can only resolve type
export function buildTypeResolver(contract: string, alias: AliasEntity[], structs: StructEntity[],
  library: LibraryEntity[], contracts: ContractEntity[] = [], statics: StaticEntity[] = []): TypeResolver {

  const resolvedTypes: Record<string, TypeInfo> = {};
  structs.forEach(element => {
    resolvedTypes[element.name] = {
      finalType: element.name,
      symbolType: SymbolType.Struct
    };
  });

  library.forEach(element => {
    resolvedTypes[element.name] = {
      finalType: element.name,
      symbolType: SymbolType.Library
    };
  });

  contracts.forEach(element => {
    resolvedTypes[element.name] = {
      finalType: element.name,
      symbolType: SymbolType.Contract
    };
  });

  // add std type

  resolvedTypes['HashedMap'] = {
    finalType: 'HashedMap',
    symbolType: SymbolType.Library
  };
  resolvedTypes['HashedSet'] = {
    finalType: 'HashedSet',
    symbolType: SymbolType.Library
  };

  resolvedTypes['SortedItem'] = {
    finalType: 'SortedItem',
    symbolType: SymbolType.Struct
  };

  resolvedTypes['PubKeyHash'] = {
    finalType: 'Ripemd160',
    symbolType: SymbolType.BaseType
  };

  alias.forEach(element => {
    resolvedTypes[element.name] = resolveType(element.name, resolvedTypes, contract, statics, alias, library);
  });




  const resolver = (type: string) => {

    if (resolvedTypes[type]) {
      return resolvedTypes[type];
    }

    if (BasicScryptType[type]) {
      return {
        finalType: type,
        symbolType: SymbolType.BaseType
      };
    }

    return resolveType(type, resolvedTypes, contract, statics, alias, library);
  };

  return resolver;
}

// build a resolver which can resolve type and ScryptType class
export function buildScryptTypeResolver(desc: ContractDescription): ScryptTypeResolver {
  const resolver = buildTypeResolverFromDesc(desc);
  const allTypes = buildTypeClasses(desc);

  return {
    resolverType: resolver,
    resolverClass: (type: string) => {
      const finalType = resolver(type).finalType;
      const typeName = getNameByType(finalType) ? getNameByType(finalType) : finalType;
      return allTypes[typeName];
    },
    allTypes: () => {
      return allTypes;
    }
  };
}

