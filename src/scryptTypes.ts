import {
  parseLiteral, getValidatedHexString, LibraryEntity, intValue2hex, flatternStruct, typeOfArg, isInteger, StructEntity, bsv, checkStructField,
  checkStruct, toScryptType, inferrType, checkSupportedParamType, toGenericType, typeNameOfArg, parseGenericType, resolveGenericType, librarySign,
  isGenericType,
  flatternLibrary,
  arrayToLiteral,
  arrayToScryptType,
  cloneArray,
  canAssignProperty,
  toHex
} from './internal';
import { serialize, serializeInt } from './serializer';


// A type resolver that can resolve type aliases to final types
export type TypeResolver = (type: string) => string;

export type ValueType = RawTypes | StructObject | ValueType[];


export interface ScryptTypeResolver {
  resolverType: (type: string) => string;
  resolverClass: (type: string) => typeof ScryptType;
  allTypes: () => Record<string, typeof ScryptType>;
}


export class ScryptType {

  protected _value: ValueType;
  protected _literal: string;
  protected _asm: string;
  protected _type: string;
  protected _typeResolver: TypeResolver;

  [key: string]: any;

  constructor(...value: ValueType[]) {
    try {
      this._value = this.checkValue(value);
      this._literal = this.toLiteral();
      const [asm, _, scrType] = parseLiteral(this._literal);
      this._type = scrType;
      this._asm = asm;
    } catch (error) {
      throw new Error(`can't construct ${this.constructor.name} from <${value}>, ${error.message}`);
    }
  }

  get value(): ValueType {
    return this._value;
  }

  get finalType(): string {
    if (this._typeResolver)
      return this._typeResolver(this.type);
    return this.type;
  }

  get literal(): string {
    return this._literal;
  }

  get type(): string {
    return this._type;
  }

  toASM(): string {
    return this._asm;
  }

  toHex(): string {
    return this.serialize();
  }

  toString(format: string): string {
    if (format === 'hex') {
      return this.toHex();
    }
    return this.toLiteral();
  }

  toJSON(): string | unknown {
    return this.toLiteral();
  }

  toLiteral(): string {
    return '';
  }

  checkValue(value: ValueType[]): ValueType {
    if (typeof value === 'undefined') {
      throw new Error('constructor argument undefined');
    }

    if (value.length !== 1) {
      throw new Error('constructor argument undefined');
    }

    return value[0];
  }

  public equals(obj: ScryptType): boolean {
    return obj.finalType === this.finalType && obj.toASM() === this.toASM();
  }

  public serialize(): string {
    return '';
  }



  clone(): ScryptType {
    return Object.assign(Object.create(this), {
      _value: this.value
    });
  }
}

export class Int extends ScryptType {
  constructor(intVal: number | bigint | string) {
    super(intVal);
  }
  toLiteral(): string {
    return this._value.toString();
  }
  checkValue(value: ValueType[]): ValueType {
    super.checkValue(value);
    if (!isInteger(value[0])) {
      throw new Error('Only supports integers, should use integer number, bigint, hex string or decimal string: ' + value[0]);
    }

    if (typeof value[0] == 'number' && !isNaN(value[0])) {

      if (!Number.isSafeInteger(value[0])) {
        throw new Error(`<${value[0]}> is not safe integer, should use bigint, hex string or decimal string`);
      }
    }

    return value[0];
  }

  toJSON(): string | unknown {
    return this.value;
  }
  public serialize(): string {
    return serializeInt(this.value as string);
  }

}

export class Bool extends ScryptType {
  constructor(boolVal: boolean) {
    super(boolVal);
  }
  toLiteral(): string {
    return this._value.toString();
  }

  public serialize(): string {
    return this.value ? '01' : '00';
  }
}

export class Bytes extends ScryptType {
  constructor(bytesVal: string) {
    super(bytesVal);
  }
  toLiteral(): string {
    return `b'${getValidatedHexString(this._value.toString())}'`;
  }

  public serialize(): string {
    return serialize(this.value as string);
  }
}



export class String extends Bytes {

  constructor(val: string) {
    super(String.toUtf8Hex(val));
  }

  static toUtf8Hex(val: string) {
    const encoder = new TextEncoder();
    const uint8array = encoder.encode(val);
    return toHex(Buffer.from(uint8array));
  }

  static fromUtf8Hex(hex: string) {
    const utf8decoder = new TextDecoder();
    return utf8decoder.decode(Buffer.from(hex, 'hex'));
  }

