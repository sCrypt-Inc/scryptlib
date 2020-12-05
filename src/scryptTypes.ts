import { parseLiteral, getValidatedHexString, bsv, intValue2hex } from "./utils";


export type ValueType = number | bigint | boolean | string;

export abstract class ScryptType {

  protected _value: ValueType;
  protected _literal: string;
  private _asm: string;
  private _type: string;

  constructor(value: ValueType) {
    try {
      this._value = value;
      this._literal = this.toLiteral();
      const [asm, _, scrType] = parseLiteral(this._literal);
      this._type = scrType;
      this._asm = asm;
    } catch (error) {
      throw new Error(`can't get type from ${this._literal}, ${error.message}`);
    }
  }

  get value(): ValueType {
    return this._value;
  }

  get literal(): string {
    return this._literal;
  }

  get type(): string {
    return this._type;
  }

  toASM(): string {
    return this._asm;
  }

  abstract toLiteral(): string;
}

export class Int extends ScryptType {
  constructor(intVal: number | bigint) {
    super(intVal);
  }
  toLiteral(): string {
    return this._value.toString();
  }
}

export class Bool extends ScryptType {
  constructor(boolVal: boolean) {
    super(boolVal);
  }
  toLiteral(): string {
    return this._value.toString();
  }
}

export class Bytes extends ScryptType {
  constructor(bytesVal: string) {
    super(bytesVal);
  }
  toLiteral(): string {
    return `b'${getValidatedHexString(this._value.toString())}'`;
  }
}

export class PrivKey extends ScryptType {
  constructor(intVal: bigint) {
    super(intVal);
  }
  toLiteral(): string {
    const v = this._value as bigint;
    return `PrivKey(0x${intValue2hex(v)})`;
  }
}

export class PubKey extends ScryptType {
  constructor(bytesVal: string) {
    super(bytesVal);
  }
  toLiteral(): string {
    return `PubKey(b'${getValidatedHexString(this._value.toString())}')`;
  }
}

export class Sig extends ScryptType {
  constructor(bytesVal: string) {
    super(bytesVal);
  }
  toLiteral(): string {
    return `Sig(b'${getValidatedHexString(this._value.toString())}')`;
  }
}

export class Ripemd160 extends ScryptType {
  constructor(bytesVal: string) {
    super(bytesVal);
  }
  toLiteral(): string {
    return `Ripemd160(b'${getValidatedHexString(this._value.toString())}')`;
  }
}

export class Sha1 extends ScryptType {
  constructor(bytesVal: string) {
    super(bytesVal);
  }
  toLiteral(): string {
    return `Sha1(b'${getValidatedHexString(this._value.toString())}')`;
  }
}

export class Sha256 extends ScryptType {
  constructor(bytesVal: string) {
    super(bytesVal);
  }
  toLiteral(): string {
    return `Sha256(b'${getValidatedHexString(this._value.toString())}')`;
  }
}

export enum SigHash {
  ALL = 0x01,
  NONE = 0x02,
  SINGLE = 0x03,
  FORKID = 0x40,
  ANYONECANPAY = 0x80,
}

export class SigHashType extends ScryptType {

  constructor(intVal: number) {
    super(intVal);
  }

  toLiteral(): string {
    let hexStr = this._value.toString(16);
    if (hexStr.length % 2) {
      hexStr = '0' + hexStr;
    }
    return `SigHashType(b'${hexStr}')`;
  }

  toString(): string {
    const types: string[] = [];
    let value = this._value as number;

    if ((value & SigHash.ANYONECANPAY) === SigHash.ANYONECANPAY) {
      types.push('SigHash.ANYONECANPAY');
      value = value - SigHash.ANYONECANPAY;
    }

    if ((value & SigHash.SINGLE) === SigHash.SINGLE) {
      types.push('SigHash.SINGLE');
      value = value - SigHash.SINGLE;
    }

    if ((value & SigHash.NONE) === SigHash.NONE) {
      types.push('SigHash.NONE');
      value = value - SigHash.NONE;
    }

    if ((value & SigHash.ALL) === SigHash.ALL) {
      types.push('SigHash.ALL');
      value = value - SigHash.ALL;
    }

    if ((value & SigHash.FORKID) === SigHash.FORKID) {
      types.push('SigHash.FORKID');
      value = value - SigHash.FORKID;
    }

    if (value === 0) {
      return types.join(' | ');
    }

    throw new Error(`unknown sighash type value: ${this._value}`);
  }

}

