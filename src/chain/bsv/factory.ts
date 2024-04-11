
import {
    OP, Factory, Transaction, TransactionOutput,
    TransactionInput, PrivateKey, PublicKey, UnlockingScript,
    LockingScript, ScriptChunk,
    Script, Spend
} from "../base";
import * as bsv from "@bsv/sdk";
import { createScriptProxy } from "./script/Script";
import { createTransactionProxy } from "./transaction/Transaction";
import { createPrivateKeyProxy } from "./primitives/PrivateKey";
import { createPublicKeyProxy } from "./primitives/PublicKey";
import { createReaderProxy } from "./primitives/Reader";
import { createWriterProxy } from "./primitives/Writer";
import { createSpendProxy } from "./script/Spend";
import { getPreimage, num2bin, bin2num, num2asm, asm2num, signTx } from "./primitives/Utils";



export class BSVFactory implements Factory {
    Reader = {
        from: function (bin?: number[], pos?: number) {
            return createReaderProxy(new bsv.Utils.Reader(bin, pos));
        }
    };
    Writer = {
        from: function (bufs?: number[][]) {
            return createWriterProxy(new bsv.Utils.Writer(bufs));
        }
    };
    Hash = {
        ripemd160: function (msg: string | number[], enc?: "hex" | "utf8"): number[] {
            return bsv.Hash.ripemd160(msg, enc);
        },
        sha1: function (msg: string | number[], enc?: "hex" | "utf8"): number[] {
            return bsv.Hash.sha1(msg, enc);
        },
        sha256: function (msg: string | number[], enc?: "hex" | "utf8"): number[] {
            return bsv.Hash.sha256(msg, enc);
        },
        sha512: function (msg: string | number[], enc?: "hex" | "utf8"): number[] {
            return bsv.Hash.sha512(msg, enc);
        },
        hash256: function (msg: string | number[], enc?: "hex" | "utf8"): number[] {
            return bsv.Hash.hash256(msg, enc);
        },
        hash160: function (msg: string | number[], enc?: "hex" | "utf8"): number[] {
            return bsv.Hash.hash160(msg, enc);
        },
        sha256hmac: function (key: string | number[], msg: string | number[], enc?: "hex"): number[] {
            return bsv.Hash.sha256hmac(msg, enc);
        },
        sha512hmac: function (key: string | number[], msg: string | number[], enc?: "hex"): number[] {
            return bsv.Hash.sha512hmac(msg, enc);
        }
    }
    Utils = {
        toHex: function (msg: number[]): string {
            return bsv.Utils.toHex(msg);
        },
        toArray: function (msg: any, enc?: "hex" | "utf8" | "base64"): any[] {
            return bsv.Utils.toArray(msg, enc);
        },
        toUTF8: function (arr: number[]): string {
            return bsv.Utils.toUTF8(arr);
        },
        encode: function (arr: number[], enc?: "hex" | "utf8"): string | number[] {
            return bsv.Utils.encode(arr, enc);
        },
        toBase64: function (byteArray: number[]): string {
            return bsv.Utils.toBase64(byteArray);
        },
        fromBase58: function (str: string): number[] {
            return bsv.Utils.fromBase58(str);
        },
        toBase58: function (bin: number[]): string {
            return bsv.Utils.toBase58(bin);
        },
        toBase58Check: function (bin: number[], prefix?: number[]): string {
            return bsv.Utils.toBase58Check(bin, prefix);
        },
        fromBase58Check: function (str: string, enc?: "hex", prefixLength?: number): { prefix: string | number[]; data: string | number[]; } {
            return bsv.Utils.fromBase58Check(str, enc, prefixLength);
        },
        getPreimage: function (tx: Transaction, subscript: LockingScript, inputAmount: number, inputIndex?: number, sighashType?: number): number[] {
            return getPreimage(tx, subscript, inputAmount, inputIndex, sighashType);
        },
        num2bin: function (n: bigint, dataLen?: number): number[] {
            return num2bin(n, dataLen);
        },
        bin2num: function (bin: number[]): bigint {
            return bin2num(bin);
        },
        num2asm: function (n: bigint): string {
            return num2asm(n);
        },
        asm2num(asm: string): bigint {
            return asm2num(asm);
        },
        signTx: function (tx: Transaction, privateKey: PrivateKey, subscript: LockingScript, inputAmount: number, inputIndex?: number, sighashType?: number): string {
            return signTx(tx, privateKey, subscript, inputAmount, inputIndex, sighashType);
        }

    };
    PublicKey = {
        fromPrivateKey: function (key: PrivateKey): PublicKey {
            const k = Object.getPrototypeOf(key) as bsv.PrivateKey;
            return createPublicKeyProxy(bsv.PublicKey.fromPrivateKey(k))
        },
        fromString: function (str: string): PublicKey {
            return createPublicKeyProxy(bsv.PublicKey.fromString(str))
        },
        from: function (x: bigint | number | number[] | string | null,
            y?: bigint | number | number[] | string | null): PublicKey {

            if (typeof x === 'bigint' && typeof y === 'bigint') {
                return createPublicKeyProxy(new bsv.PublicKey(new bsv.BigNumber(x.toString()), new bsv.BigNumber(y.toString())))
            }

            if (typeof x === 'bigint' && typeof y !== 'bigint') {
                return createPublicKeyProxy(new bsv.PublicKey(new bsv.BigNumber(x.toString()), y))
            } else if (typeof x !== 'bigint' && typeof y === 'bigint') {
                return createPublicKeyProxy(new bsv.PublicKey(x, new bsv.BigNumber(y.toString())))
            }

            if (typeof x !== 'bigint' && typeof y !== 'bigint') {
                return createPublicKeyProxy(new bsv.PublicKey(x, y))
            }

        },
    };
    PrivateKey = {
        fromRandom: function (): PrivateKey {
            return createPrivateKeyProxy(bsv.PrivateKey.fromRandom())
        },
        fromString: function (str: string, base: number | 'hex'): PrivateKey {
            return createPrivateKeyProxy(bsv.PrivateKey.fromString(str, base))
        },
        fromWif: function (wif: string, prefixLength?: number): PrivateKey {
            return createPrivateKeyProxy(bsv.PrivateKey.fromWif(wif, prefixLength))
        },

        from: function (number: bigint | number | string | number[],
            base?: number | 'be' | 'le' | 'hex',
            endian?: 'be' | 'le',
            modN?: 'apply' | 'nocheck' | 'error'): PrivateKey {

            if (typeof number === 'bigint') {
                return createPrivateKeyProxy(new bsv.PrivateKey(new bsv.BigNumber(number.toString()), base, endian, modN))
            }
            return createPrivateKeyProxy(new bsv.PrivateKey(number, base, endian, modN))
        },
    };