  toLiteral(): string {
    return `"${this.show()}"`;
  }

  show(): string {
    const hex = this.value as string;
    return String.fromUtf8Hex(hex);
  }
}

export class PrivKey extends Int {
  constructor(intVal: bigint | string | number) {
    super(intVal);
  }
  toLiteral(): string {
    if (typeof this._value === 'string') {
      return `PrivKey(${this._value})`;
    } else {
      const v = this._value as bigint;
      return `PrivKey(0x${intValue2hex(v)})`;
    }
  }

  toJSON(): string | unknown {
    return this.toLiteral();
  }

  public serialize(): string {
    return serializeInt(this.value as string);
  }
}

export class PubKey extends ScryptType {
  constructor(bytesVal: string) {
    super(bytesVal);
  }
  toLiteral(): string {
    return `PubKey(b'${getValidatedHexString(this._value.toString())}')`;
  }

  public serialize(): string {
    return serialize(this.value as string);
  }
}

export class Sig extends ScryptType {
  constructor(bytesVal: string) {
    super(bytesVal);
  }
  toLiteral(): string {
    return `Sig(b'${getValidatedHexString(this._value.toString())}')`;
  }

  public serialize(): string {
    return serialize(this.value as string);
  }
}

export class Ripemd160 extends ScryptType {
  constructor(bytesVal: string) {
    super(bytesVal);
  }
  toLiteral(): string {
    return `Ripemd160(b'${getValidatedHexString(this._value.toString())}')`;
  }

  public serialize(): string {
    return serialize(this.value as string);
  }
}


export class PubKeyHash extends Ripemd160 {

}


export class Sha1 extends ScryptType {
  constructor(bytesVal: string) {
    super(bytesVal);
  }
  toLiteral(): string {
    return `Sha1(b'${getValidatedHexString(this._value.toString())}')`;
  }

  public serialize(): string {
    return serialize(this.value as string);
  }
}

export class Sha256 extends ScryptType {
  constructor(bytesVal: string) {
    super(bytesVal);
  }
  toLiteral(): string {
    return `Sha256(b'${getValidatedHexString(this._value.toString())}')`;
  }

  public serialize(): string {
    return serialize(this.value as string);
  }
}

export enum SigHash {
  ALL = 0x01,
  NONE = 0x02,
  SINGLE = 0x03,
  FORKID = 0x40,
  ANYONECANPAY = 0x80,
  ALL_FORKID = ALL | FORKID,
  SINGLE_FORKID = SINGLE | FORKID,
  NONE_FORKID = NONE | FORKID,
  ANYONECANPAY_ALL_FORKID = ANYONECANPAY | ALL | FORKID,
  ANYONECANPAY_SINGLE_FORKID = ANYONECANPAY | SINGLE | FORKID,
  ANYONECANPAY_NONE_FORKID = ANYONECANPAY | NONE | FORKID,
}

export class SigHashType extends ScryptType {

  constructor(intVal: number) {
    super(intVal);
  }

  toLiteral(): string {
    let hexStr = this._value.toString(16);
    if (hexStr.length % 2) {
      hexStr = '0' + hexStr;
    }
    return `SigHashType(b'${hexStr}')`;
  }

  public serialize(): string {
    return serialize(this.value as number);
  }

  toString(): string {
    const types: string[] = [];
    let value = this._value as number;

    if ((value & SigHash.ANYONECANPAY) === SigHash.ANYONECANPAY) {
      types.push('SigHash.ANYONECANPAY');
      value = value - SigHash.ANYONECANPAY;
    }

    if ((value & SigHash.SINGLE) === SigHash.SINGLE) {
      types.push('SigHash.SINGLE');
      value = value - SigHash.SINGLE;
    }

    if ((value & SigHash.NONE) === SigHash.NONE) {
      types.push('SigHash.NONE');
      value = value - SigHash.NONE;
    }

    if ((value & SigHash.ALL) === SigHash.ALL) {
      types.push('SigHash.ALL');
      value = value - SigHash.ALL;
    }

    if ((value & SigHash.FORKID) === SigHash.FORKID) {
      types.push('SigHash.FORKID');
      value = value - SigHash.FORKID;
    }

    if (value === 0) {
      return types.join(' | ');
    }

    throw new Error(`unknown sighash type value: ${this._value}`);
  }

}

interface Outpoint { hash: string, index: number, hex: string }

export class SigHashPreimage extends ScryptType {

  constructor(bytesVal: string) {
    super(bytesVal);
    this._buf = Buffer.from(bytesVal, 'hex');
  }

