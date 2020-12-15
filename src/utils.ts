import { pathToFileURL, fileURLToPath } from 'url';
import { Int, Bool, Bytes, PrivKey, PubKey, Sig, Ripemd160, Sha1, Sha256, SigHashType, SigHashPreimage, OpCodeType, ScryptType, ValueType, Struct} from "./scryptTypes";
import { ABIEntityType, ABIEntity, StructEntity} from './compilerWrapper';
import bsv = require('bsv');
import * as readline from 'readline';
import * as fs from 'fs';

export { bsv };

const BN = bsv.crypto.BN;
const Interp = bsv.Script.Interpreter;

export const DEFAULT_FLAGS =
  //Interp.SCRIPT_VERIFY_P2SH | Interp.SCRIPT_VERIFY_CLEANSTACK | // no longer applies now p2sh is deprecated: cleanstack only applies to p2sh
  Interp.SCRIPT_ENABLE_MAGNETIC_OPCODES | Interp.SCRIPT_ENABLE_MONOLITH_OPCODES | // TODO: to be removed after upgrade to bsv 2.0
  Interp.SCRIPT_VERIFY_STRICTENC |
  Interp.SCRIPT_ENABLE_SIGHASH_FORKID | Interp.SCRIPT_VERIFY_LOW_S | Interp.SCRIPT_VERIFY_NULLFAIL |
  Interp.SCRIPT_VERIFY_DERSIG |
  Interp.SCRIPT_VERIFY_MINIMALDATA | Interp.SCRIPT_VERIFY_NULLDUMMY |
  Interp.SCRIPT_VERIFY_DISCOURAGE_UPGRADABLE_NOPS |
  Interp.SCRIPT_VERIFY_CHECKLOCKTIMEVERIFY | Interp.SCRIPT_VERIFY_CHECKSEQUENCEVERIFY;

export const DEFAULT_SIGHASH_TYPE =
  bsv.crypto.Signature.SIGHASH_ALL | bsv.crypto.Signature.SIGHASH_FORKID;

export function bool2Asm(str: string): string {
  if (str === 'true') {
    return 'OP_TRUE';
  }

  if (str === 'false') {
    return 'OP_FALSE';
  }

  throw new Error(`invalid str '${str}' to convert to bool`);
}

/**
 * decimal or hex int to little-endian signed magnitude
 */
export function int2Asm(str: string): string {

  if (/^(-?\d+)$/.test(str) ||  /^0x([0-9a-fA-F]+)$/.test(str)) {

    const number = str.startsWith('0x') ? new BN(str.substring(2), 16) : new BN(str, 10);
  
    if (number.eqn(-1)) { return 'OP_1NEGATE'; }
  
    if (number.gten(0) && number.lten(16)) { return 'OP_' + str; }
  
    const m = number.toSM({ endian: 'little' });
    return m.toString('hex');

  } else {
    throw new Error(`invalid str '${str}' to convert to int`);
  }
}

/**
 * decimal int or hex str to number or bigint
 */
export function int2Value(str: string): number | bigint {

  if (/^(-?\d+)$/.test(str) ||  /^0x([0-9a-fA-F]+)$/.test(str)) {

    const number = str.startsWith('0x') ? new BN(str.substring(2), 16) : new BN(str, 10);



    if(number.toNumber() < Number.MAX_SAFE_INTEGER) {
      return number.toNumber();
    } else {
      return BigInt(str);
    }

  } else {
    throw new Error(`invalid str '${str}' to convert to int`);
  }
}




export function intValue2hex(val: number | bigint):  string{
  let hex = val.toString(16);
  if(hex.length % 2 === 1) {
    hex = "0" + hex;
  }
  return hex;
}


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
  STRUCT = 'Struct'
}


