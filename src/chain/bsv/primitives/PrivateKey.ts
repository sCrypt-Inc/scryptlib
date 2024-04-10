
import * as bsv from "@bsv/sdk";
import { PrivateKey } from "../../base/primitives/PrivateKey";
import { TARGET } from "../target";


export default function createPrivateKeyProxy(key: bsv.PrivateKey): PrivateKey {
    const handler = {

        get: function (target, prop) {

            if (prop === TARGET) {
                return target
            }

            if (prop === 'sign') {
                return () => {

                }
            }
            return Reflect.get(target, prop);
        }
    };

    return new Proxy<bsv.PrivateKey>(key, handler) as PrivateKey;
}