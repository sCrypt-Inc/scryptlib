import { Script, ScriptChunk } from "./script/Script";

import { UnlockingScript } from "./script/UnlockingScript";
import { LockingScript } from "./script/LockingScript";
import { Transaction } from "./transaction/Transaction";
import { PrivateKey } from "./primitives/PrivateKey";
import { PublicKey } from "./primitives/PublicKey";
import { TransactionInput } from "./transaction/TransactionInput";
import { TransactionOutput } from "./transaction/TransactionOutput";
import { Reader } from "./primitives/Reader";
import { Writer } from "./primitives/Writer";
import { IOP } from "./iop";
import { Spend } from "./script/Spend";


interface ITransaction {
    fromHex: (hex: string) => Transaction
    from: (version?: number,
        inputs?: TransactionInput[],
        outputs?: TransactionOutput[],
        lockTime?: number,
        metadata?: Record<string, any>) => Transaction;
    fromBinary: (bin: number[]) => Transaction
}


interface IUnlockingScript {
    fromHex: (hex: string) => UnlockingScript,
    fromASM: (asm: string) => UnlockingScript,
    fromBinary: (bin: number[]) => UnlockingScript,
    from: (chunks?: ScriptChunk[]) => UnlockingScript,
}

interface IScript {
    fromHex: (hex: string) => Script,
    fromASM: (asm: string) => Script,
    fromBinary: (bin: number[]) => Script,
    from: (chunks?: ScriptChunk[]) => Script,
}

interface ILockingScript {
    fromHex: (hex: string) => LockingScript,
    fromASM: (asm: string) => LockingScript,
    fromBinary: (bin: number[]) => LockingScript,
    from: (chunks?: ScriptChunk[]) => LockingScript,
}

interface IPrivateKey {
    fromRandom: () => PrivateKey,
    fromString: (str: string, base: number | 'hex') => PrivateKey,
    fromWif: (wif: string, prefixLength?: number) => PrivateKey,

    from: (number: bigint | number | string | number[],
        base?: number | 'be' | 'le' | 'hex',
        endian?: 'be' | 'le',
        modN?: 'apply' | 'nocheck' | 'error') => PrivateKey,
}


interface IPublicKey {
    fromPrivateKey: (key: PrivateKey) => PublicKey,
    fromString: (str: string) => PublicKey,
    from: (x: bigint | number | number[] | string,
        y: bigint | number | number[] | string) => PublicKey,
}


interface IHash {
    ripemd160: (msg: number[] | string, enc?: 'hex' | 'utf8') => number[];
    sha1: (msg: number[] | string, enc?: 'hex' | 'utf8') => number[];
    sha256: (msg: number[] | string, enc?: 'hex' | 'utf8') => number[];
    sha512: (msg: number[] | string, enc?: 'hex' | 'utf8') => number[];
    hash256: (msg: number[] | string, enc?: 'hex' | 'utf8') => number[];
    hash160: (msg: number[] | string, enc?: 'hex' | 'utf8') => number[];
    sha256hmac: (key: number[] | string, msg: number[] | string, enc?: 'hex') => number[];
    sha512hmac: (key: number[] | string, msg: number[] | string, enc?: 'hex') => number[];
}

interface IUtils {

    toHex: (msg: number[]) => string;
    toArray: (msg: any, enc?: 'hex' | 'utf8' | 'base64') => any[];
    toUTF8: (arr: number[]) => string;
    encode: (arr: number[], enc?: 'hex' | 'utf8') => string | number[];
    toBase64: (byteArray: number[]) => string;

    fromBase58: (str: string) => number[];
    toBase58: (bin: number[]) => string;
    toBase58Check: (bin: number[], prefix?: number[]) => string;

    fromBase58Check: (str: string, enc?: 'hex', prefixLength?: number) => {
        prefix: string | number[],
        data: string | number[],
    }

    getPreimage(tx: Transaction, subscript: LockingScript, inputAmount: number, inputIndex?: number, sighashType?: number): number[];


    num2bin(n: bigint, dataLen?: number): number[];
    bin2num(bin: number[]): bigint;

    num2asm(n: bigint): string;

    asm2num(asm: string): bigint;

    signTx(tx: Transaction, privateKey: PrivateKey, subscript: LockingScript, inputAmount: number, inputIndex?: number, sighashType?: number): string;
}

interface IReader {
    from: (bin?: number[], pos?: number) => Reader;
}

interface IWriter {
    from: (bufs?: number[][]) => Writer;
}


interface ISpend {
    from: (params: {
        sourceTXID: string
        sourceOutputIndex: number
        sourceSatoshis: number
        lockingScript: LockingScript
        transactionVersion: number
        otherInputs: TransactionInput[]
        outputs: TransactionOutput[]
        unlockingScript: UnlockingScript
        inputSequence: number
        inputIndex: number
        lockTime: number
    }) => Spend;
}



export interface Factory {
    Transaction: ITransaction,
    UnlockingScript: IUnlockingScript,
    LockingScript: ILockingScript,

    Script: IScript,
    PrivateKey: IPrivateKey,
    PublicKey: IPublicKey,
    Hash: IHash,
    Utils: IUtils,
    Reader: IReader,
    Writer: IWriter,
    OP: IOP,
    Spend: ISpend,

}