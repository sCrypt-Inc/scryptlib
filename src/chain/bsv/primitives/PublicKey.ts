
import * as bsv from "@bsv/sdk";
import { PublicKey } from "../../base/primitives/PublicKey";
import { TARGET } from "../target";


export default function createPublicKeyProxy(key: bsv.PublicKey): PublicKey {
    return new Proxy<bsv.PublicKey>(key, {

        get: function (target, prop) {

            if (prop === TARGET) {
                return target
            }

            return Reflect.get(target, prop);
        }
    }) as unknown as PublicKey;
}