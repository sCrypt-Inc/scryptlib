
export enum SymbolType {
  ScryptType = 'ScryptType',
  Contract = 'Contract',
  Library = 'Library',
  Struct = 'Struct',
  Unknown = 'Unknown',
}

export type TypeInfo = {
  info?: unknown,
  generic?: boolean,
  finalType: string,
  symbolType: SymbolType
}

// // A type resolver that can resolve type aliases to final types
export type TypeResolver = (type: string) => TypeInfo;


export enum ScryptType {
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
}



export interface Flavoring<FlavorT> {
  _type?: FlavorT;
}


export type Flavor<T, FlavorT> = T & Flavoring<FlavorT>;

export type Int = Flavor<bigint, 'int'>;

export type Bool = Flavor<boolean, 'bool'>;

export type Bytes = Flavor<string, 'bytes'>;

export type PrivKey = Int & { __type: 'PrivKey' };

export type PubKey = Bytes & { __type: 'PubKey' };
export type Sig = Bytes & { __type: 'Sig' };
export type Ripemd160 = Bytes & { __type: 'Ripemd160' };
export type PubKeyHash = Ripemd160;
export type Sha1 = Bytes & { __type: 'Sha1' };
export type Sha256 = Bytes & { __type: 'Sha256' };
export type SigHashType = Bytes & { __type: 'SigHashType' };
export type SigHashPreimage = Bytes & { __type: 'SigHashPreimage' };
export type OpCodeType = Bytes & { __type: 'OpCodeType' };
export type HashedSet = Flavor<Set<SupportedParamType>, 'HashedSet'>;
export type HashedMap = Flavor<Map<SupportedParamType, SupportedParamType>, 'HashedMap'>;


export function Int(n: number | bigint): Int {
  return BigInt(n);
}

export function Bool(b: boolean): Bool {
  return b;
}

export function Bytes(b: string): Bytes {
  return getValidatedHexString(b);
}

export function stringToBytes(str: string): Bytes {
  const encoder = new TextEncoder();
  const uint8array = encoder.encode(str);
  return getValidatedHexString(Buffer.from(uint8array).toString('hex'));
}

export function PrivKey(n: Int): PrivKey {
  return n as PrivKey;
}

export function PubKey(b: Bytes): PubKey {
  return getValidatedHexString(b, false) as PubKey;
}


export function Sig(b: Bytes): Sig {
  return getValidatedHexString(b, false) as Sig;
}

export function Ripemd160(b: Bytes): Ripemd160 {
  return getValidatedHexString(b, false) as Ripemd160;
}

export function PubKeyHash(b: Bytes): PubKeyHash {
  return Ripemd160(b);
}

export function Sha1(b: Bytes): Sha1 {
  return getValidatedHexString(b, false) as Sha1;
}

export function Sha256(b: Bytes): Sha256 {
  return getValidatedHexString(b, false) as Sha256;
}

export function HashedSet(set: Set<SupportedParamType>): HashedSet {
  return set as HashedSet;
}

export function HashedMap(map: Map<SupportedParamType, SupportedParamType>): HashedMap {
  return map as HashedMap;
}

export enum SigHash {
  ALL = 0x41,
  NONE = 0x42,
  SINGLE = 0x43,
  ANYONECANPAY_ALL = 0xc1,
  ANYONECANPAY_NONE = 0xc2,
  ANYONECANPAY_SINGLE = 0xc3,
}

export function SigHashType(s: SigHash | 0): SigHashType {
  if (s == 0) {
    return '00' as SigHashType;
  } else if (s === SigHash.ALL || s === SigHash.NONE || s === SigHash.SINGLE
    || s === SigHash.ANYONECANPAY_ALL || s === SigHash.ANYONECANPAY_NONE || s === SigHash.ANYONECANPAY_SINGLE) {
    return `${(s as SigHash).toString(16)}` as SigHashType;
  }
  throw new Error(`unsupported SigHashType: ${s}`);
}


export function SigHashPreimage(b: Bytes): SigHashPreimage {
  return getValidatedHexString(b) as SigHashPreimage;
}


export function OpCodeType(b: Bytes): OpCodeType {
  return getValidatedHexString(b) as OpCodeType;
}

export type SortedItem<T> = {
  idx: bigint,
  item: T
};

export function getSortedItem<K, V>(collection: Map<K, V> | Set<K>, k: K): SortedItem<K> {
  return Object.assign({
    idx: -1n,
    item: k
  }, {
    image: collection instanceof Map ? new Map(collection) : new Set(collection)
  });
}


export type PrimitiveTypes = Int | Bool | Bytes | PrivKey | PubKey | Sig | Sha256 | Sha1 | SigHashType | Ripemd160 | OpCodeType | HashedMap | HashedSet;


