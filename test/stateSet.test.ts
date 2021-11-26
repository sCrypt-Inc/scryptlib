import { expect } from 'chai'
import { loadDescription, newTx } from './helper'
import { buildContractClass, buildTypeClasses } from '../src/contract'
import { Bytes, HashedSet, Struct } from '../src/scryptTypes'
import { findKeyIndex, toData } from '../src/internal'
import { bsv, toHex, getPreimage } from '../src/utils';
const inputIndex = 0;
const inputSatoshis = 100000;
const outputAmount = inputSatoshis

describe('test.stateSet', () => {
    describe('stateSet', () => {
        let stateSet, StateSet;

        let set: HashedSet<number> = new Set<number>();

        before(() => {
            const jsonDescr = loadDescription('stateSet_desc.json')
            StateSet = buildContractClass(jsonDescr)
            stateSet = new StateSet(new Bytes('')) // empty initial map
        })

        function buildTx(set: HashedSet<number>) {
            let newLockingScript = stateSet.getNewStateScript({
                _setData: toData(set),
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

            function testInsert(key: number) {

                set.add(key);

                const tx = buildTx(set);
                const preimage = getPreimage(tx, stateSet.lockingScript, inputSatoshis)
                const result = stateSet.insert(key, findKeyIndex(set, key), preimage).verify()
                expect(result.success, result.error).to.be.true;
                stateSet._setData = toData(set)
            }

            testInsert(3);
            testInsert(5);
            testInsert(0);
            testInsert(1);
        })



        it('test delete', () => {


            function testDelete(key: number, expectedResult: boolean = true) {

                const keyIndex = findKeyIndex(set, key);
                set.delete(key);

                const tx = buildTx(set);
                const preimage = getPreimage(tx, stateSet.lockingScript, inputSatoshis)

                const result = stateSet.delete(key, keyIndex, preimage).verify()
                expect(result.success, result.error).to.be.eq(expectedResult);

                stateSet._setData = toData(set)
            }


            testDelete(1)

            testDelete(5)

            testDelete(5, false)
            testDelete(3333, false)

            testDelete(3)

            testDelete(0)

        })

    })
})
