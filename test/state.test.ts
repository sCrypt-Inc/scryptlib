

import { assert, expect } from 'chai';
import { loadDescription, newTx } from './helper';
import { buildContractClass, VerifyError, buildTypeClasses } from '../src/contract';
import { Bool, Bytes, Int, SigHashPreimage } from '../src/scryptTypes';
import { bsv, toHex, getPreimageByHex } from '../src/utils';

const inputIndex = 0;
const inputSatoshis = 100000;

const outputAmount = 222222

const Counter = buildContractClass(loadDescription('state_desc.json'));


describe('state_test', () => {


    it('should serializer state success', () => {
        const counter = new Counter(1000, new Bytes('0101'), true);

        expect(counter.dataPart.toHex()).to.be.equal('02e803020101010700000000');
        counter.counter++;
        counter.state_bytes = new Bytes('010101');
        counter.state_bool = false;

        expect(counter.dataPart.toHex()).to.be.equal('02e90303010101000800000000');

    });


    it('should deserializer state success', () => {
        const counter = new Counter(new Int('0x02e9030301010100080000000002e90303010101000800000000'), new Bytes('0101'), true);

        let newCounter = Counter.fromHex(counter.lockingScript.toHex());

        expect(newCounter.counter.equals(new Int('0x02e9030301010100080000000002e90303010101000800000000'))).to.be.true;
        expect(newCounter.state_bytes.equals(new Bytes('0101'))).to.be.true;
        expect(newCounter.state_bool.equals(new Bool(true))).to.be.true;
    });

    it('should call success', () => {
        const counter = new Counter(1000, new Bytes('0101'), true);
        // update state
        counter.counter = 1001
        counter.state_bytes = new Bytes('010101');
        counter.state_bool = false;

        expect(counter.dataPart.toHex()).to.be.equal('02e90303010101000800000000');

        const tx1 = newTx(inputSatoshis);
        tx1.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.fromHex(counter.lockingScript.toHex()),
            satoshis: outputAmount
        }))

        const preimage1 = getPreimageByHex(tx1, counter.prevLockingScript.toHex(), inputSatoshis)

        counter.txContext = {
            tx: tx1,
            inputIndex,
            inputSatoshis
        }

        const result1 = counter.increment(new SigHashPreimage(toHex(preimage1)), outputAmount).verify()
        expect(result1.success, result1.error).to.be.true

        //should call commitState to update counter.prevLockingScript
        counter.commitState();


        counter.counter = 1002
        counter.state_bytes = new Bytes('01010101');
        counter.state_bool = true;


        const tx2 = newTx(inputSatoshis);
        tx2.addOutput(new bsv.Transaction.Output({
            script: bsv.Script.fromHex(counter.lockingScript.toHex()),
            satoshis: outputAmount
        }))

        const preimage2 = getPreimageByHex(tx2, counter.prevLockingScript.toHex(), inputSatoshis)

        counter.txContext = {
            tx: tx2,
            inputIndex,
            inputSatoshis
        }

        const result2 = counter.increment(new SigHashPreimage(toHex(preimage2)), outputAmount).verify()
        expect(result2.success, result2.error).to.be.true

    });

})
