import bsv = require('bsv');

export { bsv };

const BN = bsv.crypto.BN;

export const FLAGS = bsv.Script.Interpreter.SCRIPT_VERIFY_MINIMALDATA | bsv.Script.Interpreter.SCRIPT_ENABLE_SIGHASH_FORKID | bsv.Script.Interpreter.SCRIPT_ENABLE_MAGNETIC_OPCODES | bsv.Script.Interpreter.SCRIPT_ENABLE_MONOLITH_OPCODES;

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

  const num: number = parseInt(str);

  if (num === -1) return 'OP_1NEGATE';

  if (num >= 0 && num <= 16) return 'OP_' + num;

  const n = new BN(str);
  const m = n.toSM({ endian: 'little' });
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
    let bytes = getValidatedHexString(m[1]);
    const intVal = parseInt("0x" + bytes);
    if (intVal >= 0 && intVal <= 16) {
      bytes = "OP_" + intVal;
    }
    return [bytes, 'bytes'];
  }

  // PubKey
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


export function getValidatedHexString(hex: string, allowEmpty = false): string {

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

export function deserialize(txHex: string) {
  return new bsv.Transaction(txHex);
}