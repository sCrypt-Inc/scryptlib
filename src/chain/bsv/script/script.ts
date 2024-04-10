
import { Script as BSVScript, BigNumber, } from "@bsv/sdk";
import { Script } from "../../base/script/Script";
import { TARGET } from "../target";


export default function createScriptProxy(script: BSVScript): Script {

    return new Proxy<BSVScript>(script, {
        // target represents the Person while prop represents
        // proxy property.
        get: function (target, prop) {
            if (prop === TARGET) {
                return target
            }
            if (prop === 'writeBn') {
                return function (bn: bigint) {
                    return Reflect.apply(target[prop], this, [new BigNumber(bn.toString())]);
                };
            }

            return Reflect.get(target, prop);
        }
    }) as unknown as Script;

}