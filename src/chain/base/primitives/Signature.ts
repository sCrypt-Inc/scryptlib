
import { PublicKey } from "./PublicKey";


export interface Signature {
    verify(msg: number[] | string, key: PublicKey, enc?: 'hex'): boolean;
    toString(enc?: 'hex' | 'base64');

    toDER(enc?: 'hex' | 'base64'): number[] | string;
}