  // raw data
  private _buf: Buffer;

  private getReader(buf: Buffer) {
    return new bsv.encoding.BufferReader(buf);
  }

  // nVersion of the transaction
  get nVersion(): number {
    return this.getReader(this._buf.slice(0, 4)).readUInt32LE();
  }

  // hashPrevouts
  get hashPrevouts(): string {
    return this._buf.slice(4, 4 + 32).toString('hex');
  }

  // hashSequence
  get hashSequence(): string {
    return this._buf.slice(36, 36 + 32).toString('hex');
  }

  // outpoint
  get outpoint(): Outpoint {
    const buf = this._buf.slice(68, 68 + 32 + 4);
    const hex = buf.toString('hex');
    const index = this.getReader(buf.slice(32, 32 + 4)).readUInt32LE();
    const hash = Buffer.from(buf.slice(0, 32)).reverse().toString('hex');
    return {
      hash,
      index,
      hex
    };
  }

  // scriptCode of the input
  get scriptCode(): string {
    return this.getReader(this._buf.slice(104, this._buf.length - 52)).readVarLengthBuffer().toString('hex');
  }

  // value of the output spent by this input
  get amount(): number {
    return this.getReader(this._buf.slice(this._buf.length - 44 - 8, this._buf.length - 44)).readUInt32LE();
  }

  // nSequence of the input
  get nSequence(): number {
    return this.getReader(this._buf.slice(this._buf.length - 40 - 4, this._buf.length - 40)).readUInt32LE();
  }

  // hashOutputs
  get hashOutputs(): string {
    return this._buf.slice(this._buf.length - 8 - 32, this._buf.length - 8).toString('hex');
  }

  // nLocktime of the transaction
  get nLocktime(): number {
    return this.getReader(this._buf.slice(this._buf.length - 4 - 4, this._buf.length - 4)).readUInt32LE();
  }

  // sighash type of the signature
  get sighashType(): number {
    return this.getReader(this._buf.slice(this._buf.length - 4, this._buf.length)).readUInt32LE();
  }

  toString(format = 'hex'): string {
    return this._buf.toString(format);
  }

  toLiteral(): string {
    return `SigHashPreimage(b'${getValidatedHexString(this._value.toString())}')`;
  }

  toJSONObject() {
    return {
      nVersion: this.nVersion,
      hashPrevouts: this.hashPrevouts,
      hashSequence: this.hashSequence,
      outpoint: this.outpoint,
      scriptCode: this.scriptCode,
      amount: this.amount,
      nSequence: this.nSequence,
      hashOutputs: this.hashOutputs,
      nLocktime: this.nLocktime,
      sighashType: new SigHashType(this.sighashType).toString()
    };
  }

  public serialize(): string {
    return serialize(this.value as string);
  }

}

export class OpCodeType extends ScryptType {
  constructor(bytesVal: string) {
    super(bytesVal);
  }
  toLiteral(): string {
    return `OpCodeType(b'${getValidatedHexString(this._value.toString())}')`;
  }

  public serialize(): string {
    return serialize(this.value as string);
  }
}

export class Struct extends ScryptType {

  sorted = false;

  public static structAst: StructEntity;
  constructor(o: StructObject) {
    super(o);
  }

  static setStructAst(self: Struct, structAst: StructEntity) {
    Object.getPrototypeOf(self).constructor.structAst = structAst;
  }

  static getStructAst(self: Struct): StructEntity {
    return Object.getPrototypeOf(self).constructor.structAst;
  }

  flatten(varName: string) {
    return flatternStruct(this, varName);
  }

  protected init(structAst: StructEntity): void {
    checkStruct(structAst, this, this._typeResolver);
    const ordered = {};
    const unordered = this.value;
    Object.keys(this.value).sort((a: string, b: string) => {
      return (structAst.params.findIndex(e => {
        return e.name === a;
      }) - structAst.params.findIndex(e => {
        return e.name === b;
      }));

    }).forEach(function (key) {
      ordered[key] = unordered[key];
    });
    this.sorted = true;
    this._type = structAst.name;
    this._value = ordered;
  }

  protected bind(): void {
    this.init(Struct.getStructAst(this));
    const structAst = Struct.getStructAst(this);
    structAst.params.forEach(p => {
      Object.defineProperty(this, p.name, {
        get() {
          return this.memberByKey(p.name);
        },
        set(value: SupportedParamType) {
          checkStructField(structAst, p, value, this._typeResolver);
          this._value[p.name] = value;
        }
      });
    });

  }

