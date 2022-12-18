import { ABIEntityType, Argument, LibraryEntity, ParamEntity, parseGenericType, parseStateHex } from '.';
import { ContractEntity, getFullFilePath, loadSourceMapfromDesc, OpCode, StaticEntity } from './compilerWrapper';
import {
  ABICoder, Arguments, FunctionCall, Script, bsv, DEFAULT_FLAGS, resolveType, path2uri, TypeResolver,
  StructEntity, ABIEntity, CompileResult, AliasEntity, buildContractState, hash160, buildContractCode, JSONParserSync, uri2path, findSrcInfoV2, findSrcInfoV1
} from './internal';
import { SymbolType, TypeInfo, SupportedParamType, HashedMap, HashedSet, Bytes } from './scryptTypes';
import { basename, dirname } from 'path';
import { checkSupportedParamType, flatternArg, isBaseType } from './typeCheck';
import Stateful from './stateful';


export interface TxContext {
  tx: bsv.Transaction;
  inputIndex?: number;
  /**
   * @deprecated no need any more
   */
  inputSatoshis?: number;
  opReturn?: string;
  opReturnHex?: string;
}


export type VerifyError = string;

export type ContractClass = typeof AbstractContract;

export type Contract = AbstractContract;


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
  public static asmContract: boolean;

  public static resolver: TypeResolver;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor(...ctorParams: SupportedParamType[]) {
  }

  [key: string]: any;


  scriptedConstructor: FunctionCall;
  private calledPubFunctions: Array<FunctionCall> = [];
  hexTemplateInlineASM: Map<string, string> = new Map();
  hexTemplateArgs: Map<string, string> = new Map();
  statePropsArgs: Arguments = [];
  // If true, the contract will read the state from property, if false, the contract will read the state from preimage
  // A newly constructed contract always has this set to true, and after invocation, always has it set to false
  isGenesis = true;

  get lockingScript(): Script {

    if (!this.dataPart) {
      return this.scriptedConstructor?.lockingScript as Script;
    }

    // append dataPart script to codePart if there is dataPart
    return this.codePart.add(this.dataPart);
  }

  private _txContext?: TxContext;

  set txContext(txContext: TxContext | undefined) {
    this._txContext = txContext;
  }

  get txContext(): TxContext | undefined {
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

  addFunctionCall(f: FunctionCall): void {
    this.calledPubFunctions.push(f);
  }


  get resolver(): TypeResolver {
    return Object.getPrototypeOf(this).constructor.resolver as TypeResolver;
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
        const error = checkSupportedParamType(state, arg, this.resolver);

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

    return this.codePart.add(bsv.Script.fromHex(buildContractState(newState, false, this.resolver)));
  }

  run_verify(unlockingScript: bsv.Script | string | undefined, txContext?: TxContext): VerifyResult {
    const txCtx = Object.assign({}, this._txContext || {}, txContext || {}) as TxContext;
    let us;
    if (typeof unlockingScript === 'string') {
      us = unlockingScript.trim() ? bsv.Script.fromASM(unlockingScript.trim()) : new bsv.Script('');
    } else {
      us = unlockingScript ? unlockingScript : new bsv.Script('');
    }

    const ls = bsv.Script.fromHex(this.lockingScript.toHex());
    const tx = txCtx.tx;
    const inputIndex = txCtx.inputIndex || 0;
    const inputSatoshis = txCtx.inputSatoshis || (tx ? tx.getInputAmount(inputIndex) : 0);


    bsv.Script.Interpreter.MAX_SCRIPT_ELEMENT_SIZE = Number.MAX_SAFE_INTEGER;
    bsv.Script.Interpreter.MAXIMUM_ELEMENT_SIZE = Number.MAX_SAFE_INTEGER;


    const bsi = new bsv.Script.Interpreter();

    let failedAt: any = {};

    bsi.stepListener = function (step: any) {
      if (step.fExec || (bsv.Opcode.OP_IF <= step.opcode.toNumber() && step.opcode.toNumber() <= bsv.Opcode.OP_ENDIF)) {
        if ((bsv.Opcode.OP_IF <= step.opcode.toNumber() && step.opcode.toNumber() <= bsv.Opcode.OP_ENDIF) || step.opcode.toNumber() === bsv.Opcode.OP_RETURN) /**Opreturn */ {
          failedAt.opcode = step.opcode;
        } else {
          failedAt = step;
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

    if ((bsi.errstr || '').indexOf('SCRIPT_ERR_NULLFAIL') > -1) {
      if (!txCtx) {
        throw new Error('should provide txContext when verify');
      } if (!tx) {
        throw new Error('should provide txContext.tx when verify');
      }
    }


    failedAt.opcode = failedAt.opcode.toNumber();

    return {
      success: result,
      error: this.fmtError({
        error: bsi.errstr || '',
        failedAt
      })
    };
  }

  private fmtError(err: {
    error: string,
    failedAt: any,
  }): string {
    const failedOpCode: number = err.failedAt.opcode;

    let error = `VerifyError: ${err.error}, fails at ${new bsv.Opcode(failedOpCode)}\n`;

    if (this.sourceMapFile) {
      const sourceMapFilePath = uri2path(this.sourceMapFile);
      const sourceMap = JSONParserSync(sourceMapFilePath);

      const sourcePath = uri2path(this.file);

      const srcDir = dirname(sourcePath);
      const sourceFileName = basename(sourcePath);

      const sources = sourceMap.sources.map((source: string) => getFullFilePath(source, srcDir, sourceFileName));

      const pos = findSrcInfoV2(err.failedAt.pc, sourceMap);

      if (pos && sources[pos[1]]) {
        error = `VerifyError: ${err.error} \n\t[Go to Source](${path2uri(sources[pos[1]])}#${pos[2]})  fails at ${new bsv.Opcode(failedOpCode)}\n`;
      }
    } else if (this.version <= 8) {

      const desc = Object.getPrototypeOf(this).constructor.desc as ContractDescription;

      const sourceMap = loadSourceMapfromDesc(desc);


      if (sourceMap.length > 0) {
        // the complete script may have op_return and data, but compiled output does not have it. So we need to make sure the index is in boundary.

        const opcodeIndex = err.failedAt.pc;


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
            error = `VerifyError: ${err.error} \n\t[Go to Source](${path2uri(opcode.pos.file)}#${opcode.pos.line})  fails at ${new bsv.Opcode(failedOpCode)}\n`;
          }
        }
      }
    }
    return error;
  }


  public genLaunchConfig(err: {
    error: string,
    failedAt: any,
  }, tx: bsv.Transaction, index?: number): string {

    let error = this.fmtError(err);

    const lastCalledPubFunction = this.lastCalledPubFunction();

    const inputIndex = index || 0;

    if (lastCalledPubFunction) {
      const debugUrl = lastCalledPubFunction.genLaunchConfig({
        tx,
        inputIndex
      });
      error = error + `\t[Launch Debugger](${debugUrl.replace(/file:/i, 'scryptlaunch:')})\n`;
    }

    return error;

  }



  private _dataPartInHex: string;

  set dataPart(dataInScript: Script | undefined) {
    throw new Error('Setter for dataPart is not available. Please use: setDataPart() instead');
  }

  get dataPart(): Script | undefined {

    if (AbstractContract.isStateful(this)) {
      const state = buildContractState(this.statePropsArgs, this.isGenesis, this.resolver);
      return bsv.Script.fromHex(state);
    }

    if (this._dataPartInHex) {
      return bsv.Script.fromHex(this._dataPartInHex);
    }

  }

  /**
 * @deprecated use setDataPartInASM setDataPartInHex 
 * set the data part of the contract
 * @param state 
 * @param isStateHex 
 */
  setDataPart(state: string, isStateHex = false): void {
    if (isStateHex == false) {
      console.warn('deprecated, using setDataPartInASM');
      this.setDataPartInASM(state);
    } else {
      console.warn('deprecated, using setDataPartInHex');
      this.setDataPartInHex(state as string);
    }
  }

  /**
 * set the data part of the contract in ASM format
 * @param asm 
 * @param  
 */
  setDataPartInASM(asm: string): void {
    if (AbstractContract.isStateful(this)) {
      throw new Error('should not use `setDataPartInASM` for a stateful contract, using `setDataPartInHex`');
    }
    const dataPartInASM = asm.trim();
    this.setDataPartInHex(bsv.Script.fromASM(dataPartInASM).toHex());
  }

  /**
 * set the data part of the contract in hex format
 * @param hex 
 */
  setDataPartInHex(hex: string): void {
    this._dataPartInHex = hex.trim();
    if (AbstractContract.isStateful(this)) {
      const [isGenesis, args] = parseStateHex(this, this._dataPartInHex);
      this.statePropsArgs = args;
      this.isGenesis = isGenesis;
    }
  }

  get codePart(): Script {
    const lockingScript = this.scriptedConstructor.toScript();
    // note: do not trim the trailing space
    return lockingScript.clone().add(bsv.Script.fromHex('6a'));
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

    for (let i = this.calledPubFunctions.length - 1; i >= 0; i--) {
      const called = this.calledPubFunctions[i];
      if (called.methodName === pubFuncName) {
        return called.args;
      }
    }

    return [];
  }

  private lastCalledPubFunction(): FunctionCall | undefined {

    const index = this.calledPubFunctions.length - 1;

    if (index < 0) {
      return undefined;
    }

    return this.calledPubFunctions[index];
  }

  public ctorArgs(): Arguments {
    return this.arguments('constructor');
  }


  /**
     * Get the parameter of the constructor and inline asm vars,
     * all values is hex string, need convert it to number or bytes on using
     */
  get asmVars(): AsmVarValues | null {
    const ContractClass = Object.getPrototypeOf(this).constructor as typeof AbstractContract;
    return ContractClass.getAsmVars(this.scriptedConstructor.toHex());
  }

  public checkArgs(funname: string, params: ParamEntity[], ...args: SupportedParamType[]): void {

    if (args.length !== params.length) {
      throw new Error(`wrong number of arguments for '${this.contractName}.${funname}', expected ${params.length} but got ${args.length}`);
    }
    params.forEach((param, index) => {
      const arg = args[index];
      const error = checkSupportedParamType(arg, param, this.resolver);
      if (error) throw error;
    });
  }



  static fromASM(asm: string): AbstractContract {
    return this.fromHex(bsv.Script.fromASM(asm).toHex());
  }

  static fromHex(hex: string): AbstractContract {
    this.asmContract = true;
    const ctor = this as unknown as new () => AbstractContract;
    const obj = new ctor();
    this.asmContract = false;
    obj.scriptedConstructor = this.abiCoder.encodeConstructorCallFromRawHex(obj, this.hex, hex);
    return obj;
  }


  static fromTransaction(hex: string, outputIndex = 0): AbstractContract {
    const tx = new bsv.Transaction(hex);
    return this.fromHex(tx.outputs[outputIndex].script.toHex());
  }

  static isStateful(contract: AbstractContract): boolean {
    return contract.stateProps.length > 0;
  }




  // struct / array: sha256 every single element of the flattened struct / array, and concat the result to a joint byte, and sha256 again 
  // basic type: sha256 every single element
  static flattenSha256(data: SupportedParamType, type: string): string {

    const error = checkSupportedParamType(data, {
      name: '',
      type: type
    }, this.resolver);
    if (error) throw error;

    const flattened = flatternArg({
      name: '',
      type: type,
      value: data
    }, this.resolver, {
      state: true,
      ignoreValue: false
    });
    if (flattened.length === 1) {
      const hex = Stateful.serialize(flattened[0].value);

      return bsv.crypto.Hash.sha256(Buffer.from(hex, 'hex')).toString('hex');
    } else {
      const jointbytes = flattened.map(item => {
        const hex = Stateful.serialize(item.value);
        return bsv.crypto.Hash.sha256(Buffer.from(hex, 'hex')).toString('hex');
      }).join('');

      return bsv.crypto.Hash.sha256(Buffer.from(jointbytes, 'hex')).toString('hex');
    }
  }

  // sort the map by the result of flattenSha256 of the key
  static sortmap(map: Map<SupportedParamType, SupportedParamType>, keyType: string): Map<SupportedParamType, SupportedParamType> {
    return new Map([...map.entries()].sort((a, b) => {
      return bsv.crypto.BN.fromSM(Buffer.from(this.flattenSha256(a[0], keyType), 'hex'), {
        endian: 'little'
      }).cmp(bsv.crypto.BN.fromSM(Buffer.from(this.flattenSha256(b[0], keyType), 'hex'), {
        endian: 'little'
      }));
    }));
  }

  // sort the set by the result of flattenSha256 of the key
  static sortset(set: Set<SupportedParamType>, keyType: string): Set<SupportedParamType> {
    return new Set([...set.keys()].sort((a, b) => {
      return bsv.crypto.BN.fromSM(Buffer.from(this.flattenSha256(a, keyType), 'hex'), {
        endian: 'little'
      }).cmp(bsv.crypto.BN.fromSM(Buffer.from(this.flattenSha256(b, keyType), 'hex'), {
        endian: 'little'
      }));
    }));
  }


  // returns index of the HashedMap/HashedSet by the key
  static findKeyIndex(collection: Map<SupportedParamType, SupportedParamType> | Set<SupportedParamType>, key: SupportedParamType, keyType: string): bigint {

    if (collection instanceof Map) {
      const sortedMap = this.sortmap(collection, keyType);
      const m = [];

      for (const entry of sortedMap.entries()) {
        m.push(entry);
      }

      const index = m.findIndex((entry) => {
        if (entry[0] === key) {
          return true;
        }
        return false;
      });

      if (index < 0) {
        throw new Error(`findKeyIndex fail, key: ${key} not found`);
      }

      return BigInt(index);
    } else {

      const sortedSet = this.sortset(collection, keyType);
      const m = [];

      for (const entry of sortedSet.keys()) {
        m.push(entry);
      }

      const index = m.findIndex((entry) => {
        if (entry === key) {
          return true;
        }
        return false;
      });

      if (index < 0) {
        throw new Error(`findKeyIndex fail, key: ${key} not found`);
      }

      return BigInt(index);
    }

  }


  //serialize the HashedMap / HashedSet, but only flattenSha256 of the key and value
  static toData(collection: Map<SupportedParamType, SupportedParamType> | Set<SupportedParamType>, collectionType: string): Bytes {

    const [name, genericTypes] = parseGenericType(collectionType);
    let storage = '';
    if (collection instanceof Map) {
      const sortedMap = this.sortmap(collection, genericTypes[0]);

      for (const entry of sortedMap.entries()) {
        storage += this.flattenSha256(entry[0], genericTypes[0]) + this.flattenSha256(entry[1], genericTypes[1]);
      }
    } else {
      const sortedSet = this.sortset(collection, genericTypes[0]);
      for (const key of sortedSet.keys()) {
        storage += this.flattenSha256(key, genericTypes[0]);
      }
    }

    return Bytes(storage);
  }

  static toHashedMap(collection: Map<SupportedParamType, SupportedParamType>, collectionType: string): HashedMap {
    const data = this.toData(collection, collectionType);
    const hashedMap = HashedMap(data);

    return hashedMap;
  }

  static toHashedSet(collection: Set<SupportedParamType>, collectionType: string): HashedSet {
    const data = this.toData(collection, collectionType);
    const hashedSet = HashedSet(data);
    return hashedSet;
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


  const ContractClass = class extends AbstractContract {
    constructor(...ctorParams: SupportedParamType[]) {
      super();
      if (!ContractClass.asmContract) {
        this.scriptedConstructor = ContractClass.abiCoder.encodeConstructorCall(this, ContractClass.hex, ...ctorParams);
      }
    }

  };

  ContractClass.desc = desc;
  ContractClass.resolver = buildTypeResolverFromDesc(desc);
  ContractClass.abi = desc.abi;
  ContractClass.hex = desc.hex;
  ContractClass.abiCoder = new ABICoder(desc.abi, ContractClass.resolver);
  ContractClass.stateProps = desc.stateProps || [];



  ContractClass.abi.forEach((entity: ABIEntity) => {
    if (entity.type === ABIEntityType.CONSTRUCTOR) {
      return;
    }
    if (!entity.name || invalidMethodName.indexOf(entity.name) > -1) {
      throw new Error(`Method name [${entity.name}] is used by scryptlib now, Pelease change you contract method name!`);
    }

    ContractClass.prototype[entity.name] = function (...args: SupportedParamType[]): FunctionCall {
      const call = ContractClass.abiCoder.encodePubFunctionCall(this, entity.name || '', args);
      this.addFunctionCall(call);
      return call;
    };

  });

  ContractClass.stateProps.forEach(p => {

    Object.defineProperty(ContractClass.prototype, p.name, {
      get() {
        const arg = this.statePropsArgs.find((arg: Argument) => {
          return arg.name === p.name;
        }) as Argument | undefined;

        if (arg) {
          return arg.value;
        } else {
          throw new Error(`property ${p.name} does not exists`);
        }
      },
      set(value: SupportedParamType) {

        const arg = this.statePropsArgs.find((arg: Argument) => {
          return arg.name === p.name;
        }) as Argument | undefined;

        if (arg) {

          const error = checkSupportedParamType(value, arg, this.resolver);
          if (error) throw error;

          arg.value = value;
          this.isGenesis = false;
        } else {
          throw new Error(`property ${p.name} does not exists`);
        }
      }
    });
  });

  return ContractClass;

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
      info: element,
      finalType: element.name,
      symbolType: SymbolType.Struct
    };
  });

  library.forEach(element => {
    resolvedTypes[element.name] = {
      info: element,
      finalType: element.name,
      symbolType: SymbolType.Library
    };
  });

  contracts.forEach(element => {
    resolvedTypes[element.name] = {
      info: element,
      finalType: element.name,
      symbolType: SymbolType.Contract
    };
  });

  // add std type

  resolvedTypes['HashedMap'] = {
    info: {
      name: 'HashedMap',
      params: [
        {
          name: '_data',
          type: 'bytes'
        }
      ],
      properties: [
        {
          name: '_data',
          type: 'bytes'
        }
      ],
      genericTypes: ['K', 'V']
    },
    generic: true,
    finalType: 'HashedMap',
    symbolType: SymbolType.Library
  };
  resolvedTypes['HashedSet'] = {
    info: {
      name: 'HashedSet',
      params: [
        {
          name: '_data',
          type: 'bytes'
        }
      ],
      properties: [
        {
          name: '_data',
          type: 'bytes'
        }
      ],
      genericTypes: ['E']
    },
    generic: true,
    finalType: 'HashedSet',
    symbolType: SymbolType.Library
  };

  resolvedTypes['SortedItem'] = {
    info: {
      name: 'SortedItem',
      params: [
        {
          name: 'item',
          type: 'T'
        },
        {
          name: 'idx',
          type: 'int'
        }
      ],
      genericTypes: ['T']
    },
    generic: true,
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

    if (isBaseType(type)) {
      return {
        finalType: type,
        symbolType: SymbolType.BaseType
      };
    }

    return resolveType(type, resolvedTypes, contract, statics, alias, library);
  };

  return resolver;
}

