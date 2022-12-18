import { bin2num, bsv } from '.';
import { parseLiteral } from './internal';
import { Int, Bytes, SupportedParamType, BaseType, Bool, PrivKey, PubKey, Sig, Ripemd160, Sha1, Sha256, SigHashType, SigHashPreimage, OpCodeType } from './scryptTypes';

export default class Stateful {



  static int2hex(n: Int): string {
    let asm = '';
    const num = new bsv.crypto.BN(n);
    if (num.eqn(0)) {
      asm = '00';
    } else {
      asm = num.toSM({ endian: 'little' }).toString('hex');
    }

    return bsv.Script.fromASM(asm).toHex();
  }

  static hex2int(hex: string): bigint {
    const s = bsv.Script.fromHex(hex);
    const chuck = s.chunks[0];
    return bin2num(chuck.buf.toString('hex'));
  }



  static bool2hex(b: boolean): string {
    if (b) {
      return '01';
    }
    return '00';
  }

  static hex2bool(hex: string): boolean {
    if (hex === '01') {
      return true;
    } else if (hex === '00') {
      return false;
    }
    throw new Error(`invalid hex ${hex}`);
  }

  static bytes2hex(b: Bytes): string {
    if (b === '') {
      return '00';
    }
    return bsv.Script.fromASM(b).toHex();
  }

  static hex2bytes(hex: string): Bytes {
    if (hex === '00') {
      return '';
    }
    const s = bsv.Script.fromHex(hex);
    const chuck = s.chunks[0];
    return chuck.buf.toString('hex');
  }

  static toHex(x: SupportedParamType): string {

    if (typeof x === 'bigint') {
      return Stateful.int2hex(x);
    } else if (typeof x === 'boolean') {
      return Stateful.bool2hex(x as boolean);
    } else if (typeof x === 'string') {
      const [value, type] = parseLiteral(x);

      if (type === BaseType.PRIVKEY) {
        return Stateful.int2hex(value as bigint);
      }

      return Stateful.bytes2hex(value as Bytes);
    }

    return '00';
  }

  static serialize(x: SupportedParamType): string {

    if (typeof x === 'bigint') {
      const num = new bsv.crypto.BN(x);
      if (num.eqn(0)) {
        return '';
      } else {
        return num.toSM({ endian: 'little' }).toString('hex');
      }
    } else if (typeof x === 'boolean') {
      if (x) {
        return '01';
      }
      return '';
    } else if (typeof x === 'string') {
      const [value, type] = parseLiteral(x);

      if (type === BaseType.PRIVKEY) {
        return Stateful.int2hex(value as bigint);
      }

      return value as Bytes;
    }

    return '';
  }


  static deserializer(type: string, hex: string): SupportedParamType {

    switch (type) {
      case BaseType.BOOL:
        return Bool(Stateful.hex2bool(hex));
      case BaseType.INT:
        return Int(Stateful.hex2int(hex));
      case BaseType.BYTES:
        return Bytes(Stateful.hex2bytes(hex));
      case BaseType.PRIVKEY:
        return PrivKey(Stateful.hex2int(hex));
      case BaseType.PUBKEY:
        return PubKey(Stateful.hex2bytes(hex));
      case BaseType.SIG:
        return Sig(Stateful.hex2bytes(hex));
      case BaseType.RIPEMD160:
        return Ripemd160(Stateful.hex2bytes(hex));
      case BaseType.SHA1:
        return Sha1(Stateful.hex2bytes(hex));
      case BaseType.SHA256:
        return Sha256(Stateful.hex2bytes(hex));
      case BaseType.SIGHASHTYPE:
        return SigHashType(Number(Stateful.hex2int(hex)));
      case BaseType.SIGHASHPREIMAGE:
        return SigHashPreimage(Stateful.hex2bytes(hex));
      case BaseType.OPCODETYPE:
        return OpCodeType(Stateful.hex2bytes(hex));
      default:
        throw new Error(`<${type}> cannot be cast to ScryptType, only sCrypt native types supported`);
    }

  }
}