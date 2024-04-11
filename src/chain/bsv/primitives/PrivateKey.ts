
import * as bsv from "@bsv/sdk";
import { PrivateKey } from "../../base/primitives/PrivateKey";
import { TARGET } from "../target";


export function createPrivateKeyProxy(key: bsv.PrivateKey): PrivateKey {
    const handler = {

        get: function (target, prop) {

            if (prop === TARGET) {
                return target
            }


            return Reflect.get(target, prop);
        }
    };

    return new Proxy<bsv.PrivateKey>(key, handler);
}