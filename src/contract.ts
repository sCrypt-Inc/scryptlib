import { basename, dirname } from 'path';
import { ABIEntityType, Argument, LibraryEntity, ParamEntity, parseGenericType } from '.';
import { ContractEntity, getFullFilePath, loadSourceMapfromArtifact, OpCode, StaticEntity } from './compilerWrapper';
import {
  ABICoder, ABIEntity, AliasEntity, Arguments, bsv, buildContractCode, CompileResult, DEFAULT_FLAGS, findSrcInfoV1, findSrcInfoV2, FunctionCall, hash160, isArrayType, JSONParserSync, path2uri, resolveType, Script, StructEntity, subscript, TypeResolver, uri2path
} from './internal';
import { Bytes, Int, isScryptType, SupportedParamType, SymbolType, TypeInfo } from './scryptTypes';
import Stateful from './stateful';
import { arrayTypeAndSize, checkSupportedParamType, flatternArg, hasGeneric, subArrayType } from './typeCheck';


/**
 * TxContext provides some context information of the current transaction, 
 * needed only if signature is checked inside the contract.
 */
export interface TxContext {
  /** current transaction represented in bsv.Transaction object or hex string */
  tx: bsv.Transaction | string;
  /** input index */
  inputIndex: number;
  /** input amount in satoshis */
  inputSatoshis: number;
  /** contract state in ASM format */
  opReturn?: string;
  /** contract state in hex format */
  opReturnHex?: string;
}


export type VerifyError = string;

export type ContractClass = typeof AbstractContract;

export type Contract = AbstractContract;


export interface VerifyResult {
  success: boolean;
  error?: VerifyError;
}
export const CURRENT_CONTRACT_ARTIFACT_VERSION = 9;

export const SUPPORTED_MINIMUM_VERSION = 8;
export interface ContractArtifact {
  /** version of artifact file */
  version: number;
  /** version of compiler used to produce this file */
  compilerVersion: string;
  /** build type, can be debug or release */
  buildType: string;
  /** name of the contract */
  contract: string;
  /** md5 of the contract source code */
  md5: string;
  /** all stateful properties defined in the contracts */
  stateProps: Array<ParamEntity>;
  /** all structures defined in the contracts, including dependent contracts */
  structs: Array<StructEntity>;
  /** all library defined in the contracts, including dependent contracts */
  library: Array<LibraryEntity>;
  /** all typealias defined in the contracts, including dependent contracts */
  alias: Array<AliasEntity>
  /** ABI of the contract: interfaces of its public functions and constructor */
  abi: Array<ABIEntity>;
  /** @deprecated locking script of the contract in ASM format, including placeholders for constructor parameters */
  asm?: string;
  /** locking script of the contract in hex format, including placeholders for constructor parameters */
  hex: string;
  /** file uri of the main contract source code file */
  file: string;
  /** @deprecated **/
  sources?: Array<string>;
  /** @deprecated **/
  sourceMap?: Array<string>;
  /** file uri of source map file **/
  sourceMapFile: string;
}

export type AsmVarValues = { [key: string]: string }
export type StepIndex = number;


export class AbstractContract {

