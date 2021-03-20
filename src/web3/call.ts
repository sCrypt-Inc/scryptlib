import { UTXO, Output} from "./wallet"
import { AbstractContract, buildContractClass, buildTypeClasses } from "../contract";
import { ScryptType, SupportedParamType } from "../scryptTypes";
export interface Call {
    contract: AbstractContract;
    params: SupportedParamType[];
    method: string;
}

type IBuilder<T> = {
    [k in keyof T]: (arg: T[k]) => IBuilder<T>
} & { build(): T }


export let CallBuilder = {} as IBuilder<Call>