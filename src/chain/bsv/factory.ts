
import {
    OP, Factory, Transaction, TransactionOutput,
    TransactionInput, PrivateKey, PublicKey, UnlockingScript,
    LockingScript, ScriptChunk
} from "../base";
import * as bsv from "@bsv/sdk";
import createScriptProxy from "./script/script";
import createTransactionProxy from "./transaction/transaction";
import createPrivateKeyProxy from "./primitives/PrivateKey";
import createPublicKeyProxy from "./primitives/PublicKey";
import createReaderProxy from "./primitives/Reader";
import createWriterProxy from "./primitives/Writer";
import { TARGET } from "./target";



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

            const txTarget = tx[TARGET] as bsv.Transaction;

            const subscriptTarget = subscript[TARGET] as bsv.LockingScript;

            const input = txTarget.inputs[inputIndex]
            const otherInputs = txTarget.inputs.filter((_, index) => index !== inputIndex)

            const sourceTXID = input.sourceTXID || input.sourceTransaction?.id('hex') as string;
            if (!sourceTXID) {
                // Question: Should the library support use-cases where the source transaction is not provided? This is to say, is it ever acceptable for someone to sign an input spending some output from a transaction they have not provided? Some elements (such as the satoshi value and output script) are always required. A merkle proof is also always required, and verifying it (while also verifying that the claimed output is contained within the claimed transaction) is also always required. This seems to require the entire input transaction.
                throw new Error(
                    'The source transaction is needed for transaction signing.'
                )
            }

            const preimage = bsv.TransactionSignature.format({
                sourceTXID: sourceTXID,
                sourceOutputIndex: input.sourceOutputIndex,
                sourceSatoshis: inputAmount,
                transactionVersion: txTarget.version,
                otherInputs,
                inputIndex,
                outputs: txTarget.outputs,
                inputSequence: input.sequence,
                subscript: subscriptTarget,
                lockTime: tx.lockTime,
                scope: sighashType
            })

            return preimage;
        },
        num2bin: function (n: bigint, dataLen?: number): number[] {
            const num = new bsv.BigNumber(n.toString());

            if (typeof dataLen === 'undefined') {
                return num.toSm('little');
            }

            const arr = num.toSm('little');

            if (arr.length > dataLen) {
                throw new Error(`${n} cannot fit in ${dataLen} byte[s]`);
            }

            if (arr.length === dataLen) {
                return arr;
            }

            const paddingLen = dataLen - arr.length;

            let m = arr[arr.length - 1];

            const rest = arr.slice(0, arr.length - 1);
            if (num.isNeg()) {
                // reset sign bit
                m &= 0x7F;
            }

            const padding = Array(paddingLen).fill(0);
            if (num.isNeg()) {
                padding[arr.length - 1] = 0x80
            }
            return rest.concat([m]).concat(padding);
        },
        bin2num: function (bin: number[]): bigint {
            const bn = bsv.BigNumber.fromSm(bin, 'little');
            return BigInt(bn.toString());
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

    OP = OP

}