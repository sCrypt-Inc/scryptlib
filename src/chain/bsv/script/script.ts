
import * as bsv from "@bsv/sdk";
import { Script } from "../../base/script/Script";
import { TARGET } from "../target";
import { BigNumber } from "../../base";

export function createScriptProxy(script: bsv.Script): Script {

    return new Proxy<bsv.Script>(script, {
        // target represents the Person while prop represents
        // proxy property.
        get: function (target, prop) {
            if (prop === TARGET) {
                return target
            }
            if (prop === 'writeBn') {
                return function (bn: bigint | BigNumber) {
                    if (typeof bn === 'bigint') {
                        return Reflect.apply(target[prop], this, [new bsv.BigNumber(bn.toString())]);
                    } else {
                        return Reflect.get(target, prop);
                    }
                };
            }

            return Reflect.get(target, prop);
        }
    });

}