export function parseLiteral(l: string): [string /*asm*/ , ValueType, VariableType] {

  // bool
  if (l === 'false') {
    return ["OP_FALSE", false, VariableType.BOOL];
  }
  if (l === 'true') {
    return ["OP_TRUE", true, VariableType.BOOL];
  }

  // hex int
  let m = /^(0x[0-9a-fA-F]+)$/.exec(l);
  if (m) {
    return [int2Asm(m[1]), int2Value(m[1]), VariableType.INT];
  }

  // decimal int
  m = /^(-?\d+)$/.exec(l);
  if (m) {
    return [int2Asm(m[1]), int2Value(m[1]), VariableType.INT];
  }

  // bytes
  // note: special handling of empty bytes b''
  m = /^b'([\da-fA-F]*)'$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    const asm = value === '' ? 'OP_0' : value;
    return [asm, value, VariableType.BYTES];
  }


  // PrivKey
  // 1) decimal int
  m = /^PrivKey\((-?\d+)\)$/.exec(l);
  if (m) {
    return [m[1], int2Value(m[1]), VariableType.PRIVKEY];
  }
  // 2) hex int
  m = /^PrivKey\((0x[0-9a-fA-F]+)\)$/.exec(l);
  if (m) {
    return [m[1], int2Value(m[1]), VariableType.PRIVKEY];
  }

  // PubKey
  m = /^PubKey\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    return [value, value, VariableType.PUBKEY];
  }

  // Sig
  m = /^Sig\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    return [value, value, VariableType.SIG];
  }

  // Ripemd160
  m = /^Ripemd160\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    return [value, value, VariableType.RIPEMD160];
  }

  // Sha1
  m = /^Sha1\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    return [value, value, VariableType.SHA1];
  }

  // Sha256
  m = /^Sha256\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    return [value, value, VariableType.SHA256];
  }

  // SigHashType
  m = /^SigHashType\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const bn = new BN(getValidatedHexString(m[1]), 16);
    return [bn.toString("hex", 2), bn.toNumber(), VariableType.SIGHASHTYPE];
  }

  // SigHashPreimage
  m = /^SigHashPreimage\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    return [value, value, VariableType.SIGHASHPREIMAGE];
  }

  // OpCodeType
  m = /^OpCodeType\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const value = getValidatedHexString(m[1]);
    return [value, value, VariableType.OPCODETYPE];
  }

  // Struct
  m = /^Struct\((.*)\)$/.exec(l);
  if (m) {
    const value = m[1];
    return [value, value, VariableType.STRUCT];
  }

  throw new Error(`<${l}> cannot be cast to ASM format, only sCrypt native types supported`);

}



/**
 * convert literals to Scrypt Type
 */
export function literal2ScryptType(l: string): ScryptType {

  const [asm, value, type] = parseLiteral(l);
  switch (type) {
    case VariableType.BOOL:
      return new Bool(value as boolean);
    case VariableType.INT:
      return new Int(value as number);
    case VariableType.BYTES:
      return new Bytes(value as string);
    case VariableType.PRIVKEY:
      return new PrivKey(value as bigint);
    case VariableType.PUBKEY:
      return new PubKey(value as string);
    case VariableType.SIG:
      return new Sig(value as string);
    case VariableType.RIPEMD160:
      return new Ripemd160(value as string);
    case VariableType.SHA1:
      return new Sha1(value as string);
    case VariableType.SHA256:
      return new Sha256(value as string);
    case VariableType.SIGHASHTYPE:
      return new SigHashType(value as number);
    case VariableType.SIGHASHPREIMAGE:
      return new SigHashPreimage(value as string);
    case VariableType.OPCODETYPE:
      return new OpCodeType(value as string);
    default:
      throw new Error(`<${l}> cannot be cast to ScryptType, only sCrypt native types supported`);
  }
}



export function bytes2Literal(bytearray: number[], type: string): string {

  switch (type) {
    case 'bool':
      return BN.fromBuffer(bytearray, { endian: 'little' }) > 0 ? 'true' : 'false';

    case 'int':
      return BN.fromSM(bytearray, { endian: 'little' }).toString();

    case 'bytes':
      return `b'${bytesToHexString(bytearray)}'`;

    default:
      return `b'${bytesToHexString(bytearray)}'`;
  }

}

export function bytesToHexString(bytearray: number[]): string {
  return bytearray.reduce(function (o, c) { return o += ('0' + (c & 0xFF).toString(16)).slice(-2); }, '');
}

export function hexStringToBytes(hex: string): number[] {

  getValidatedHexString(hex);

  return hex.split('')
    .reduce(function (o, c, i) {
      if (i % 2 === 0) {
        o.push(c);
      } else {
        o[o.length - 1] += c;
      }
      return o;
    }, new Array<string>())
    .map(b => parseInt(b, 16));
}


export function getValidatedHexString(hex: string, allowEmpty = true): string {

  const ret = hex.trim();

  if (ret.length < 1 && !allowEmpty) {
    throw new Error("can't be empty string");
  }

  if (ret.length % 2) {
    throw new Error('should have even length');
  }

  if (ret.length > 0 && !(/^[\da-f]+$/i.test(ret))) {
    throw new Error('should only contain [0-9] or characters [a-fA-F]');
  }

  return ret;
}

