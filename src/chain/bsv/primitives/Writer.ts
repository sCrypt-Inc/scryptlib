
import * as bsv from "@bsv/sdk";
import { Writer } from "../../base/primitives/Writer";
import { TARGET } from "../target";


export function createWriterProxy(writer: bsv.Utils.Writer): Writer {
    return new Proxy<bsv.Utils.Writer>(writer, {

        get: function (target, prop) {

            if (prop === TARGET) {
                return target
            }

            return Reflect.get(target, prop);
        }
    });
}