  public static artifact: ContractArtifact;
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
    const artifact = Object.getPrototypeOf(this).constructor.artifact as ContractArtifact;
    return artifact.sourceMapFile;
  }

  get file(): string {
    const artifact = Object.getPrototypeOf(this).constructor.artifact as ContractArtifact;
    return artifact.file;
  }

  get contractName(): string {
    const artifact = Object.getPrototypeOf(this).constructor.artifact as ContractArtifact;
    return artifact.contract;
  }

  get stateProps(): ParamEntity[] {
    const artifact = Object.getPrototypeOf(this).constructor.artifact as ContractArtifact;
    return artifact.stateProps || [];
  }

  get version(): number {
    const artifact = Object.getPrototypeOf(this).constructor.artifact as ContractArtifact;
    return artifact.version || 0;
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
        let state = states[arg.name];
        state = this.transformerArg(state, arg, true);
        const error = checkSupportedParamType(state, arg, this.resolver);

        if (error) {
          throw error;
        }

        return Object.assign(
          {
            ...arg
          },
          {
            value: state
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

    return this.codePart.add(bsv.Script.fromHex(Stateful.buildState(newState, false, this.resolver)));
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
    const tx = typeof txCtx.tx === 'string' ? new bsv.Transaction(txCtx.tx) : txCtx.tx;
    const inputIndex = txCtx.inputIndex;
    const inputSatoshis = txCtx.inputSatoshis;


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

  /**
   * format the error 
   * @param err the result output by  `tx.verifyInputScript(inputIndex)`
   * @returns string the formatted error message.
   */
  public fmtError(err: {
    error: string,
    failedAt: {
      fExec: boolean,
      opcode: number,
      pc: number
    },
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

      const artifact = Object.getPrototypeOf(this).constructor.artifact as ContractArtifact;

      const sourceMap = loadSourceMapfromArtifact(artifact);


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


  /**
   * Generate a debugger launch configuration for the contract's last called public method
   * @param txContext 
   * @returns a uri of the debugger launch configuration
   */
  public genLaunchConfig(txContext?: TxContext): string {

    const txCtx = Object.assign({}, this.txContext || {}, txContext || {}) as TxContext;

    const lastCalledPubFunction = this.lastCalledPubFunction();

    if (lastCalledPubFunction) {
      const debugUrl = lastCalledPubFunction.genLaunchConfig(txCtx);
      return `[Launch Debugger](${debugUrl.replace(/file:/i, 'scryptlaunch:')})\n`;
    }
    throw new Error('No public function called');
  }



  private _dataPartInHex: string;

  set dataPart(dataInScript: Script | undefined) {
    throw new Error('Setter for dataPart is not available. Please use: setDataPart() instead');
  }

  get dataPart(): Script | undefined {

    if (AbstractContract.isStateful(this)) {
      const state = Stateful.buildState(this.statePropsArgs, this.isGenesis, this.resolver);
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
      const [isGenesis, args] = Stateful.parseStateHex(this, this._dataPartInHex);
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
    return this.ContractClass.getAsmVars(this.scriptedConstructor.toHex());
  }

  get ContractClass(): typeof AbstractContract {
    return Object.getPrototypeOf(this).constructor;
  }


  private transformerArgs(args: SupportedParamType, params: ParamEntity[], state: boolean): SupportedParamType[] {
    return params.map((p, index) => this.transformerArg(args[index], p, state));
  }


  private transformerArg(arg: SupportedParamType, param: ParamEntity, state: boolean): SupportedParamType {

    const typeInfo = this.resolver(param.type);

    if (isArrayType(typeInfo.finalType)) {
      const [_, arraySizes] = arrayTypeAndSize(typeInfo.finalType);

      if (!Array.isArray(arg)) {
        return arg;
      }

      if (arg.length !== arraySizes[0]) {
        return arg;
      }

      const subType = subArrayType(param.type);

      const results = [] as SupportedParamType[];

      for (let i = 0; i < arraySizes[0]; i++) {
        const elem = arg[i];
        results.push(this.transformerArg(elem, {
          name: `${param.name}${subscript(i, arraySizes)}`,
          type: subType
        }, state));
      }

      return results;

    } else if (typeInfo.symbolType === SymbolType.Library) {

      const entity: LibraryEntity = typeInfo.info as LibraryEntity;

      if (entity.name === 'HashedMap') {
        if (arg instanceof Map) {
          if (state) {
            return {
              _data: this.ContractClass.toData(arg as Map<SupportedParamType, SupportedParamType>, param.type)
            };
          } else {
            return [this.ContractClass.toData(arg as Map<SupportedParamType, SupportedParamType>, param.type)];
          }
        }
      } else if (entity.name === 'HashedSet') {
        if (arg instanceof Set) {
          if (state) {
            return {
              _data: this.ContractClass.toData(arg as Set<SupportedParamType>, param.type)
            };
          } else {
            return [this.ContractClass.toData(arg as Set<SupportedParamType>, param.type)];
          }
        }
      }

      const params: ParamEntity[] = state ? entity.properties : entity.params;

      if (!state && Array.isArray(arg)) {
        return params.map((p, index) => {
          return this.transformerArg(arg[index], p, state);
        });
      } else if (state && typeof arg === 'object') {
        return params.reduce((acc: any, p: ParamEntity) => {

          Object.assign(acc, {
            [p.name]: this.transformerArg(arg[p.name], p, state)
          });
          return acc;
        }, {});
      }



    } else if (typeInfo.symbolType === SymbolType.Struct) {

      if (!Array.isArray(arg) && typeof arg === 'object') {
        const entity: StructEntity = typeInfo.info as StructEntity;

        if (entity.name === 'SortedItem') {
          if (arg['idx'] === Int(-1) && (arg['image'] instanceof Map || arg['image'] instanceof Set)) {

            const [_, genericTypes] = parseGenericType(typeInfo.finalType);
            return Object.assign({}, {
              idx: this.ContractClass.findKeyIndex(arg['image'], arg['item'], genericTypes[0]),
              item: arg['item']
            });
          }

          return arg;
        }

        const clone = Object.assign({}, arg);
        entity.params.forEach(property => {
          if (typeof arg[property.name] !== 'undefined') {
            clone[property.name] = this.transformerArg(arg[property.name], property, state);
          }
        });

        return clone;
      }


    } else if (typeof arg === 'number') {
      return BigInt(arg);
    }

    return arg;

  }


  public checkArgs(funname: string, params: ParamEntity[], ...args: SupportedParamType[]): SupportedParamType[] {

    if (args.length !== params.length) {
      throw new Error(`wrong number of arguments for '${this.contractName}.${funname}', expected ${params.length} but got ${args.length}`);
    }

    const args_ = this.transformerArgs(args, params, false);
    params.forEach((param, index) => {
      const arg = args_[index];
      const error = checkSupportedParamType(arg, param, this.resolver);
      if (error) throw error;
    });
    return args_;
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
      const hex = Stateful.serialize(flattened[0].value, flattened[0].type);

      return bsv.crypto.Hash.sha256(Buffer.from(hex, 'hex')).toString('hex');
    } else {
      const jointbytes = flattened.map(item => {
        const hex = Stateful.serialize(item.value, item.type);
        return bsv.crypto.Hash.sha256(Buffer.from(hex, 'hex')).toString('hex');
      }).join('');

      return bsv.crypto.Hash.sha256(Buffer.from(jointbytes, 'hex')).toString('hex');
    }
  }

  // sort the map by the result of flattenSha256 of the key
  private static sortmap(map: Map<SupportedParamType, SupportedParamType>, keyType: string): Map<SupportedParamType, SupportedParamType> {
    return new Map([...map.entries()].sort((a, b) => {
      return bsv.crypto.BN.fromSM(Buffer.from(this.flattenSha256(a[0], keyType), 'hex'), {
        endian: 'little'
      }).cmp(bsv.crypto.BN.fromSM(Buffer.from(this.flattenSha256(b[0], keyType), 'hex'), {
        endian: 'little'
      }));
    }));
  }

  // sort the set by the result of flattenSha256 of the key
  private static sortset(set: Set<SupportedParamType>, keyType: string): Set<SupportedParamType> {
    return new Set([...set.keys()].sort((a, b) => {
      return bsv.crypto.BN.fromSM(Buffer.from(this.flattenSha256(a, keyType), 'hex'), {
        endian: 'little'
      }).cmp(bsv.crypto.BN.fromSM(Buffer.from(this.flattenSha256(b, keyType), 'hex'), {
        endian: 'little'
      }));
    }));
  }


  private static sortkeys(keys: SupportedParamType[], keyType: string): SupportedParamType[] {
    return keys.sort((a, b) => {
      return bsv.crypto.BN.fromSM(Buffer.from(this.flattenSha256(a, keyType), 'hex'), {
        endian: 'little'
      }).cmp(bsv.crypto.BN.fromSM(Buffer.from(this.flattenSha256(b, keyType), 'hex'), {
        endian: 'little'
      }));
    });
  }


  // returns index of the HashedMap/HashedSet by the key
  static findKeyIndex(collection: Map<SupportedParamType, SupportedParamType> | Set<SupportedParamType>, key: SupportedParamType, keyType: string): bigint {

    const keys = [...collection.keys()];

    keys.push(key);

    const sortedKeys = this.sortkeys(keys, keyType);

    const index = sortedKeys.findIndex((entry) => {
      if (entry === key) {
        return true;
      }
      return false;
    });

    return BigInt(index);

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



export function buildContractClass(artifact: ContractArtifact | CompileResult): typeof AbstractContract {


  if (artifact instanceof CompileResult) {
    artifact = artifact.toArtifact();
  }

  if (!artifact.contract) {
    throw new Error('Missing field `contract` in artifact');
  }

  if (!artifact.version) {
    throw new Error('Missing field `version` in artifact');
  }

  if (artifact.version < SUPPORTED_MINIMUM_VERSION) {
    throw new Error(`Contract artifact version deprecated, The minimum version number currently supported is ${SUPPORTED_MINIMUM_VERSION}`);
  }

  if (!artifact.abi) {
    throw new Error('Missing field `abi` in artifact');
  }

  if (!artifact.hex) {
    throw new Error('Missing field `hex` in artifact');
  }


  const ContractClass = class extends AbstractContract {
    constructor(...ctorParams: SupportedParamType[]) {
      super();
      if (!ContractClass.asmContract) {
        this.scriptedConstructor = ContractClass.abiCoder.encodeConstructorCall(this, ContractClass.hex, ...ctorParams);
      }
    }

  };

  ContractClass.artifact = artifact;
  ContractClass.resolver = buildTypeResolverFromArtifact(artifact);
  ContractClass.abi = artifact.abi;
  ContractClass.hex = artifact.hex;
  ContractClass.abiCoder = new ABICoder(artifact.abi, ContractClass.resolver, artifact.contract);
  ContractClass.stateProps = artifact.stateProps || [];



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

          value = this.transformerArg(value, arg, true);

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





export function buildTypeResolverFromArtifact(artifact: ContractArtifact): TypeResolver {
  const alias: AliasEntity[] = artifact.alias || [];
  const library: LibraryEntity[] = artifact.library || [];
  const structs: StructEntity[] = artifact.structs || [];
  const contract = artifact.contract;
  return buildTypeResolver(contract, alias, structs, library);
}


// build a resolver witch can only resolve type
export function buildTypeResolver(contract: string, alias: AliasEntity[], structs: StructEntity[],
  library: LibraryEntity[], contracts: ContractEntity[] = [], statics: StaticEntity[] = []): TypeResolver {

  const resolvedTypes: Record<string, TypeInfo> = {};
  structs.forEach(element => {
    resolvedTypes[element.name] = {
      info: element,
      generic: hasGeneric(element),
      finalType: element.name,
      symbolType: SymbolType.Struct
    };
  });

  library.forEach(element => {
    resolvedTypes[element.name] = {
      info: element,
      generic: hasGeneric(element),
      finalType: element.name,
      symbolType: SymbolType.Library
    };
  });

  contracts.forEach(element => {
    resolvedTypes[element.name] = {
      info: element,
      generic: hasGeneric(element),
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
    generic: false,
    symbolType: SymbolType.ScryptType
  };




  const resolver = (type: string): TypeInfo => {

    if (resolvedTypes[type]) {
      return resolvedTypes[type];
    }

    if (isScryptType(type)) {
      return {
        generic: false,
        finalType: type,
        symbolType: SymbolType.ScryptType
      };
    }

    return resolveType(type, resolvedTypes, contract, statics, alias, library);
  };

  return resolver;
}

