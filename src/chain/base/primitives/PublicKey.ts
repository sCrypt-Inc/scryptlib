import { Point } from "./Point";
import { PrivateKey } from "./PrivateKey";
import { Signature } from "./Signature";


export interface PublicKey extends Point {
    verify(msg: number[] | string, sig: Signature, enc?: 'hex' | 'utf8'): boolean;
    toDER(): string;
    toHash(enc?: 'hex'): number[] | string;
    toAddress(prefix: number[]): string;
    deriveChild(privateKey: PrivateKey, invoiceNumber: string): PublicKey;
}