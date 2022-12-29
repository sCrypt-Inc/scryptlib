import { expect } from 'chai'
import { loadDescription, newTx } from './helper'
import { Contract, buildContractClass, ContractClass } from '../src/contract'
import { Bytes, SigHashPreimage, } from '../src/scryptTypes'
import { bsv, getPreimage } from '../src/utils';
const inputIndex = 0;
const inputSatoshis = 100000;
const outputAmount = inputSatoshis

describe('test.stateMapTest', () => {
    describe('stateMapTest', () => {
        let mapTest: Contract, StateMapTest: ContractClass;

        let map = new Map<bigint, bigint>();

        before(() => {
            const jsonDescr = loadDescription('stateMap.json')
            StateMapTest = buildContractClass(jsonDescr)
            mapTest = new StateMapTest(StateMapTest.toHashedMap(map, "HashedMap<int, int>")) // empty initial map
        })

        function buildTx(map: Map<bigint, bigint>) {
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

            return tx;
        }


        it('test insert', () => {


            function testInsert(key: bigint, val: bigint) {

                map.set(key, val);
                const keyIndex = StateMapTest.findKeyIndex(map, key, 'int');
                const tx = buildTx(map);
                const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)
                const result = mapTest.insert({
                    item: key,
                    idx: keyIndex
                }, val, SigHashPreimage(preimage)).verify()
                expect(result.success, result.error).to.be.true;

                mapTest.map = StateMapTest.toHashedMap(map, "HashedMap<int, int>")
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
                    item: key,
                    idx: StateMapTest.findKeyIndex(map, key, 'int')
                }, val, SigHashPreimage(preimage)).verify()
                expect(result.success, result.error).to.be.true;

                mapTest.map = StateMapTest.toHashedMap(map, "HashedMap<int, int>")
            }


            testUpdate(1n, 6n)

            testUpdate(1n, 8n)
            testUpdate(0n, 1n)

        })


        it('test delete', () => {


            function testDelete(key: bigint) {

                const keyIndex = StateMapTest.findKeyIndex(map, key, 'int');
                map.delete(key);

                const tx = buildTx(map);
                const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)

                const result = mapTest.delete({
                    item: key,
                    idx: keyIndex
                }, SigHashPreimage(preimage)).verify()
                expect(result.success, result.error).to.be.true;

                mapTest.map = StateMapTest.toHashedMap(map, "HashedMap<int, int>")
            }


            testDelete(1n)

            testDelete(5n)

            testDelete(3n)

            testDelete(0n)

        })

    })


    describe('stateMapTest: library as state', () => {
        let mapTest;

        const jsonDescr = loadDescription('LibAsState2.json')
        const Test = buildContractClass(jsonDescr)
        let map = new Map<bigint, bigint>();

        before(() => {
            mapTest = new Test(Test.toHashedMap(map, "HashedMap<int, int>")) // empty initial map
        })

        function buildTx(map: Map<bigint, bigint>) {

            let newLockingScript = mapTest.getNewStateScript({
                map: Test.toHashedMap(map, "HashedMap<int, int>"),
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
                const keyIndex = Test.findKeyIndex(map, key, "int");

                const tx = buildTx(map);
                const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)
                const result = mapTest.insert({
                    key: {
                        item: key,
                        idx: keyIndex
                    },
                    val: val
                }, SigHashPreimage(preimage)).verify()
                expect(result.success, result.error).to.be.true;

                mapTest.map = Test.toHashedMap(map, "HashedMap<int, int>")
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
                    key: {
                        item: key,
                        idx: Test.findKeyIndex(map, key, 'int')
                    },
                    val: val
                }, SigHashPreimage(preimage)).verify()
                expect(result.success, result.error).to.be.true;

                mapTest.map = Test.toHashedMap(map, "HashedMap<int, int>")
            }


            testUpdate(1n, 6n)

            testUpdate(1n, 8n)
            testUpdate(0n, 1n)

        })


        it('test delete', () => {


            function testDelete(key: bigint) {

                const keyIndex = Test.findKeyIndex(map, key, 'int');
                map.delete(key);

                const tx = buildTx(map);
                const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)

                const result = mapTest.delete({
                    item: key,
                    idx: keyIndex
                }, SigHashPreimage(preimage)).verify()
                expect(result.success, result.error).to.be.true;

                mapTest.map = Test.toHashedMap(map, "HashedMap<int, int>")
            }


            testDelete(1n)

            testDelete(5n)

            testDelete(3n)

            testDelete(0n)

        })

    })
})
