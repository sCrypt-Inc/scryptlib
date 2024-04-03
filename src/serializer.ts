import { BigNumber, Script, Utils } from '@bsv/sdk';
import { Bool, Bytes, Int, isBytes, ScryptType, SupportedParamType } from './scryptTypes';


const BN = BigNumber


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
  const number = new BN(n.toString().replace(/n/, ''));
  const m = number.toSm('little');
  return Script.fromASM(Utils.toHex(m)).toHex();
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
      return Script.fromASM(b).toHex();
    }

    const intValue = parseInt(b, 16);

    if (intValue >= 1 && intValue <= 16) {
      return BigInt(intValue + 80).toString(16);
    }

    return Script.fromASM(b).toHex();
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
  return Script.fromHex(hex).toASM();
}