  toASM(): string {
    if (!this.sorted) {
      throw 'unbinded Struct can\'t call toASM';
    }

    this._asm = flatternStruct(this, '').map(v => {
      return (v.value as ScryptType).toASM();
    }).join(' ');
    return this._asm;
  }

  /**
   * @deprecated use  flatternStruct, see toASM
   */
  toArray(): ScryptType[] {
    if (!this.sorted) {
      throw 'unbinded Struct can\'t call toArray';
    }

    return Object.values(this.value).map(v => toScryptType(v));
  }


  memberByIndex(index: number): string {
    if (!this.sorted) {
      throw 'unbinded Struct can\'t call memberByIndex';
    }

    const v: StructObject = this.value as StructObject;

    return Object.keys(v)[index];
  }

  /**
  * @deprecated use  getMemberFinalType
  */
  getMemberType(key: string): string {
    const v: StructObject = this.value as StructObject;
    return toScryptType(v[key]).type;
  }

  /**
   * Get the real member type of the structure
   */
  getMemberFinalType(key: string): string {
    const member = this.memberByKey(key);
    return typeOfArg(member);
  }

  /**
   * Get the member type declared by the structure by structAst
   */
  getMemberAstFinalType(key: string): string {
    const structAst = Struct.getStructAst(this);
    const paramEntity = structAst.params.find(p => {
      return p.name === key;
    });

    if (!paramEntity) {
      throw new Error(`${key} is member of struct ${structAst.name}`);
    }

    return this._typeResolver(paramEntity.type);
  }


  getMembers(): string[] {
    const v: StructObject = this.value as StructObject;
    return Object.keys(v);
  }

  memberByKey(key: string): SupportedParamType | undefined {
    const v: StructObject = this.value as StructObject;
    const member = v[key];
    if (Array.isArray(member)) {
      return member;
    }

    return typeof member !== 'undefined' ? toScryptType(member) : undefined;
  }


  clone(): ScryptType {
    return Object.assign(Object.create(this), {
      _value: Object.keys(this.value).reduce((pre, current) => {
        const value = this.value[current];
        if (Array.isArray(value)) {
          Object.assign(pre, {
            [current]: cloneArray(value)
          });
        } else {
          Object.assign(pre, {
            [current]: toScryptType(value).clone()
          });
        }
        return pre;
      }, {})
    });
  }


  toLiteral(): string {
    const v = this.value as StructObject;
    const l = Object.keys(this.value).map(key => {
      if (Array.isArray(v[key])) {
        return arrayToLiteral(v[key] as SupportedParamType[]);
      } else {
        return toScryptType(v[key]).toLiteral();
      }
    }).join(',');

    return `{${l}}`;
  }

  toJSON(): unknown {

    const v = this.value;
    return Array.from(Object.keys(v)).reduce((obj, key) => {
      if (v[key] instanceof ScryptType) {
        if (Struct.isStruct(v[key])) {
          return Object.assign(obj, { [key]: (v[key] as ScryptType).toJSON() });
        } else if (Array.isArray(v[key])) {
          return Object.assign(obj, { [key]: JSON.stringify(v[key]) });
        } else {
          return Object.assign(obj, { [key]: (v[key] as ScryptType).toLiteral() });
        }

      } else {
        return Object.assign(obj, { [key]: v[key] });
      }
    }, {});

  }

  static isStruct(arg: SupportedParamType): boolean {
    return arg instanceof Struct;
  }
  public serialize(): string {
    return serialize(this.value as string);
  }
}

export class Library extends ScryptType {

  // store the value of properties
  private properties: StructObject = {};

  private inferredTypes: Record<string, string> = {};
  public static libraryAst: LibraryEntity;
  constructor(...args: SupportedParamType[]) {
    super(...args);

    const libraryAst = this.getLibraryAst();
    if (canAssignProperty(libraryAst)) {
      args.forEach((arg, index) => {
        Object.assign(this.properties, {
          [libraryAst.params[index].name]: arg
        });
      });
    }
  }

  static setLibraryAst(self: Library, libraryAst: LibraryEntity) {
    Object.getPrototypeOf(self).constructor.libraryAst = libraryAst;
  }

  static getLibraryAst(self: Library): LibraryEntity {
    return Object.getPrototypeOf(self).constructor.libraryAst;
  }

  getCtorArgs(): SupportedParamType[] {
    const args = this.value as SupportedParamType[];
    return arrayToScryptType(args);
  }


