import { expect } from 'chai'
import { loadDescription, newTx } from './helper'
import { buildContractClass, buildTypeClasses } from '../src/contract'
import { Bytes, Struct } from '../src/scryptTypes'
import { findKeyIndex, sortmap, toStorage } from '../src/internal'

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


            const result = mapTest.testInsert(mapEntrys, toStorage(map)).verify()
            expect(result.success, result.error).to.be.true;

        })
    })
})
