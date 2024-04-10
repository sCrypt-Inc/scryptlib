
import { Transaction as BSVTransaction } from "@bsv/sdk";
import { Transaction } from "../../base/transaction/Transaction";
import { TARGET } from "../target";


export default function createTransactionProxy(tx: BSVTransaction): Transaction {

    return new Proxy<BSVTransaction>(tx, {
        // target represents the Person while prop represents
        // proxy property.
        get: function (target, prop) {
            if (prop === TARGET) {
                return target
            }
            return Reflect.get(target, prop);
        }
    }) as unknown as Transaction;

}