  cloneProperties(): StructObject {

    return Object.keys(this.properties).reduce((pre, current) => {
      const value = this.properties[current];
      if (Array.isArray(value)) {
        Object.assign(pre, {
          [current]: cloneArray(value)
        });
      } else {
        Object.assign(pre, {
          [current]: toScryptType(value).clone()
        });
      }

      return pre;

    }, {});
  }

  clone(): ScryptType {
    return Object.assign(Object.create(this), {
      _value: cloneArray(this.getCtorArgs()),
      properties: this.cloneProperties()
    });
  }



  getProperty(property: string): SupportedParamType {
    const p = this.properties[property];

    if (typeof p === 'undefined') {
      throw new Error(`Property ${property} not found, the properties of the current library are: ${JSON.stringify(this.properties)}`);
    }

    return toScryptType(p);
  }

  getProperties(): StructObject {
    return this.properties;
  }

  getLibraryAst(): LibraryEntity {
    const libraryAst = Library.getLibraryAst(this);
    return {
      name: libraryAst.name,
      params: libraryAst.params.map(p => ({
        name: p.name,
        type: resolveGenericType(this.inferredTypes, p.type)
      })),
      properties: libraryAst.properties.map(p => ({
        name: p.name,
        type: resolveGenericType(this.inferredTypes, p.type)
      })),
      genericTypes: libraryAst.genericTypes.map(t => t)
    };

  }

  flatten(varName: string) {
    return flatternLibrary(this, varName);
  }

  get finalType(): string {
    if (Library.hasGeneric(this)) {
      const libraryAst = this.getLibraryAst();
      const type = toGenericType(this.type, libraryAst.genericTypes.map(t => (this.inferredTypes[t] || t)));
      return type;
    }
    if (this._typeResolver)
      return this._typeResolver(this.type);
    return this.type;
  }

  checkValue(args: SupportedParamType[]): ValueType {
    const libraryAst = Library.getLibraryAst(this);
    if (libraryAst.params.length !== args.length) {
      throw new Error(`The type of ${libraryAst.name} is wrong, expected ${librarySign(libraryAst)} but got ${JSON.stringify(args)}`);
    }
    return args;
  }

  private inferrTypesByCtorArgs(): void {
    const args = this.value as SupportedParamType[];
    const libraryAst = this.getLibraryAst();
    libraryAst.params.forEach((p, index) => {
      const argType = inferrType(args[index]);
      if (libraryAst.genericTypes.includes(p.type)) {

        if (this.inferredTypes[p.type]) {
          if (this.inferredTypes[p.type] != argType) {
            throw new Error(`The type of ${libraryAst.name} is wrong, expected ${librarySign(libraryAst)} but got ${JSON.stringify(args)}`);
          }
        } else {
          Object.assign(this.inferredTypes, {
            [p.type]: argType
          });
        }
      } else if (isGenericType(p.type)) {
        if (libraryAst.genericTypes.length > 0) {
          if (!isGenericType(argType)) {
            throw new Error(`The type of ${libraryAst.name} is wrong, expected ${librarySign(libraryAst)} but got ${JSON.stringify(args)}`);
          }

          const [_, argGenericTypes] = parseGenericType(argType);
          const [__, paramGenericTypes] = parseGenericType(p.type);

          paramGenericTypes.forEach((t, index) => {
            if (this.inferredTypes[t]) {
              if (this.inferredTypes[t] != argGenericTypes[index]) {
                throw new Error(`The type of ${libraryAst.name} is wrong, expected ${librarySign(libraryAst)} but got ${JSON.stringify(args)}`);
              }
            } else {
              Object.assign(this.inferredTypes, {
                [t]: argGenericTypes[index]
              });
            }
          });
        }
      }
    });

  }


  public inferrTypesByAssign(assignType: string): boolean {

    if (!Library.hasGeneric(this)) {
      return false;
    }

    const [library, genericTypes] = parseGenericType(assignType);

    const libraryAst = this.getLibraryAst();

    if (libraryAst.name !== library)
      return false;

    if (libraryAst.genericTypes.length !== genericTypes.length)
      return false;

    let succces = true;
    libraryAst.genericTypes.forEach((t, index) => {
      const realT = genericTypes[index];
      if (this.inferredTypes[t]) {
        if (this.inferredTypes[t] != realT) {
          succces = false;
        }
      } else {
        Object.assign(this.inferredTypes, {
          [t]: realT
        });
      }
    });

    return succces;
  }

