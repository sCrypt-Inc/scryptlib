

import { assert, expect } from 'chai';
import { loadDescription, newTx } from './helper';
import { buildContractClass, VerifyError, buildTypeClasses } from '../src/contract';
import { Bool, Bytes, Int, SigHashPreimage } from '../src/scryptTypes';
import { bsv, toHex, getPreimage } from '../src/utils';

const inputIndex = 0;
const inputSatoshis = 100000;

const outputAmount = 222222

const Counter = buildContractClass(loadDescription('state_desc.json'));


describe('state_test', () => {


    it('should serializer state success', () => {
        const counter = new Counter(1000);
        //counter.
        expect(counter.lockingScript.toASM().endsWith("OP_RETURN e803 0300000001")).to.be.true;

        // udpate state
        counter.counter++;

        expect(counter.lockingScript.toASM().endsWith("OP_RETURN e903 0300000001")).to.be.true;

    });


    it('should deserializer state success', () => {
        const counter = new Counter(1000);

        let newCounter = Counter.fromASM(counter.lockingScript.toASM());

        expect(newCounter.counter.equals(new Int(1000))).to.be.true;
    });

    it('should call success', () => {
        const counter = new Counter(0);

        const prevLockingScript = counter.lockingScript.toASM();

        counter.counter++;

        const tx = newTx(inputSatoshis);
        tx.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.fromASM(counter.lockingScript.toASM()),
            satoshis: outputAmount
        }))

        const preimage = getPreimage(tx, prevLockingScript, inputSatoshis)

        counter.txContext = {
            tx,
            inputIndex,
            inputSatoshis
        }

        const result = counter.increment(new SigHashPreimage(toHex(preimage)), outputAmount).verify()
        expect(result.success, result.error).to.be.true
    });

})
