import { expect } from 'chai'
import { loadArtifact, newTx } from './helper'
import { AbstractContract, buildContractClass } from '../src/contract'
import { getSortedItem, Int, SigHashPreimage } from '../src/scryptTypes'
import { bsv, getPreimage } from '../src/utils';
const inputIndex = 0;
const inputSatoshis = 100000;
const outputAmount = inputSatoshis

describe('test.stateSet', () => {
    describe('stateSet', () => {
        let stateSet: AbstractContract, StateSet: typeof AbstractContract;

        let set = new Set<Int>();

        before(() => {
            const jsonArtifact = loadArtifact('stateSet.json')
            StateSet = buildContractClass(jsonArtifact)
            stateSet = new StateSet(set) // empty initial set
        })

        function buildTx(set: Set<bigint>) {
            let newLockingScript = stateSet.getNewStateScript({
                set: set,
            });

            const tx = newTx(inputSatoshis);
            tx.addOutput(new bsv.Transaction.Output({
                script: newLockingScript,
                satoshis: outputAmount
            }))

            stateSet.txContext = {
                tx: tx,
                inputIndex,
                inputSatoshis
            }

            return tx;
        }


        it('test insert', () => {

            function testInsert(key: bigint) {

                set.add(key);
                const tx = buildTx(set);
                const preimage = getPreimage(tx, stateSet.lockingScript, inputSatoshis)
                const result = stateSet.insert(getSortedItem(set, key), SigHashPreimage(preimage)).verify()
                expect(result.success, result.error).to.be.true;
                stateSet.set = set
            }

            testInsert(3n);
            testInsert(5n);
            testInsert(0n);
            testInsert(1n);
        })



        it('test delete', () => {


            function testDelete(key: bigint, expectedResult: boolean = true) {

                const keyIndex = StateSet.findKeyIndex(set, key, 'int');
                set.delete(key);

                const tx = buildTx(set);
                const preimage = getPreimage(tx, stateSet.lockingScript, inputSatoshis)

                const result = stateSet.delete(key, keyIndex, SigHashPreimage(preimage)).verify()
                expect(result.success, result.error).to.be.eq(expectedResult);

                stateSet.set = set;
            }


            testDelete(1n)

            testDelete(5n)


            testDelete(3n)

            testDelete(0n)
            testDelete(5n, false)

        })

    })
})
