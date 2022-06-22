import { expect } from 'chai'
import { loadDescription, newTx } from './helper'
import { buildContractClass, buildTypeClasses } from '../src/contract'
import { Bytes, SortedItem, } from '../src/scryptTypes'
import { findKeyIndex, toData, toHashedMap } from '../src/internal'
import { bsv, toHex, getPreimage } from '../src/utils';
const inputIndex = 0;
const inputSatoshis = 100000;
const outputAmount = inputSatoshis

describe('test.stateMap1', () => {
    describe('test empty hashedmap', () => {
        let mapTest, StateMapTest, MapEntry;

        let map = new Map<number, number>();

        before(() => {
            const jsonDescr = loadDescription('stateMap1_desc.json')
            StateMapTest = buildContractClass(jsonDescr)
            let hashedmap = toHashedMap(map);
            mapTest = new StateMapTest(hashedmap)
        })


        it('test unlock', () => {

            let newLockingScript = mapTest.getNewStateScript({
                map: toHashedMap(map),
            });

            const tx = newTx(inputSatoshis);
            tx.addOutput(new bsv.Transaction.Output({
                script: newLockingScript,
                satoshis: outputAmount
            }))

            mapTest.txContext = {
                tx: tx,
                inputIndex,
                inputSatoshis
            }

            const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)
            const result = mapTest.unlock(preimage).verify()
            expect(result.success, result.error).to.be.true;
            mapTest.map = toHashedMap(map)

        })


        it('test unlock again', () => {

            let newLockingScript = mapTest.getNewStateScript({
                map: toHashedMap(map),
            });

            const tx = newTx(inputSatoshis);
            tx.addOutput(new bsv.Transaction.Output({
                script: newLockingScript,
                satoshis: outputAmount
            }))

            mapTest.txContext = {
                tx: tx,
                inputIndex,
                inputSatoshis
            }

            const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)
            const result = mapTest.unlock(preimage).verify()
            expect(result.success, result.error).to.be.true;
            mapTest.map = toHashedMap(map)

        })
    })
})
