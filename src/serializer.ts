import { Bool, Bytes, Int, isBytes, ScryptType, SupportedParamType } from './scryptTypes';
import { bsv } from './utils';


const BN = bsv.crypto.BN;


/**
 * int to little-endian signed magnitude
 */
export function int2hex(n: Int): string {
  if (n === Int(0)) {
    return '00';
  } else if (n === Int(-1)) {
    return '4f';
  } else if (n > Int(0) && n <= Int(16)) {
    n += Int(80);
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


export function toScriptHex(x: SupportedParamType, type: string): string {

  if (type === ScryptType.INT || type === ScryptType.PRIVKEY) {
    return int2hex(x as bigint);
  } else if (type === ScryptType.BOOL) {
    return bool2hex(x as boolean);
  } else if (isBytes(type)) {
    return bytes2hex(x as Bytes);
  }

  throw new Error(`unsupport SupportedParamType: ${x}`);
}


export function toScriptASM(a: SupportedParamType, type: string): string {
  const hex = toScriptHex(a, type);
  return bsv.Script.fromHex(hex).toASM();
}
