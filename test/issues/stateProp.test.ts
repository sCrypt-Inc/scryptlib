import { assert, expect } from 'chai';
import { buildContractClass, SigHashPreimage, Bytes, getPreimage, bsv, toHex, compileContract, AbstractContract } from '../../src/internal'
import { newTx, loadArtifact } from '../helper';


const inputSatoshis = 100000;
const inputIndex = 0;
const tx = newTx(inputSatoshis);
const outputAmount = inputSatoshis;

describe('Test sCrypt contract stateProp In Javascript', () => {
    let test: AbstractContract, result, preimg

    before(() => {

        const StateProp = buildContractClass(loadArtifact('stateProp.json'));

        test = new StateProp([
            { x: 0n, y: true, z: Bytes('00') },
            { x: 0n, y: true, z: Bytes('00') }
        ]);

        let newLockingScript = test.getNewStateScript({
            st: [
                { x: 0n, y: true, z: Bytes('00') },
                { x: 1n, y: false, z: Bytes('0001') }
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
        result = test.unlock(SigHashPreimage(preimg), Bytes('01')).verify();
        expect(result.success, result.error).to.be.true
    });
});