export type SubBytes = PubKey | Sig | Sha256 | Sha1 | SigHashType | Ripemd160 | OpCodeType;


export interface StructObject {
  [key: string]: SupportedParamType;
}

export type SupportedParamType = PrimitiveTypes | StructObject | SupportedParamType[];


export function getValidatedHexString(hex: string, allowEmpty = true): string {

  const ret = hex.trim();

  if (ret.length < 1 && !allowEmpty) {
    throw new Error('can\'t be empty string');
  }

  if (ret.length % 2) {
    throw new Error(`<${ret}> should have even length`);
  }

  if (ret.length > 0 && !(/^[\da-f]+$/i.test(ret))) {
    throw new Error(`<${ret}> should only contain [0-9] or characters [a-fA-F]`);
  }

  return ret;
}



export function toJSON(value: SupportedParamType): unknown {

  if (Array.isArray(value)) {
    const v = value as SupportedParamType[];
    return v.map(i => toJSON(i));
  } else if (typeof value === 'object') {

    const copy = {};

    for (const key in value) {
      Object.assign(copy, {
        [key]: toJSON(value[key])
      });
    }

    return copy;
  } else if (typeof value === 'bigint') {
    if (value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER)) {
      return Number(value);
    } else {
      return value.toString();
    }
  } else if (typeof value === 'boolean') {
    return value;
  } else if (typeof value === 'string') {
    const [val, type] = parseLiteral(value);
    if (type === ScryptType.BYTES) {
      return `b'${val}'`;
    }
    return value;
  }
}

export function parseLiteral(l: string, supportInt = false): [SupportedParamType /*asm*/, ScryptType] {


  // bool
  if (l === 'false') {
    return [false, ScryptType.BOOL];
  }
  if (l === 'true') {
    return [true, ScryptType.BOOL];
  }

  if (supportInt) {
    // hex int
    let m = /^(0x[0-9a-fA-F]+)$/.exec(l);
    if (m) {
      return [BigInt(m[1]), ScryptType.INT];
    }

    // decimal int
    m = /^(-?\d+)$/.exec(l);
    if (m) {
      return [BigInt(m[1]), ScryptType.INT];
    }
  } else {
    const m = /^([\da-fA-F]*)$/.exec(l);
    if (m) {
      return [Bytes(l), ScryptType.BYTES];
    }
  }



  // bytes
  // note: special handling of empty bytes b''
  let m = /^b'([\da-fA-F]*)'$/.exec(l);
  if (m) {
    return [Bytes(m[1]), ScryptType.BYTES];
  }



  // String
  m = /^"([\s\S]*)"$/.exec(l);
  if (m) {
    return [stringToBytes(m[1]), ScryptType.BYTES];
  }


  // PrivKey
  // 1) decimal int
  m = /^PrivKey\((-?\d+)\)$/.exec(l);
  if (m) {
    return [BigInt(m[1]), ScryptType.PRIVKEY];
  }
  // 2) hex int
  m = /^PrivKey\((0x[0-9a-fA-F]+)\)$/.exec(l);
  if (m) {
    return [BigInt(m[1]), ScryptType.PRIVKEY];
  }

  // PubKey
  m = /^PubKey\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    return [Bytes(value), ScryptType.PUBKEY];
  }

  // Sig
  m = /^Sig\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    return [Bytes(value), ScryptType.SIG];
  }

  // Ripemd160
  m = /^Ripemd160\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    return [Bytes(value), ScryptType.RIPEMD160];
  }

  // Sha1
  m = /^Sha1\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    return [Bytes(value), ScryptType.SHA1];
  }

  // Sha256
  m = /^Sha256\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    return [Bytes(value), ScryptType.SHA256];
  }

  // SigHashType
  m = /^SigHashType\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    return [Bytes(value), ScryptType.SIGHASHTYPE];
  }

  // SigHashPreimage
  m = /^SigHashPreimage\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    return [Bytes(value), ScryptType.SIGHASHPREIMAGE];
  }

  // OpCodeType
  m = /^OpCodeType\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    return [Bytes(value), ScryptType.OPCODETYPE];
  }


  throw new Error(`<${l}> cannot be cast to ASM format, only sCrypt native types supported`);

}

export function isScryptType(type: string): boolean {
  return Object.keys(ScryptType).map(key => ScryptType[key]).includes(type);
}

export function isSubBytes(type: string): boolean {
  return [ScryptType.OPCODETYPE, ScryptType.PUBKEY, ScryptType.RIPEMD160, ScryptType.SHA1, ScryptType.SHA256, ScryptType.SIG,
  // eslint-disable-next-line indent
  ScryptType.SIGHASHPREIMAGE, ScryptType.SIGHASHTYPE].map(t => t.toString()).includes(type);
}

export function isBytes(type: string): boolean {
  return type === ScryptType.BYTES || isSubBytes(type);
}