interface Outpoint { hash: string, index: number, hex: string }

export class SigHashPreimage extends ScryptType {

  constructor(bytesVal: string) {
    super(bytesVal);
    this._buf = Buffer.from(bytesVal, 'hex');
  }

	// raw data
	private _buf: Buffer;

	private getReader(buf: Buffer) {
		return new bsv.encoding.BufferReader(buf);
	}

	// nVersion of the transaction
	get nVersion(): number {
		return this.getReader(this._buf.slice(0, 4)).readUInt32LE();
	}

	// hashPrevouts
	get hashPrevouts(): string {
		return this._buf.slice(4, 4 + 32).toString('hex');
	}

	// hashSequence
	get hashSequence(): string {
		return this._buf.slice(36, 36 + 32).toString('hex');
	}

	// outpoint
	get outpoint(): Outpoint {
    const buf = this._buf.slice(68, 68 + 32 + 4);
    const hex = buf.toString('hex');
    const index = this.getReader(buf.slice(32, 32 + 4)).readUInt32LE();
    const hash = Buffer.from(buf.slice(0, 32)).reverse().toString('hex');
		return {
			hash,
      index,
      hex
		};
	}

	// scriptCode of the input
	get scriptCode(): string {
		return this.getReader(this._buf.slice(104, this._buf.length - 52)).readVarLengthBuffer().toString('hex');
	}

	// value of the output spent by this input
	get amount(): number {
		return this.getReader(this._buf.slice(this._buf.length - 44 - 8, this._buf.length - 44)).readUInt32LE();
	}

	// nSequence of the input
	get nSequence(): number {
		return this.getReader(this._buf.slice(this._buf.length - 40 - 4, this._buf.length - 40)).readUInt32LE();
	}

	// hashOutputs
	get hashOutputs(): string {
		return this._buf.slice(this._buf.length - 8 - 32, this._buf.length - 8).toString('hex');
	}

	// nLocktime of the transaction
	get nLocktime(): number {
		return this.getReader(this._buf.slice(this._buf.length - 4 - 4, this._buf.length - 4)).readUInt32LE();
	}

	// sighash type of the signature
	get sighashType(): number {
		return this.getReader(this._buf.slice(this._buf.length - 4, this._buf.length)).readUInt32LE();
	}

	toString(format = 'hex'): string {
		return this._buf.toString(format);
	}

  toLiteral(): string {
    return `SigHashPreimage(b'${getValidatedHexString(this._value.toString())}')`;
  }

  toJSON() {
    return {
      nVersion: this.nVersion,
      hashPrevouts: this.hashOutputs,
      hashSequence: this.hashSequence,
      outpoint: this.outpoint,
      scriptCode: this.scriptCode,
      amount: this.amount,
      nSequence: this.nSequence,
      hashOutputs: this.hashOutputs,
      nLocktime: this.nLocktime,
      sighashType: new SigHashType(this.sighashType).toString()
    };
  }

}

export class OpCodeType extends ScryptType {
  constructor(bytesVal: string) {
    super(bytesVal);
  }
  toLiteral(): string {
    return `OpCodeType(b'${getValidatedHexString(this._value.toString())}')`;
  }
}


export type SingletonParamType = ScryptType | boolean | number | bigint;


type MAP<T> =   {
  [key: string]: T;
}

type StructObject = MAP<SingletonParamType>;

export class Struct {

  constructor(o: StructObject) {
    return new Proxy(o, {});
  }
}


export type SupportedParamType = SingletonParamType | SingletonParamType[] | Struct;