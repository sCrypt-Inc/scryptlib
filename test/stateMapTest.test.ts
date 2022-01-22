import { expect } from 'chai'
import { loadDescription, newTx } from './helper'
import { buildContractClass, buildTypeClasses } from '../src/contract'
import { Bytes, } from '../src/scryptTypes'
import { findKeyIndex, toData, toHashedMap } from '../src/internal'
import { bsv, toHex, getPreimage } from '../src/utils';
const inputIndex = 0;
const inputSatoshis = 100000;
const outputAmount = inputSatoshis

describe('test.stateMapTest', () => {
    describe('stateMapTest', () => {
        let mapTest, StateMapTest, MapEntry;

        let map = new Map<number, number>();

        before(() => {
            const jsonDescr = loadDescription('stateMap_desc.json')
            StateMapTest = buildContractClass(jsonDescr)
            MapEntry = buildTypeClasses(StateMapTest).MapEntry
            mapTest = new StateMapTest(new Bytes('')) // empty initial map
        })

        function buildTx(map: Map<number, number>) {
            let newLockingScript = mapTest.getNewStateScript({
                _mpData: toData(map),
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


            function testInsert(key: number, val: number) {

                map.set(key, val);
                const keyIndex = findKeyIndex(map, key);
                console.log('keyIndex', keyIndex)
                console.log('toData(map)', toData(map).toHex())
                const tx = buildTx(map);
                const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)
                const result = mapTest.insert(new MapEntry({
                    key: key,
                    val: val,
                    keyIndex: keyIndex
                }), preimage).verify()
                expect(result.success, result.error).to.be.true;

                mapTest._mpData = toData(map)
            }

            testInsert(3, 1);

            testInsert(5, 6);

            // testInsert(0, 11);

            // testInsert(1, 5);

        })


        // it('test update', () => {


        //     function testUpdate(key: number, val: number) {

        //         map.set(key, val);

        //         const tx = buildTx(map);
        //         const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)

        //         const result = mapTest.update(new MapEntry({
        //             key: key,
        //             val: val,
        //             keyIndex: findKeyIndex(map, key)
        //         }), preimage).verify()
        //         expect(result.success, result.error).to.be.true;

        //         mapTest._mpData = toData(map)
        //     }


        //     testUpdate(1, 6)

        //     testUpdate(1, 8)
        //     testUpdate(0, 1)

        // })


        // it('test delete', () => {


        //     function testDelete(key: number) {

        //         const keyIndex = findKeyIndex(map, key);
        //         map.delete(key);

        //         const tx = buildTx(map);
        //         const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)

        //         const result = mapTest.delete(key, keyIndex, preimage).verify()
        //         expect(result.success, result.error).to.be.true;

        //         mapTest._mpData = toData(map)
        //     }


        //     testDelete(1)

        //     testDelete(5)

        //     testDelete(3)

        //     testDelete(0)

        // })

    })


    describe('stateMapTest: library as state', () => {
        let mapTest, hashedMap;

        const jsonDescr = loadDescription('LibAsState2_desc.json')
        const Test = buildContractClass(jsonDescr)
        const {MapEntry} = buildTypeClasses(jsonDescr);
        let map = new Map<number, number>();

        before(() => {
            hashedMap = toHashedMap(map);
            mapTest = new Test(hashedMap) // empty initial map
        })

        function buildTx(map: Map<number, number>) {
            hashedMap.setProperties({
                _data: toData(map)
            })
            let newLockingScript = mapTest.getNewStateScript({
                map: hashedMap,
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


            function testInsert(key: number, val: number) {

                map.set(key, val);
                const keyIndex = findKeyIndex(map, key);

                console.log('keyIndex', keyIndex)
                console.log('toData(map)', toData(map).toHex())

                const tx = buildTx(map);
                const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)
                const result = mapTest.insert(new MapEntry({
                    key: key,
                    val: val,
                    keyIndex: keyIndex
                }), preimage).verify()
                expect(result.success, result.error).to.be.true;

                // update hashedMap
                hashedMap.setProperties({
                    _data: toData(map)
                })
                mapTest.map = hashedMap
            }

            testInsert(3, 1);

            testInsert(5, 6);

            //testInsert(0, 11);

            // testInsert(1, 5);

        })


        // it('test update', () => {


        //     function testUpdate(key: number, val: number) {

        //         map.set(key, val);

        //         const tx = buildTx(map);
        //         const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)

        //         const result = mapTest.update(new MapEntry({
        //             key: key,
        //             val: val,
        //             keyIndex: findKeyIndex(map, key)
        //         }), preimage).verify()
        //         expect(result.success, result.error).to.be.true;

        //         mapTest._mpData = toData(map)
        //     }


        //     testUpdate(1, 6)

        //     testUpdate(1, 8)
        //     testUpdate(0, 1)

        // })


        // it('test delete', () => {


        //     function testDelete(key: number) {

        //         const keyIndex = findKeyIndex(map, key);
        //         map.delete(key);

        //         const tx = buildTx(map);
        //         const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)

        //         const result = mapTest.delete(key, keyIndex, preimage).verify()
        //         expect(result.success, result.error).to.be.true;

        //         mapTest._mpData = toData(map)
        //     }


        //     testDelete(1)

        //     testDelete(5)

        //     testDelete(3)

        //     testDelete(0)

        // })

    })
})
