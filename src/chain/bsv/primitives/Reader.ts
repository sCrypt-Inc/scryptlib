
import * as bsv from "@bsv/sdk";
import { Reader } from "../../base/primitives/Reader";
import { TARGET } from "../target";


export function createReaderProxy(reader: bsv.Utils.Reader): Reader {
    return new Proxy<bsv.Utils.Reader>(reader, {
        get: function (target, prop) {
            if (prop === TARGET) {
                return target
            }
            return Reflect.get(target, prop);
        }
    });
}