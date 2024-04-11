
import { TARGET } from "../target";
import { Signature } from "../../base/primitives/Signature";
import * as bsv from "@bsv/sdk";


export function createSignatureProxy(key: bsv.Signature): Signature {
    return new Proxy<bsv.Signature>(key, {

        get: function (target, prop) {

            if (prop === TARGET) {
                return target
            }

            return Reflect.get(target, prop);
        }
    });
}