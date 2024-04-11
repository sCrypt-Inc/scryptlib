
import * as bsv from "@bsv/sdk";
import { Spend } from "../../base/script/Spend";
import { TARGET } from "../target";

export function createSpendProxy(spend: bsv.Spend): Spend {

    return new Proxy<bsv.Spend>(spend, {
        // target represents the Person while prop represents
        // proxy property.
        get: function (target, prop) {
            if (prop === TARGET) {
                return target
            }

            return Reflect.get(target, prop);
        }
    });
}