import { Transaction, PrivateKey, LockingScript } from "../../base";
import * as bsv from "@bsv/sdk";
import { TARGET } from "../target";


export function toHex(bin: number[]): string {
    return bsv.Utils.toHex(bin);
}

export function getPreimage(tx: Transaction, subscript: LockingScript, inputAmount: number, inputIndex = 0, sighashType: number = 65): number[] {


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
}

export function num2bin(n: bigint, dataLen?: number): number[] {
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
}

export function bin2num(bin: number[]): bigint {
    const bn = bsv.BigNumber.fromSm(bin, 'little');
    return BigInt(bn.toString());
}


export function num2asm(n: bigint): string {
    const number = new bsv.BigNumber(n.toString());
    if (number.eqn(-1)) { return 'OP_1NEGATE'; }

    if (number.gten(0) && number.lten(16)) { return 'OP_' + number.toString(); }

    return number.toHex();
}

export function asm2num(asm: string): bigint {
    switch (asm) {
        case 'OP_1NEGATE':
            return BigInt(-1);
        case '0':
        case 'OP_0':
        case 'OP_1':
        case 'OP_2':
        case 'OP_3':
        case 'OP_4':
        case 'OP_5':
        case 'OP_6':
        case 'OP_7':
        case 'OP_8':
        case 'OP_9':
        case 'OP_10':
        case 'OP_11':
        case 'OP_12':
        case 'OP_13':
        case 'OP_14':
        case 'OP_15':
        case 'OP_16':
            return BigInt(asm.replace('OP_', ''));
        default: {
            const bn = bsv.BigNumber.fromHex(asm, 'little');
            return BigInt(bn.toString())
        }
    }
}

export function signTx(tx: Transaction, privateKey: PrivateKey, subscript: LockingScript, inputAmount: number, inputIndex = 0, sighashType: number = 65): string {

    if (!tx) {
        throw new Error('param tx can not be empty');
    }

    if (!privateKey) {
        throw new Error('param privateKey can not be empty');
    }

    if (!inputAmount) {
        throw new Error('param inputAmount can not be empty');
    }

    const preimage = getPreimage(tx, subscript, inputAmount, inputIndex, sighashType);

    const rawSignature = privateKey.sign(bsv.Hash.sha256(preimage, 'hex'))
    const sig = new bsv.TransactionSignature(
        rawSignature.r as bsv.BigNumber,
        rawSignature.s as bsv.BigNumber,
        sighashType
    )
    const sigForScript = sig.toChecksigFormat()

    return toHex(sigForScript);
}