export function signTx(tx, privateKey, lockingScriptASM: string, inputAmount: number, inputIndex = 0, sighashType = DEFAULT_SIGHASH_TYPE, flags = DEFAULT_FLAGS) {

  if (!tx) {
    throw new Error('param tx can not be empty');
  }

  if (!privateKey) {
    throw new Error('param privateKey can not be empty');
  }

  if (!lockingScriptASM) {
    throw new Error('param lockingScriptASM can not be empty');
  }

  if (!inputAmount) {
    throw new Error('param inputAmount can not be empty');
  }

  return bsv.Transaction.sighash.sign(
    tx, privateKey, sighashType, inputIndex,
    bsv.Script.fromASM(lockingScriptASM), new bsv.crypto.BN(inputAmount), flags
  ).toTxFormat();
}

export function toHex(x: { toString(format: 'hex'): string }): string {
  return x.toString('hex');
}

export function getPreimage(tx, inputLockingScriptASM: string, inputAmount: number, inputIndex = 0, sighashType = DEFAULT_SIGHASH_TYPE, flags = DEFAULT_FLAGS): SigHashPreimage {
  const preimageBuf = bsv.Transaction.sighash.sighashPreimage(tx, sighashType, inputIndex, bsv.Script.fromASM(inputLockingScriptASM), new bsv.crypto.BN(inputAmount), flags);
  return new SigHashPreimage(preimageBuf.toString('hex'));
}

// Converts a number into a sign-magnitude representation of certain size as a string
// Throws if the number cannot be accommodated
// Often used to append numbers to OP_RETURN, which are read in contracts
// Support Bigint
export function num2bin(n: number | bigint | bsv.crypto.BN, dataLen: number): string {
  const num = new BN(n);
  if (num.eqn(0)) {
    return '00'.repeat(dataLen);
  }
  const s = num.toSM({ endian: 'little' }).toString('hex');

  const byteLen_ = s.length / 2;
  if (byteLen_ > dataLen) {
    throw new Error(`${n} cannot fit in ${dataLen} byte[s]`);
  }
  if (byteLen_ === dataLen) {
    return s;
  }

  const paddingLen = dataLen - byteLen_;
  const lastByte = s.substring(s.length - 2);
  const rest = s.substring(0, s.length - 2);
  let m = parseInt(lastByte, 16);
  if (num.isNeg) {
    // reset sign bit
    m &= 0x7F;
  }
  let mHex = m.toString(16);
  if (mHex.length < 2) {
    mHex = '0' + mHex;
  }

  const padding = n > 0 ? '00'.repeat(paddingLen) : '00'.repeat(paddingLen - 1) + '80';
  return rest + mHex + padding;
}

//Support Bigint
export function bin2num(s: string | Buffer): bigint {
  const hex = s.toString('hex');
  const lastByte = hex.substring(hex.length - 2);
  const rest = hex.substring(0, hex.length - 2);
  const m = parseInt(lastByte, 16);
  const n = m & 0x7F;
  let nHex = n.toString(16);
  if (nHex.length < 2) {
    nHex = '0' + nHex;
  }
  //Support negative number
  let bn = BN.fromHex(rest + nHex, { endian: 'little' });
  if (m >> 7) {
    bn = bn.neg();
  }
  return BigInt(bn);
}

export function path2uri(path: string): string {
  return pathToFileURL(path).toString();
}

export function uri2path(uri: string): string {
  return fileURLToPath(uri);
}

/**
 * @deprecated
 * convert literals to script ASM format
 */
export function literal2Asm(l: string): [string, string] {
  const [asm, _, type] = parseLiteral(l);
  return [asm, type];
}



export function findStructByName(name: string, s: StructEntity[]): StructEntity {
  return s.find(s => {
    return s.name == name;
  });
}


export function isStructType(type: string): boolean {
	return /struct\s(\w+)\s\{\}/.test(type);
}

export function isArrayType(type: string) {
	return /\w\[\d+\]/.test(type);
}


export function findStructByType(type: string, s: StructEntity[]): StructEntity | undefined {
  const m = /struct\s(\w+)\s\{\}/.exec(type.trim());
  if (m) {
    return findStructByName(m[1], s);
  }
  return undefined;
}



export function checkStruct(s: StructEntity, arg: Struct): void {
  
  s.params.forEach(p => {
    const type = arg.getMemberType(p.name);
    if(type === 'undefined') {
      throw new Error(`argument of type struct ${s.name} missing member ${p.name}`);
    } else if(type != p.type) {
      throw new Error(`wrong argument type, expected ${p.type} but got ${type}`);
    }
  })

  const members = s.params.map(p =>  p.name);
  arg.getMembers().forEach(key => {
    if(!members.includes(key)) {
      throw new Error(`${key} is not a member of struct ${s.name}`);
    }
  });
}



export function readFileByLine(path: string, index: number): string {

  let result = "";
  fs.readFileSync(path, 'utf8').split(/\r?\n/).every(function(line, i) {
    if(i === (index -1)) {
      result = line;
      return false;
    }
    return true;
  });

  return result;
}


