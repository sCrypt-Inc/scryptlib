import { bsv } from './utils';

/*
 * a varint serializer into Script ASM
 */

const BN = bsv.crypto.BN;

function serializeBool(flag: boolean): string {
    return flag ? '01' : '00';
}

// TODO: handle bigint
function serializeInt(n: number): string {
    // special case: otherwise it returns empty string
    if (n === 0) {
        return '00';
    }

    const num = BN.fromNumber(n);
    return num.toSM({ endian: 'little' }).toString('hex');
}

// TODO: validate
function serializeBytes(hexStr: string): string {
    return hexStr;
}

function serialize(x: any) {
    const t = typeof x;

    switch (t) {
        case 'boolean':
            return serializeBool(x);
        case 'number':
            return serializeInt(x);
        case 'string':
            return serializeBytes(x);
        default:
            throw new Error(`cannot serialize value of type '${t}': '${x}'`);
    }
}

export function serializeState(state: unknown): string {
    const asms = [];
    let stateLen = 0;

    Object.values(state).forEach(s => {
        const asm = serialize(s);
        // TODO: handle long data OP_PUSHDATAx, whose length byte exceeds 1
        stateLen += 1 /* length byte */ + asm.length / 2;
        asms.push(asm);
    });

    const len = serializeInt(stateLen);
    asms.push(len);
    return asms.join(' ');
}
