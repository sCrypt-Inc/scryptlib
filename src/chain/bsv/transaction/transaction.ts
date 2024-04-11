
import * as bsv from "@bsv/sdk";
import { Transaction } from "../../base/transaction/Transaction";
import { TARGET } from "../target";


export function createTransactionProxy(tx: bsv.Transaction): Transaction {

    return new Proxy<bsv.Transaction>(tx, {
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