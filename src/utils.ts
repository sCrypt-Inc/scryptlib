import { pathToFileURL, fileURLToPath } from 'url';

import bsv = require('bsv');

export { bsv };

const BN = bsv.crypto.BN;
const Interpreter = bsv.Script.Interpreter;

export const DEFAULT_FLAGS =
  Interpreter.SCRIPT_VERIFY_MINIMALDATA |
  Interpreter.SCRIPT_ENABLE_SIGHASH_FORKID |
  Interpreter.SCRIPT_ENABLE_MAGNETIC_OPCODES |
  Interpreter.SCRIPT_ENABLE_MONOLITH_OPCODES;

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

  const number = new BN(str, 10);

  if (number.eqn(-1)) { return 'OP_1NEGATE'; }

  if (number.gten(0) && number.lten(16)) { return 'OP_' + str; }

  const m = number.toSM({ endian: 'little' });
  return m.toString('hex');
}

/**
 * convert literals to script ASM format
 */
export function literal2Asm(l: string): [string, string] {
  // bool
  if (l === 'false') {
    return ['OP_FALSE', 'bool'];
  }
  if (l === 'true') {
    return ['OP_TRUE', 'bool'];
  }

  // hex int
  if (/^0x[0-9a-fA-F]+$/.test(l)) {
    return [int2Asm(l), 'int'];
  }

  // decimal int
  if (/^-?\d+$/.test(l)) {
    return [int2Asm(l), 'int'];
  }

  // bytes
  let m = /^b'([\da-fA-F]+)'$/.exec(l);
  if (m) {
    return [getValidatedHexString(m[1]), 'bytes'];
  }

  // PrivKey
  // 1) decimal int
  m = /^PrivKey\((-?\d+)\)$/.exec(l);
  if (m) {
    return [m[1], 'PrivKey'];
  }
  // 2) hex int
  m = /^PrivKey\((0x[0-9a-fA-F]+)\)$/.exec(l);
  if (m) {
    return [m[1], 'PrivKey'];
  }

  // PubKey
  m = /^PubKey\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    return [getValidatedHexString(m[1]), 'PubKey'];
  }

  // Sig
  m = /^Sig\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    return [getValidatedHexString(m[1]), 'Sig'];
  }

  // Ripemd160
  m = /^Ripemd160\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    return [getValidatedHexString(m[1]), 'Ripemd160'];
  }

  // Sha1
  m = /^Sha1\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    return [getValidatedHexString(m[1]), 'Sha1'];
  }

  // Sha256
  m = /^Sha256\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    return [getValidatedHexString(m[1]), 'Sha256'];
  }

  // SigHashType
  m = /^SigHashType\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    return [getValidatedHexString(m[1]), 'SigHashType'];
  }

  // OpCodeType
  m = /^OpCodeType\(b'([\da-fA-F]+)'\)$/.exec(l);
  if (m) {
    return [getValidatedHexString(m[1]), 'OpCodeType'];
  }

  throw new Error(`<${l}> can't be casted to asm format, only support sCrypt native types`);
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

export function getPreimage(tx, inputLockingScriptASM: string, inputAmount: number, inputIndex = 0, sighashType = DEFAULT_SIGHASH_TYPE, flags = DEFAULT_FLAGS) {
  return bsv.Transaction.sighash.sighashPreimage(tx, sighashType, inputIndex, bsv.Script.fromASM(inputLockingScriptASM), new bsv.crypto.BN(inputAmount), flags);
}

// Converts a number into a sign-magnitude representation of certain size as a string
// Throws if the number cannot be accommodated
// Often used to append numbers to OP_RETURN, which are read in contracts
// TODO: handle bigint
export function num2bin(n: number, dataLen: number): string {
  if (n === 0) {
    return "00".repeat(dataLen);
  }

  const num = BN.fromNumber(n);
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
  if (n < 0) {
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

export function path2uri(path: string): string {
  return pathToFileURL(path).toString();
}

export function uri2path(uri: string): string {
  return fileURLToPath(uri);
}