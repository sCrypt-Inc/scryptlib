import { expect } from 'chai'
import { loadArtifact, newTx } from './helper'
import { bsv, getPreimage, Contract, ContractClass, buildContractClass, SigHashPreimage } from '../src';
const inputIndex = 0;
const inputSatoshis = 100000;
const outputAmount = inputSatoshis

describe('test.stateMap1', () => {
    describe('test empty hashedmap', () => {
        let mapTest: Contract, StateMapTest: ContractClass;

        let map = new Map<bigint, bigint>();

        before(() => {
            const jsonArtifact = loadArtifact('stateMap1.json')
            StateMapTest = buildContractClass(jsonArtifact)
            mapTest = new StateMapTest(map)
        })


        it('test unlock', () => {

            let newLockingScript = mapTest.getNewStateScript({
                map: map,
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
            mapTest.map = map

        })


        it('test unlock again', () => {

            let newLockingScript = mapTest.getNewStateScript({
                map: map,
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
            mapTest.map = map

        })
    })
})
