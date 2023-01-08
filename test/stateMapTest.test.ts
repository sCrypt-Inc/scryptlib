import { expect } from 'chai'
import { loadArtifact, newTx } from './helper'
import { Contract, buildContractClass, ContractClass } from '../src/contract'
import { getSortedItem, SigHashPreimage, } from '../src/scryptTypes'
import { bsv, getPreimage } from '../src/utils';
const inputIndex = 0;
const inputSatoshis = 100000;
const outputAmount = inputSatoshis

describe('test.stateMapTest', () => {
    describe('stateMapTest', () => {
        let mapTest: Contract, StateMapTest: ContractClass;

        let map = new Map<bigint, bigint>();

        before(() => {
            const jsonArtifact = loadArtifact('stateMap.json')
            StateMapTest = buildContractClass(jsonArtifact)
            mapTest = new StateMapTest(map) // empty initial map
        })

        function buildTx(map: Map<bigint, bigint>) {
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

            return tx;
        }


        it('test insert', () => {


            function testInsert(key: bigint, val: bigint) {

                map.set(key, val);
                const tx = buildTx(map);
                const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)
                const result = mapTest.insert(getSortedItem(map, key), val, SigHashPreimage(preimage)).verify()
                expect(result.success, result.error).to.be.true;

                mapTest.map = map
            }

            testInsert(3n, 1n);

            testInsert(5n, 6n);

            testInsert(0n, 11n);

            testInsert(1n, 5n);

        })


        it('test update', () => {


            function testUpdate(key: bigint, val: bigint) {

                map.set(key, val);

                const tx = buildTx(map);
                const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)

                const result = mapTest.update(getSortedItem(map, key), val, SigHashPreimage(preimage)).verify()
                expect(result.success, result.error).to.be.true;

                mapTest.map = map
            }


            testUpdate(1n, 6n)

            testUpdate(1n, 8n)
            testUpdate(0n, 1n)

        })


        it('test delete', () => {


            function testDelete(key: bigint) {

                map.delete(key);

                const tx = buildTx(map);
                const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)

                const result = mapTest.delete(getSortedItem(map, key), SigHashPreimage(preimage)).verify()
                expect(result.success, result.error).to.be.true;

                mapTest.map = map
            }


            testDelete(1n)

            testDelete(5n)

            testDelete(3n)

            testDelete(0n)

        })

    })


    describe('stateMapTest: library as state', () => {
        let mapTest;

        const jsonArtifact = loadArtifact('LibAsState2.json')
        const Test = buildContractClass(jsonArtifact)
        let map = new Map<bigint, bigint>();

        before(() => {
            mapTest = new Test(map) // empty initial map
        })

        function buildTx(map: Map<bigint, bigint>) {

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

            return tx;
        }


        it('test insert', () => {


            function testInsert(key: bigint, val: bigint) {

                map.set(key, val);

                const tx = buildTx(map);
                const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)
                const result = mapTest.insert({
                    key: getSortedItem(map, key),
                    val: val
                }, SigHashPreimage(preimage)).verify()
                expect(result.success, result.error).to.be.true;

                mapTest.map = map
            }

            testInsert(3n, 1n);

            testInsert(5n, 6n);

            testInsert(0n, 11n);

            testInsert(1n, 5n);

        })


        it('test update', () => {


            function testUpdate(key: bigint, val: bigint) {

                map.set(key, val);

                const tx = buildTx(map);
                const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)

                const result = mapTest.update({
                    key: getSortedItem(map, key),
                    val: val
                }, SigHashPreimage(preimage)).verify()
                expect(result.success, result.error).to.be.true;

                mapTest.map = map
            }


            testUpdate(1n, 6n)

            testUpdate(1n, 8n)
            testUpdate(0n, 1n)

        })


        it('test delete', () => {


            function testDelete(key: bigint) {

                const sortedItem = getSortedItem(map, key);
                map.delete(key);

                const tx = buildTx(map);
                const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)

                const result = mapTest.delete(sortedItem, SigHashPreimage(preimage)).verify()
                expect(result.success, result.error).to.be.true;

                mapTest.map = map
            }


            testDelete(1n)

            testDelete(5n)

            testDelete(3n)

            testDelete(0n)

        })

    })
})
