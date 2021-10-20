import { assert, expect } from 'chai';
import { buildContractClass, buildTypeClasses, SigHashPreimage, Bytes, getPreimage, bsv, toHex, compileContract, AbstractContract } from '../../src/internal'
import { newTx, loadDescription } from '../helper';


const inputSatoshis = 100000;
const inputIndex = 0;
const tx = newTx(inputSatoshis);
const outputAmount = inputSatoshis;

describe('Test sCrypt contract stateProp In Javascript', () => {
    let test: AbstractContract, result, preimg

    before(() => {

        const StateProp = buildContractClass(loadDescription('stateProp_desc.json'));
        const { ST } = buildTypeClasses(StateProp);

        test = new StateProp([
            new ST({ x: 0, y: true, z: new Bytes('00') }),
            new ST({ x: 0, y: true, z: new Bytes('00') })
        ]);

        let newLockingScript = test.getStateScript({
            st: [
                new ST({ x: 0, y: true, z: new Bytes('00') }),
                new ST({ x: 1, y: false, z: new Bytes('0001') })
            ]
        })

        tx.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }));

        preimg = getPreimage(tx, test.lockingScript, inputSatoshis);

        test.txContext = {
            tx,
            inputIndex,
            inputSatoshis
        }

    });

    it('should return true', () => {
        result = test.unlock(new SigHashPreimage(toHex(preimg)), new Bytes('01')).verify();
        expect(result.success, result.error).to.be.true
    });
});
