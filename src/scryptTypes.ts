import { literal2Asm, getValidatedHexString } from "./utils";

export abstract class ScryptType {

  protected _value: number | BigInt | boolean | string;
  protected _literal: string;
  private _asm: string;

  constructor(value: number | BigInt | boolean | string) {
    try {
      this._value = value;
      this._literal = this.toLiteral();
      const [asm, scrType] = literal2Asm(this._literal);
      if (this.constructor.name.toLowerCase() !== scrType.toLowerCase()) {
        throw new Error(`type mismatch ${scrType} for ${this.constructor.name}`);
      }
      this._asm = asm;
    } catch (error) {
      throw new Error(`constructor param for ${this.constructor.name} ${error.message}`);
    }
  }

  get value(): number| BigInt | boolean | string {
    return this._value;
  }

  get literal(): string {
    return this._literal;
  }

  toASM(): string {
    return this._asm;
  }

  abstract toLiteral(): string;
}

export class Int extends ScryptType {
  constructor(intVal: number | BigInt) {
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
  constructor(intVal: number) {
    super(intVal);
  }
  toLiteral(): string {
    return `PrivKey(${this._value})`;
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

export class SigHashType extends ScryptType {
  constructor(bytesVal: string) {
    super(bytesVal);
  }
  toLiteral(): string {
    return `SigHashType(b'${getValidatedHexString(this._value.toString())}')`;
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
