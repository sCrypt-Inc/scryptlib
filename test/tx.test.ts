import { OP } from "@bsv/sdk";
import { Chain } from "../src/chain/chain";


const factory = Chain.getFactory();

const s = factory.LockingScript.fromHex('76a914212771cc264264057238cc3b98a03ddd9aa3a31c88ac');

s.writeNumber(3).writeBn(BigInt(30));
s.writeOpCode(OP.OP_2SWAP);

const ss = factory.UnlockingScript.fromHex('020111');

s.writeScript(ss);

console.log(s, s.toASM())

const tx = factory.Transaction.fromHex('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff1a034fcd0c2f7461616c2e636f6d2ffd54e6dd4fe37955f2600000ffffffff0161cf4025000000001976a914522cf9e7626d9bd8729e5a1398ece40dad1b6a2f88ac00000000');


const tx1 = factory.Transaction.from();


const key = factory.PrivateKey.fromRandom();
// tx.addInput()
console.log(key.toAddress())
