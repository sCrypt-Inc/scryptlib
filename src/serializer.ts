import { bin2num, bsv, num2bin } from './utils';

const Script = bsv.Script;
const Opcode = bsv.Opcode;
const BN = bsv.crypto.BN;
// number of bytes to denote state length after serialization, exclusing varint prefix
export const STATE_LEN_2BYTES = 2;
export const STATE_LEN_4BYTES = 4;

function serializeBool(flag: boolean): string {
  return flag ? 'OP_TRUE' : 'OP_FALSE';
}

export function serializeInt(n: number | bigint | string): string {
  let num = new BN(n);
  if (typeof n === 'string') {
    if (n.startsWith('0x')) {
      num = new BN(n.substr(2), 16);
    }
  }

  if (num.eqn(0)) {
    return '00';
  }
  return num.toSM({ endian: 'little' }).toString('hex');
}

function serializeString(str: string) {
  if (str === '') {
    return '00';
  }
  const buf = Buffer.from(str, 'utf8');
  return buf.toString('hex');
}

// TODO: validate
function serializeBytes(hexStr: string): string {
  return hexStr;
}

export type State = Record<string, boolean | number | bigint | string>;
export type StateArray = Array<boolean | number | bigint | string>;

function serializeWithSchema(state: State | StateArray, key: string | number, schema: State | StateArray = undefined) {
  const type = schema[key];
  if (type === 'boolean') {
    return serializeBool(state[key]);
  } else if (type === 'number') {
    return serializeInt(state[key]);
  } else if (type === 'bigint') {
    return serializeInt(state[key]);
  } else if (type === 'string') {
    return serializeString(state[key]);
  } else {
    return serializeBytes(state[key]);
  }
}

export function serialize(x: boolean | number | bigint | string): string {
  if (typeof x === 'boolean') {
    return serializeBool(x);
  }
  if (typeof x === 'number') {
    return serializeInt(x);
  }
  if (typeof x === 'bigint') {
    return serializeInt(x);
  } else {
    return serializeBytes(x);
  }
}

// serialize contract state into Script ASM
export function serializeState(state: State | StateArray, stateBytes: number = STATE_LEN_2BYTES, schema: State | StateArray = undefined): string {
  const asms = [];

  const keys = Object.keys(state);
  for (const key of keys) {
    if (schema) {
      const str = serializeWithSchema(state, key, schema);
      asms.push(str);
    } else {
      const str = serialize(state[key]);
      asms.push(str);
    }
  }

  const script = Script.fromASM(asms.join(' '));
  const scriptHex = script.toHex();
  const stateLen = scriptHex.length / 2;

  // use fixed size to denote state len
  const len = num2bin(stateLen, stateBytes);
  return script.toASM() + ' ' + len;
}

class OpState {
  public op: any;

  constructor(op) {
    this.op = op;
  }

  toNumber(): number | string | bigint {

    if (this.op.opcodenum === Opcode.OP_1) {
      return Number(1);
    } else if (this.op.opcodenum === Opcode.OP_0) {
      return Number(0);
    } else if (this.op.opcodenum === Opcode.OP_1NEGATE) {
      return Number(-1);
    } else if (this.op.opcodenum >= Opcode.OP_2 && this.op.opcodenum <= Opcode.OP_16) {
      return Number(this.op.opcodenum - Opcode.OP_2 + 2);
    } else {
      if (!this.op.buf) throw new Error('state does not have a number representation');
      return Number(bin2num(this.op.buf));
    }

  }

  toBigInt(): bigint {
    if (this.op.opcodenum === Opcode.OP_1) {
      return BigInt(1);
    } else if (this.op.opcodenum === Opcode.OP_0) {
      return BigInt(0);
    } else if (this.op.opcodenum === Opcode.OP_1NEGATE) {
      return BigInt(-1);
    } else if (this.op.opcodenum >= Opcode.OP_2 && this.op.opcodenum <= Opcode.OP_16) {
      return BigInt(this.op.opcodenum - Opcode.OP_2 + 2);
    } else {
      if (!this.op.buf) throw new Error('state does not have a number representation');
      return BigInt(bin2num(this.op.buf));
    }
  }

  toBoolean(): boolean {
    return this.toNumber() !== Number(0);
  }

  toHex(): string {
    if (!this.op.buf) throw new Error('state does not have a hexadecimal representation');
    return this.op.buf.toString('hex');
  }

  toString(arg = 'utf8') {
    if (!this.op.buf) { throw new Error('state does not have a string representation'); }
    if (this.op.buf[0] === 0) {
      return '';
    }
    return this.op.buf.toString(arg);
  }
}

export type OpStateArray = Array<OpState>

// deserialize Script or Script Hex or Script ASM Code to contract state array and object
export function deserializeState(s: string | bsv.Script, schema: State | StateArray = undefined): OpStateArray | State | StateArray {
  let script: bsv.Script;
  try {
    script = new Script(s);
  } catch (e) {
    script = Script.fromASM(s);
  }
  const chunks = script.chunks;
  const states = [];
  const pos = chunks.length;
  //the last opcode is length of stats, skip
  for (let i = pos - 2; i >= 0; i--) {
    const opcodenum = chunks[i].opcodenum;
    if (opcodenum === Opcode.OP_RETURN) {
      break;
    } else {
      states.unshift(new OpState(chunks[i]));
    }
  }

  //deserialize to an array
  if (!schema) {
    return states;
  }

  //deserialize to an object
  let ret: State | StateArray;
  if (Array.isArray(schema)) {
    ret = [];
  } else {
    ret = {};
  }
  const keys = Object.keys(schema);
  for (let i = 0; i < states.length; i++) {
    const key = keys[i];
    if (!key) {
      break;
    }
    const val = schema[key];
    if (val === 'boolean' || typeof val === 'boolean') {
      ret[key] = states[i].toBoolean();
    } else if (val === 'number' || typeof val === 'number') {
      ret[key] = states[i].toNumber();
    } else if (val === 'bigint' || typeof val === 'bigint') {
      if (typeof BigInt === 'function') {
        ret[key] = states[i].toBigInt();
      } else {
        ret[key] = states[i].toNumber();
      }
    } else if (val === 'string') {
      ret[key] = states[i].toString();
    } else {
      ret[key] = states[i].toHex();
    }
  }

  return ret;
}
