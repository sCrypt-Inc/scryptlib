import { Signature } from "./Signature";
import { PublicKey } from "./PublicKey";
import { Point } from "./Point";
import { BigNumber } from "./BigNumber";


export interface PrivateKey extends BigNumber {

    isValid(): boolean;
    toPublicKey(): PublicKey;
    toWif(prefix?: number[]): string;

    toAddress(prefix?: number[]): string;
    // eslint-disable-next-line @typescript-eslint/ban-types
    sign(msg: number[] | string, enc?: 'hex' | 'utf8', forceLowS?: boolean, customK?: Function | BigNumber | bigint): Signature
    verify(msg: number[] | string, sig: Signature, enc?: 'hex'): boolean
    deriveSharedSecret(key: PublicKey): Point;
    deriveChild(publicKey: PublicKey, invoiceNumber: string): PrivateKey;
}