import { expect } from 'chai'
import { loadDescription, newTx } from './helper'
import { buildContractClass, buildStructsClass, buildTypeClasses } from '../src/contract'
import { Bytes, Struct } from '../src/scryptTypes'
import { findKeyIndex, num2bin, sortmap, toStorage } from '../src/internal'
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
            MapEntry = buildTypeClasses(StateMapTest).MapEntry;
            mapTest = new StateMapTest(new Bytes(''))
        })


        it('test insert', () => {


            function testInsert(key: number, val: number) {

                map.set(key, val);
                let newLockingScript = mapTest.getNewStateScript({
                    _mpData: toStorage(map),
                });

                const tx = newTx(inputSatoshis);
                tx.addOutput(new bsv.Transaction.Output({
                    script: newLockingScript,
                    satoshis: outputAmount
                }))

                const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)

                mapTest.txContext = {
                    tx: tx,
                    inputIndex,
                    inputSatoshis
                }

                const result = mapTest.insert(new MapEntry({
                    key: key,
                    val: val,
                    keyIndex: findKeyIndex(map, key)
                }), preimage).verify()
                expect(result.success, result.error).to.be.true;

                mapTest._mpData = toStorage(map)
            }

            testInsert(3, 1);

            testInsert(5, 6);

            testInsert(0, 11);

            testInsert(1, 5);

        })


        it('test update', () => {


            function testUpdate(key: number, val: number) {

                map.set(key, val);

                let newLockingScript = mapTest.getNewStateScript({
                    _mpData: toStorage(map),
                });

                const tx = newTx(inputSatoshis);
                tx.addOutput(new bsv.Transaction.Output({
                    script: newLockingScript,
                    satoshis: outputAmount
                }))

                const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)

                mapTest.txContext = {
                    tx: tx,
                    inputIndex,
                    inputSatoshis
                }

                const result = mapTest.update(new MapEntry({
                    key: key,
                    val: val,
                    keyIndex: findKeyIndex(map, key)
                }), preimage).verify()
                expect(result.success, result.error).to.be.true;

                mapTest._mpData = toStorage(map)
            }


            testUpdate(1, 6)

            testUpdate(1, 8)
            testUpdate(0, 1)

        })


        it('test delete', () => {


            function testDelete(key: number) {

                const keyIndex = findKeyIndex(map, key);
                map.delete(key);

                let newLockingScript = mapTest.getNewStateScript({
                    _mpData: toStorage(map),
                });

                const tx = newTx(inputSatoshis);
                tx.addOutput(new bsv.Transaction.Output({
                    script: newLockingScript,
                    satoshis: outputAmount
                }))

                const preimage = getPreimage(tx, mapTest.lockingScript, inputSatoshis)

                mapTest.txContext = {
                    tx: tx,
                    inputIndex,
                    inputSatoshis
                }

                const result = mapTest.delete(key, keyIndex, preimage).verify()
                expect(result.success, result.error).to.be.true;

                mapTest._mpData = toStorage(map)
            }


            testDelete(1)

            testDelete(5)

            testDelete(3)

            testDelete(0)

        })

    })
})
