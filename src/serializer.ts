import { ScryptType, Bool, Bytes, Int, parseLiteral, SupportedParamType } from './scryptTypes';
import { bsv } from './utils';


const BN = bsv.crypto.BN;


/**
 * int to little-endian signed magnitude
 */
export function int2hex(n: Int): string {
  if (n === 0n) {
    return '00';
  } else if (n === -1n) {
    return '4f';
  } else if (n > 0n && n <= 16n) {
    n += 80n;
    return n.toString(16);
  }
  const number = new BN(n);
  const m = number.toSM({ endian: 'little' });
  return bsv.Script.fromASM(m.toString('hex')).toHex();
}



export function bool2hex(b: Bool): string {
  if (b) {
    return '51';
  }
  return '00';
}


export function bytes2hex(b: Bytes): string {
  if (b) {

    if (b.length / 2 > 1) {
      return bsv.Script.fromASM(b).toHex();
    }

    const intValue = parseInt(b, 16);

    if (intValue >= 1 && intValue <= 16) {
      return BigInt(intValue + 80).toString(16);
    }

    return bsv.Script.fromASM(b).toHex();
  }
  return '00';
}


export function toScriptHex(x: SupportedParamType): string {

  if (typeof x === 'bigint') {
    return int2hex(x);
  } else if (typeof x === 'boolean') {
    return bool2hex(x as boolean);
  } else if (typeof x === 'string') {
    const [value, type] = parseLiteral(x);

    if (type == ScryptType.PRIVKEY) {
      return int2hex(value as bigint);
    }

    return bytes2hex(value as Bytes);
  }

  throw new Error('unsupport SupportedParamType: x');
}


export function toScriptASM(a: SupportedParamType): string {
  const hex = toScriptHex(a);
  return bsv.Script.fromHex(hex).toASM();
}
