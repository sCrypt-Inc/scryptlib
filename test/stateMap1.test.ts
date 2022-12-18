import { expect } from 'chai'
import { loadDescription, newTx } from './helper'
import { bsv, getPreimage, Contract, ContractClass, buildContractClass, SigHashPreimage } from '../src';
const inputIndex = 0;
const inputSatoshis = 100000;
const outputAmount = inputSatoshis

describe('test.stateMap1', () => {
    describe('test empty hashedmap', () => {
        let mapTest: Contract, StateMapTest: ContractClass;

        let map = new Map<bigint, bigint>();

        before(() => {
            const jsonDescr = loadDescription('stateMap1_desc.json')
            StateMapTest = buildContractClass(jsonDescr)
            mapTest = new StateMapTest(StateMapTest.toHashedMap(map, "HashedMap<int, int>"))
        })


        it('test unlock', () => {

            let newLockingScript = mapTest.getNewStateScript({
                map: StateMapTest.toHashedMap(map, "HashedMap<int, int>"),
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
            const result = mapTest.unlock(SigHashPreimage(preimage)).verify()
            expect(result.success, result.error).to.be.true;
            mapTest.map = StateMapTest.toHashedMap(map, "HashedMap<int, int>")

        })


        it('test unlock again', () => {

            let newLockingScript = mapTest.getNewStateScript({
                map: StateMapTest.toHashedMap(map, "HashedMap<int, int>"),
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
            const result = mapTest.unlock(SigHashPreimage(preimage)).verify()
            expect(result.success, result.error).to.be.true;
            mapTest.map = StateMapTest.toHashedMap(map, "HashedMap<int, int>")

        })
    })
})
