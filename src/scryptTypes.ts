import { parseLiteral, getValidatedHexString, intValue2hex, checkStruct, flatternStruct, typeOfArg, isInteger, StructEntity, bsv, checkStructField } from './internal';
import { serialize, serializeInt } from './serializer';


// A type resolver that can resolve type aliases to final types
export type TypeResolver = (type: string) => string;

export type ValueType = RawTypes | StructObject | ValueType[];


export function toScryptType(a: ValueType): ScryptType {
  if (typeof a === 'number' || typeof a === 'bigint' || typeof a === 'string') {
    return new Int(a);
  } else if (typeof a === 'boolean') {
    return new Bool(a);
  } else if (a instanceof ScryptType) {
    return a;
  } else {
    throw `${a} cannot be convert to ScryptType`;
  }
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
      this._value = this.checkValue(value[0]);
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
  checkValue(value: ValueType): ValueType {
    if (typeof value === 'undefined') {
      throw new Error('constructor argument undefined');
    }

    return value;
  }

  public equals(obj: ScryptType): boolean {
    return obj.finalType === this.finalType && obj.toASM() === this.toASM();
  }

  public serialize(): string {
    return '';
  }
}

export class Int extends ScryptType {
  constructor(intVal: number | bigint | string) {
    super(intVal);
  }
  toLiteral(): string {
    return this._value.toString();
  }
  checkValue(value: ValueType): ValueType {
    super.checkValue(value);
    if (!isInteger(value)) {
      throw new Error('Only supports integers, should use integer number, bigint, hex string or decimal string: ' + value);
    }

    if (typeof value == 'number' && !isNaN(value)) {

      if (!Number.isSafeInteger(value)) {
        throw new Error(`<${value}> is not safe integer, should use bigint, hex string or decimal string`);
      }
    }

    return value;
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

  static setStructAst(structAst: StructEntity) {
    this.structAst = structAst;
  }

  protected bind(structAst: StructEntity): void {
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
    return toScryptType(v).type;
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
    const structAst: StructEntity = Object.getPrototypeOf(this).constructor.structAst;
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
    if(Array.isArray(member)) {
      return member;
    }

    return typeof member !== 'undefined' ? toScryptType(member) : undefined;
  }


  static arrayToLiteral(a: Array<ValueType>): string {

    const al = a.map(i => {
      if (Array.isArray(i)) {
        return Struct.arrayToLiteral(i);
      }
      return toScryptType(i).toLiteral();
    }).join(',');

    return `[${al}]`;
  }


  toLiteral(): string {
    const v = this.value;
    const l = Object.keys(this.value).map(key => {
      if (Array.isArray(v[key])) {
        return Struct.arrayToLiteral(v[key]);
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



function toStructObject(structAst: StructEntity, args: SupportedParamType[]): StructObject {
  return args.reduce((previousValue, currentValue, index)=> {
    previousValue[structAst.params[index].name] = currentValue;
    return previousValue;
  }, {});
}

export class Library extends Struct {
  private args: SupportedParamType[] = [];
  constructor(...args: SupportedParamType[]) {
    super({});
    this.args = args;
  }

  attach(structAst: StructEntity) {
    this._value = toStructObject(structAst, this.args);
  }

  protected bind(structAst: StructEntity): void {
    this.attach(structAst);
    super.bind(structAst);
  }
}


export type PrimitiveTypes = Int | Bool | Bytes | PrivKey | PubKey | Sig | Sha256 | Sha1 | SigHashType | Ripemd160 | OpCodeType | Struct ;

export type RawTypes = boolean | number | bigint | string ;


export type SingletonParamType = PrimitiveTypes | RawTypes;


export type SupportedParamType = SingletonParamType | SupportedParamType[];

export type StructObject = Record<string, SupportedParamType>;




export type HashedSet<K extends SupportedParamType> = Set<K>;
export type HashedMap<K extends SupportedParamType, V extends SupportedParamType> = Map<K, V>;

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
  STRUCT = 'struct'
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