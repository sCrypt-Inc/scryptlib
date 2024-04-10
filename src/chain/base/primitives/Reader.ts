export interface Reader {
    bin: number[];
    pos: number;
    eof(): boolean;
    read(len?: number): number[];
    readReverse(len?: number): number[]
    readUInt8(): number;
    readInt8(): number;
    readUInt16BE(): number;
    readInt16BE(): number;
    readUInt16LE(): number;
    readInt16LE(): number;
    readUInt32BE(): number;
    readInt32BE(): number;
    readUInt32LE(): number;
    readInt32LE(): number;
    readUInt64BEBn(): bigint;

    readUInt64LEBn(): bigint;

    readVarIntNum(): number;

    readVarInt(): number[];

    readVarIntBn(): bigint;
}