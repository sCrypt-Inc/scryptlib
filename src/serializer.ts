import { bin2num } from '.';
import { BaseType, Bool, Bytes, Int, PrivKey, PubKey, Ripemd160, SigHashPreimage, Sha1, Sha256, Sig, OpCodeType, SigHashType, SupportedParamType } from './scryptTypes';
import { bsv, parseLiteral } from './utils';


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

/**
 * little-endian signed magnitude to int
 */
export function hex2int(hex: string): bigint {

  if (hex === '00') {
    return 0n;
  } else if (hex === '4f') {
    return -1n;
  } else {
    const b = bsv.Script.fromHex(hex);
    const chuck = b.chunks[0];

    if (chuck.opcodenum >= 81 && chuck.opcodenum <= 96) {
      return BigInt(chuck.opcodenum - 80);
    }
    return bin2num(chuck.buf.toString('hex'));
  }
}



export function bool2hex(b: Bool): string {
  if (b) {
    return '51';
  }
  return '00';
}

export function hex2bool(hex: string): boolean {
  if (hex === '51') {
    return true;
  } else if (hex === '00') {
    return false;
  }
  throw new Error(`invalid hex ${hex}`);
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

export function hex2bytes(hex: string): Bytes {
  if (hex === '00') {
    return '';
  }

  const s = bsv.Script.fromHex(hex);
  const chuck = s.chunks[0];

  if (chuck.opcodenum >= 81 && chuck.opcodenum <= 96) {
    return Buffer.from([chuck.opcodenum - 80]).toString('hex');
  }

  return chuck.buf.toString('hex');
}

export function toHex(x: { toString(format: 'hex'): string } | string | bigint | boolean): string {

  if (typeof x === 'object') {
    return x.toString('hex');
  } else if (typeof x === 'bigint') {
    return int2hex(x);
  } else if (typeof x === 'boolean') {
    return bool2hex(x as boolean);
  } else if (typeof x === 'string') {
    const [value, type] = parseLiteral(x);

    if (type == BaseType.PRIVKEY) {
      return int2hex(value as bigint);
    }

    return bytes2hex(value as Bytes);
  }


  return '00';
}


export function toASM(a: SupportedParamType): string {
  const hex = toHex(a);
  return bsv.Script.fromHex(hex).toASM();
}



export function deserializer(type: string, hex: string): SupportedParamType {

  switch (type) {
    case BaseType.BOOL:
      return Bool(hex2bool(hex));
    case BaseType.INT:
      return Int(hex2int(hex));
    case BaseType.BYTES:
      return Bytes(hex2bytes(hex));
    case BaseType.PRIVKEY:
      return PrivKey(hex2int(hex));
    case BaseType.PUBKEY:
      return PubKey(hex2bytes(hex));
    case BaseType.SIG:
      return Sig(hex2bytes(hex));
    case BaseType.RIPEMD160:
      return Ripemd160(hex2bytes(hex));
    case BaseType.SHA1:
      return Sha1(hex2bytes(hex));
    case BaseType.SHA256:
      return Sha256(hex2bytes(hex));
    case BaseType.SIGHASHTYPE:
      return SigHashType(Number(hex2int(hex)));
    case BaseType.SIGHASHPREIMAGE:
      return SigHashPreimage(hex2bytes(hex));
    case BaseType.OPCODETYPE:
      return OpCodeType(hex2bytes(hex));
    default:
      throw new Error(`<${type}> cannot be cast to ScryptType, only sCrypt native types supported`);
  }

}