  static hasGeneric(self: Library): boolean {
    const ast: LibraryEntity = Library.getLibraryAst(self) as LibraryEntity;
    return (ast.genericTypes || []).length > 0;
  }



  attach() {
    const libraryAst = this.getLibraryAst();
    this._type = libraryAst.name;

    const args = this.value as SupportedParamType[];
    //check value type
    libraryAst.params.forEach((param, index) => {
      const error = checkSupportedParamType(args[index], param, this._typeResolver);
      if (error) {
        throw new Error(`The type of ${libraryAst.name} is wrong, expected ${librarySign(libraryAst)} but got ${JSON.stringify(args)}`);
      }
    });

    libraryAst.properties.forEach(p => {
      Object.defineProperty(this, p.name, {
        get() {
          return this.properties[p.name];
        },
        set(value: SupportedParamType) {
          this.properties[p.name] = value;
        }
      });
    });
  }

  static isLibrary(arg: SupportedParamType): boolean {
    return arg instanceof Library;
  }

  protected bind(): void {
    this.inferrTypesByCtorArgs();
    this.attach();
  }

  public setProperties(properties: Record<string, SupportedParamType>) {
    this.properties = Object.assign(this.properties, properties);
    return this;
  }


  toJSON(): unknown {
    return Array.from(Object.values(this.value)).map(v => {
      if (Array.isArray(v)) {
        return JSON.stringify(v);
      } else {
        return toScryptType(v).toJSON();
      }
    });
  }

  toLiteral(): string {
    return arrayToLiteral(this.value as SupportedParamType[]);
  }
}


export class HashedMap extends Library {
  constructor(data: Bytes) {
    super(data);
    this.setProperties({
      '_data': data
    });
    this._typeResolver = (t: string) => t; //we should assign this before bind
    this.bind();
  }
}

HashedMap.libraryAst = {
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
} as LibraryEntity;





export class HashedSet extends Library {
  constructor(data: Bytes) {
    super(data);
    this.setProperties({
      '_data': data
    });
    this._typeResolver = (t: string) => t; //we should assign this before bind
    this.bind();
  }
}

HashedSet.libraryAst = {
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
} as LibraryEntity;


export type PrimitiveTypes = Int | Bool | Bytes | PrivKey | PubKey | Sig | Sha256 | Sha1 | SigHashType | Ripemd160 | OpCodeType | Struct;

export type RawTypes = boolean | number | bigint | string;


export type SingletonParamType = PrimitiveTypes | RawTypes;


export type SupportedParamType = SingletonParamType | SupportedParamType[];

export type StructObject = Record<string, SupportedParamType>;


export enum VariableType {
  BOOL = 'bool',
  INT = 'int',
  BYTES = 'bytes',
  PUBKEY = 'PubKey',
  PRIVKEY = 'PrivKey',
  SIG = 'Sig',
  RIPEMD160 = 'Ripemd160',
  SHA1 = 'Sha1',
  SHA256 = 'Sha256',
  SIGHASHTYPE = 'SigHashType',
  SIGHASHPREIMAGE = 'SigHashPreimage',
  OPCODETYPE = 'OpCodeType',
  PUBKEYHASH = 'PubKeyHash',
  STRUCT = 'struct',
  LIBRARY = 'library'
}



export const BasicType = Object.keys(VariableType).map(key => VariableType[key]);

export const BasicScryptType: Record<string, typeof ScryptType> = {
  [VariableType.BOOL]: Bool,
  [VariableType.INT]: Int,
  [VariableType.BYTES]: Bytes,
  [VariableType.PUBKEY]: PubKey,
  [VariableType.PRIVKEY]: PrivKey,
  [VariableType.SIG]: Sig,
  [VariableType.RIPEMD160]: Ripemd160,
  [VariableType.SHA1]: Sha1,
  [VariableType.SHA256]: Sha256,
  [VariableType.SIGHASHTYPE]: SigHashType,
  [VariableType.OPCODETYPE]: OpCodeType,
  [VariableType.SIGHASHPREIMAGE]: SigHashPreimage
};


export function serializeSupportedParamType(x: SupportedParamType): string {
  if (typeof x === 'boolean') {
    return new Bool(x).serialize();
  } else if (typeof x === 'number' || typeof x === 'bigint') {
    return serialize(x);
  } else if (x instanceof ScryptType) {
    return x.serialize();
  } else {
    throw new Error('serializeSupportedParamType unsupported: ' + x);
  }

}