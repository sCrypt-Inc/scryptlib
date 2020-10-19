import { bsv, num2bin } from './utils';

/*
 * a varint serializer into Script ASM
 */
const Script = bsv.Script;
const BN = bsv.crypto.BN;
// number of bytes to denote state length after serialization, exclusing varint prefix
const STATE_LEN = 4;

function serializeBool(flag: boolean): string {
    return flag ? '01' : '00';
}

function serializeInt(n: number | bigint): string {
    // special case: otherwise it returns empty string
    if (n === 0) {
        return '00';
    }

    const num = new BN(n);
    return num.toSM({ endian: 'little' }).toString('hex');
}

// TODO: validate
function serializeBytes(hexStr: string): string {
    return hexStr;
}

function serialize(x: boolean | number | bigint | string) {
    const s = x.toString()
    if (s === '0' || s === '-1') {
        return x.toString()
    } if (typeof x === 'boolean') {
        return serializeBool(x);
    } if (typeof x === 'number' || typeof x === 'bigint') {
        return serializeInt(x);
    } else {
        return serializeBytes(x);
    }
}

export type State = Record<string, boolean | number | bigint | string>
export type StateArray = Array<boolean | number | bigint | string>

// serialize contract state into Script ASM
export function serializeState(state: State | StateArray): string {
    const asms = [];

    Object.values(state).forEach(s => {
        const str = serialize(s);
        asms.push(str);
    });

    const script = Script.fromASM(asms.join(' '))

    const scriptHex = script.toHex()
    const stateLen = scriptHex.length/2;

    // use fixed size (4 bytes) to denote state len
    const len = num2bin(stateLen, STATE_LEN);
    return script.toASM() + ' ' + len;
}