    Transaction = {
        fromHex: function (hex: string): Transaction {
            return createTransactionProxy(bsv.Transaction.fromHex(hex));
        },
        fromBinary: function (bin: number[]): Transaction {
            return createTransactionProxy(bsv.Transaction.fromBinary(bin));
        },
        from: function (version?: number,
            inputs?: TransactionInput[],
            outputs?: TransactionOutput[],
            lockTime?: number,
            metadata?: Record<string, any>): Transaction {

            return createTransactionProxy(new bsv.Transaction(version,
                inputs as unknown as (bsv.TransactionInput[]),
                outputs as unknown as (bsv.TransactionOutput[]),
                lockTime, metadata));
        }
    }

    UnlockingScript = {
        fromHex: function (hex: string): UnlockingScript {
            return createScriptProxy(bsv.UnlockingScript.fromHex(hex));
        },
        fromASM: function (asm: string): UnlockingScript {
            return createScriptProxy(bsv.UnlockingScript.fromASM(asm));
        },
        fromBinary: function (bin: number[]): UnlockingScript {
            return createScriptProxy(bsv.UnlockingScript.fromBinary(bin));
        },
        from: function (chunks: ScriptChunk[] = []): UnlockingScript {
            return createScriptProxy(new bsv.UnlockingScript(chunks));
        }
    }

    LockingScript = {
        fromHex: function (hex: string): LockingScript {
            return createScriptProxy(bsv.LockingScript.fromHex(hex));
        },
        fromASM: function (asm: string): LockingScript {
            return createScriptProxy(bsv.LockingScript.fromASM(asm));
        },
        fromBinary: function (bin: number[]): LockingScript {
            return createScriptProxy(bsv.LockingScript.fromBinary(bin));
        },
        from: function (chunks: ScriptChunk[] = []): LockingScript {
            return createScriptProxy(new bsv.LockingScript(chunks));
        }
    }

    Script = {
        fromHex: function (hex: string): Script {
            return createScriptProxy(bsv.Script.fromHex(hex));
        },
        fromASM: function (asm: string): Script {
            return createScriptProxy(bsv.Script.fromASM(asm));
        },
        fromBinary: function (bin: number[]): Script {
            return createScriptProxy(bsv.Script.fromBinary(bin));
        },
        from: function (chunks: ScriptChunk[] = []): Script {
            return createScriptProxy(new bsv.Script(chunks));
        }
    }

    OP = OP

    Spend = {
        from: function (params: {
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
        }): Spend {

            // const p = {
            //     sourceTXID: params.sourceTXID,
            //     sourceOutputIndex: params.sourceOutputIndex,
            //     sourceSatoshis: params.sourceSatoshis,
            //     lockingScript: params.lockingScript[TARGET] as bsv.LockingScript,
            //     transactionVersion: params.transactionVersion,
            //     otherInputs: params.otherInputs,
            //     outputs: params.outputs,
            //     unlockingScript: params.unlockingScript[TARGET] as bsv.UnlockingScript,
            //     inputSequence: params.inputSequence,
            //     inputIndex: params.inputIndex,
            //     lockTime: params.lockTime,
            // }

            return createSpendProxy(new bsv.Spend(params as any));
        }
    }
}