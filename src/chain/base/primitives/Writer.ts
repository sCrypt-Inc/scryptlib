import { BigNumber } from "./BigNumber";

export interface Writer {
    bufs: number[][]
    getLength(): number;
    toArray(): number[];
    write(buf: number[]): Writer;
    writeReverse(buf: number[]): Writer;
    writeUInt8(n: number): Writer;

    writeInt8(n: number): Writer;
    writeUInt16BE(n: number): Writer;

    writeInt16BE(n: number): Writer;

    writeUInt16LE(n: number): Writer;

    writeInt16LE(n: number): Writer;

    writeUInt32BE(n: number): Writer;

    writeInt32BE(n: number): Writer;

    writeUInt32LE(n: number): Writer;

    writeInt32LE(n: number): Writer;

    writeUInt64BEBn(bn: bigint | BigNumber): Writer;

    writeUInt64LEBn(bn: bigint | BigNumber): Writer;

    writeUInt64LE(n: number): Writer;

    writeVarIntNum(n: number): Writer;

    writeVarIntBn(bn: bigint | BigNumber): Writer;


}