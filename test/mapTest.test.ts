import { expect } from 'chai'
import { loadDescription, newTx } from './helper'
import { buildContractClass,  buildTypeClasses } from '../src/contract'
import { Bytes, Struct } from '../src/scryptTypes'
import { findKeyIndex, num2bin,  toData } from '../src/internal'

function getRandomInt() {
    return Math.floor(Math.random() * 10000000);
}

function getRandomMap(n: number) {
    let map = new Map<number, number>();
    for (; map.size < n;) {
        map.set(getRandomInt(), getRandomInt());
    }
    return map;
}


function getRandomBytesMap(n: number) {
    let map = new Map<Bytes, Bytes>();
    for (; map.size < n;) {
        map.set(new Bytes(num2bin(getRandomInt(), 8)), new Bytes(num2bin(getRandomInt(), 8)));
    }
    return map;
}

function getRandomBoolMap(n: number) {
    let map = new Map<number, boolean>();
    for (; map.size < n;) {
        map.set(getRandomInt(), getRandomInt() % 2 === 0);
    }
    return map;
}




describe('test.mapTest', () => {
    describe('mapTest', () => {
        let mapTest, MapTest;

        before(() => {
            const jsonDescr = loadDescription('mapTest_desc.json')
            MapTest = buildContractClass(jsonDescr)
            mapTest = new MapTest(new Bytes(''))
        })

        it('test unlock', () => {
            let map = new Map<number, number>();
            map.set(3, 1);
            const result = mapTest.unlock(3, 1, findKeyIndex(map, 3)).verify()
            expect(result.success, result.error).to.be.true;

        })


        it('test testInsert', () => {
            const { MapEntry } = buildTypeClasses(MapTest);

            let map = getRandomMap(10);


            const mapEntrys = Array.from(map, ([key, val]) => ({ key, val, keyIndex: findKeyIndex(map, key) }))
            .map(entry => new MapEntry(entry)).sort((a, b) => {
                return a.keyIndex - b.keyIndex;
            })


            const result = mapTest.testInsert(mapEntrys, toData(map)).verify()
            expect(result.success, result.error).to.be.true;

        })


        it('test testInsertMiddle', () => {
            const result = mapTest.testInsertMiddle(1).verify()
            expect(result.success, result.error).to.be.true;
        })

        it('test testInsertMapEntryBool', () => {
            const { MapEntryBool } = buildTypeClasses(MapTest);

            let map = getRandomBoolMap(10);


            const mapEntrys = Array.from(map, ([key, val]) => ({ key, val, keyIndex: findKeyIndex(map, key) }))
            .map(entry => new MapEntryBool(entry)).sort((a, b) => {
                return a.keyIndex - b.keyIndex;
            })


            const result = mapTest.testInsertMapEntryBool(mapEntrys, toData(map)).verify()
            expect(result.success, result.error).to.be.true;

        })

        it('test testInsertMapEntryBytes', () => {
            const { MapEntryBytes } = buildTypeClasses(MapTest);

            let map = getRandomBytesMap(10);


            const mapEntrys = Array.from(map, ([key, val]) => ({ key, val, keyIndex: findKeyIndex(map, key) }))
            .map(entry => new MapEntryBytes(entry)).sort((a, b) => {
                return a.keyIndex - b.keyIndex;
            })


            const result = mapTest.testInsertMapEntryBytes(mapEntrys, toData(map)).verify()
            expect(result.success, result.error).to.be.true;

        })


        it('test testInsertMapEntrySt', () => {
            const { MapEntrySt, ST } = buildTypeClasses(MapTest);

            const _MapEntrySt = MapEntrySt as (typeof Struct);
            const _ST = ST as (typeof Struct);


            function getRandomStMap(n: number) {
                let map = new Map<Struct, number[]>();
                for (; map.size < n;) {
                    map.set(new _ST({
                        a: getRandomInt(),
                        b: getRandomInt() % 2 === 0,
                        c: [new Bytes(num2bin(getRandomInt(), 8)), new Bytes(num2bin(getRandomInt(), 8)), new Bytes(num2bin(getRandomInt(), 8))]
                    }), [getRandomInt(), getRandomInt(), getRandomInt()]);
                }
                return map;
            }

            let map = getRandomStMap(10);


            const mapEntrys = Array.from(map, ([key, val]) => ({ key, val, keyIndex: findKeyIndex(map, key) }))
            .map(entry => new _MapEntrySt(entry)).sort((a, b) => {
                return a.keyIndex - b.keyIndex;
            })


            const result = mapTest.testInsertMapEntrySt(mapEntrys, toData(map)).verify()
            expect(result.success, result.error).to.be.true;

        })
    })
})
