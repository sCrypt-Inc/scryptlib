
import { BigNumber } from "./BigNumber";

export interface Signature {

    /**
 * @property Represents the "r" component of the digital signature
 */
    r: BigNumber

    /**
     * @property Represents the "s" component of the digital signature
     */
    s: BigNumber


    toString(enc?: 'hex' | 'base64');

    toDER(enc?: 'hex' | 'base64'): number[] | string;
}