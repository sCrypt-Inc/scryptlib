import { pathToFileURL, fileURLToPath } from 'url';
import { Int, Bool, Bytes, PrivKey, PubKey, Sig, Ripemd160, Sha1, Sha256, SigHashType, SigHashPreimage, OpCodeType, ScryptType } from "./scryptTypes";

import bsv = require('bsv');

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
 * decimal int to little-endian signed magnitude
 */
export function int2Asm(str: string): string {

  if (!/^-?(0x)?\d+$/.test(str)) {
    throw new Error(`invalid str '${str}' to convert to int`);
  }

  return number2Asm(parseInt(str));
}


/**
 * number to little-endian signed magnitude
 */
export function number2Asm(n: number): string {

  const number = new BN(n);
  if (number.eqn(-1)) { return 'OP_1NEGATE'; }

  if (number.gten(0) && number.lten(16)) { return 'OP_' + number.toString(); }

  const m = number.toSM({ endian: 'little' });
  return m.toString('hex');
}

/**
 * hex to little-endian signed magnitude
 */
export function hex2Asm(str: string): string {
  let buf = Buffer.from(str, 'hex')
  let number = BN.fromBuffer(buf)
  const m = number.toSM({ endian: 'little' });
  return m.toString('hex');
}

/**
 * hex to little-endian signed magnitude
 */
export function hex2number(str: string): number | bigint{
  let buf = Buffer.from(str, 'hex')
  let number = BN.fromBuffer(buf)
  let n = number.toNumber();

  if(n < Number.MAX_SAFE_INTEGER) {
    return n;
  } else {
    return BigInt("0x" + str);
  }
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
  OPCODETYPE = 'OpCodeType'
}


function literalParser(l: string): [string | number | bigint | boolean, string] {


  // bool
  if (l === 'false') {
    return [false, VariableType.BOOL];
  }
  if (l === 'true') {
    return [true, VariableType.BOOL];
  }

  // hex int
  let m = /^0x([0-9a-fA-F]+)$/.exec(l);
  if (m) {
    const bn = new BN(m[1], 16);
    return [bn.toNumber(), VariableType.INT];
  }

  // decimal int
  m = /^(-?\d+)$/.exec(l);
  if (m) {
    const bn = new BN(m[1], 10);
    return [bn.toNumber(), VariableType.INT];
  }

  // bytes
  // note: special handling of empty bytes b''
  m = /^b'([\da-fA-F]*)'$/.exec(l);
  if (m) {
    return [getValidatedHexString(m[1]), VariableType.BYTES];
  }


  // PrivKey
  // 1) decimal int
  m = /^PrivKey\((-?\d+)\)$/.exec(l);
  if (m) {
    const bn = new BN(m[1], 10);
    return [bn.toString("hex", 2), 'PrivKey'];
  }
  // 2) hex int
  m = /^PrivKey\(0x([0-9a-fA-F]+)\)$/.exec(l);
  if (m) {
    return [m[1], 'PrivKey'];
  }

  // PubKey
  m = /^PubKey\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    return [getValidatedHexString(m[1]), VariableType.PUBKEY];
  }

  // Sig
  m = /^Sig\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    return [getValidatedHexString(m[1]), VariableType.SIG];
  }

  // Ripemd160
  m = /^Ripemd160\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    return [getValidatedHexString(m[1]), VariableType.RIPEMD160];
  }

  // Sha1
  m = /^Sha1\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    return [getValidatedHexString(m[1]), VariableType.SHA1];
  }

  // Sha256
  m = /^Sha256\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    return [getValidatedHexString(m[1]), VariableType.SHA256];
  }

  // SigHashType
  m = /^SigHashType\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    const bn = new BN(getValidatedHexString(m[1]), 16);
    return [bn.toNumber(), VariableType.SIGHASHTYPE];
  }

  // SigHashPreimage
  m = /^SigHashPreimage\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    return [getValidatedHexString(m[1]), VariableType.SIGHASHPREIMAGE];
  }

  // OpCodeType
  m = /^OpCodeType\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    return [getValidatedHexString(m[1]), VariableType.OPCODETYPE];
  }

  throw new Error(`<${l}> cannot be cast to ASM format, only sCrypt native types supported`);

}

/**
 * convert literals to script ASM format
 */
export function literal2Asm(l: string): [string, string] {

  const [value, type] = literalParser(l);


  switch (type) {
    case VariableType.BOOL:
      if (value as boolean === false) {
        return ['OP_FALSE', type];
      } else if (value as boolean === true) {
        return ['OP_TRUE', type];
      }
    case VariableType.INT:
      return [number2Asm(value as number), type];
    case 'bytes': {
      // we push OP_0 to mainstack when empty bytes.
      const b = value as string;
      return [b === '' ? 'OP_0' : b, type];
    }
    case VariableType.PRIVKEY:
      return [hex2Asm(value as string), type];
    case VariableType.PUBKEY:
    case VariableType.SIG:
    case VariableType.RIPEMD160:
    case VariableType.SHA1:
    case VariableType.SHA256:
    case VariableType.SIGHASHPREIMAGE:
    case VariableType.OPCODETYPE:
      return [value as string, type];
    case VariableType.SIGHASHTYPE: {
      const bn = new BN(value as number);
      let v = bn.toString("hex", 2);
      return [v, type];
    }

    default:
      throw new Error(`<${l}> cannot be cast to sCrypt  ASM format, only sCrypt native types supported`);
  }

}




/**
 * convert literals to Scrypt Type
 */
export function literal2ScryptType(l: string): ScryptType {

  const [value, type] = literalParser(l);
  switch (type) {
    case VariableType.BOOL:
      return new Bool(value as boolean);
    case VariableType.INT:
      return new Int(value as number);
    case VariableType.BYTES:
      return new Bytes(value as string);
    case VariableType.PRIVKEY:
      return new PrivKey(hex2number(value as string));
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