import { expect } from 'chai'
import { loadArtifact } from './helper'
import { buildContractClass } from '../src/contract'
import { Bytes, getSortedItem, StructObject } from '../src/scryptTypes'
import { Contract, ContractClass, num2bin } from '../src';
function getRandomInt(): bigint {
    return BigInt(Math.floor(Math.random() * 10000000));
}

function getRandomMap(n: bigint) {
    let map = new Map<bigint, bigint>();
    for (; map.size < n;) {
        map.set(getRandomInt(), getRandomInt());
    }
    return map;
}


function getRandomBytesMap(map: Map<Bytes, Bytes>) {
    let mapEntrys = [] as any[];
    for (; map.size < 10;) {
        let key = Bytes(num2bin(getRandomInt(), 8));
        let val = Bytes(num2bin(getRandomInt(), 8));

        mapEntrys.push({
            key: getSortedItem(map, key),
            val: val
        })

        map.set(key, val);
    }

    return mapEntrys;
}

function getRandomBoolMap(map: Map<bigint, boolean>) {
    let mapEntrys = [] as any[];
    for (; map.size < 10;) {
        let key = getRandomInt()
        let val = getRandomInt() % 2n === 0n;
        mapEntrys.push({
            key: getSortedItem(map, key),
            val: val
        })
        map.set(key, val);
    }
    return mapEntrys;
}


function getRandomStMap(map: Map<StructObject, bigint[]>) {
    let mapEntrys = [] as any[];
    for (; map.size < 10;) {
        let key = {
            a: getRandomInt(),
            b: getRandomInt() % 2n === 0n,
            c: [Bytes(num2bin(getRandomInt(), 8)), Bytes(num2bin(getRandomInt(), 8)), Bytes(num2bin(getRandomInt(), 8))]
        };

        let val = [getRandomInt(), getRandomInt(), getRandomInt()];
        mapEntrys.push({
            key: getSortedItem(map, key),
            val: val
        })
        map.set(key, val);
    }
    return mapEntrys;
}


describe('test.mapTest', () => {
    describe('mapTest', () => {
        let mapTest: Contract, MapTest: ContractClass;

        before(() => {
            const jsonArtifact = loadArtifact('mapTest.json')
            MapTest = buildContractClass(jsonArtifact)
            mapTest = new MapTest(Bytes(''))
        })

        it('test unlock', () => {
            let map = new Map<bigint, bigint>();
            map.set(3n, 1n);
            const result = mapTest.unlock(getSortedItem(map, 3n), 1n).verify()
            expect(result.success, result.error).to.be.true;

        })


        it('test testInsert', () => {

            let map = getRandomMap(10n);

            const mapEntrys = Array.from(map, ([key, val]) => ({
                key: {
                    item: key,
                    idx: MapTest.findKeyIndex(map, key, "int")
                }, val
            }))
                .sort((a, b) => {
                    return Number(a.key.idx - b.key.idx);
                })


            const result = mapTest.testInsert(mapEntrys, MapTest.toData(map, "HashedMap<int, int>")).verify()
            expect(result.success, result.error).to.be.true;

        })


        it('test testInsertMiddle', () => {
            const result = mapTest.testInsertMiddle(1n).verify()
            expect(result.success, result.error).to.be.true;
        })

        it('test testInsertMapEntryBool', () => {

            let map = new Map<bigint, boolean>();
            let mapEntrys = getRandomBoolMap(map);

            const querykeys = Array.from(map, ([key, val]) => (getSortedItem(map, key)))

            const result = mapTest.testInsertMapEntryBool(mapEntrys, querykeys, MapTest.toData(map, "HashedMap<int, bool>")).verify()
            expect(result.success, result.error).to.be.true;

        })

        it('test testInsertMapEntryBytes', () => {

            let map = new Map<Bytes, Bytes>();
            let mapEntrys = getRandomBytesMap(map);

            const querykeys = Array.from(map, ([key, val]) => (getSortedItem(map, key)))

            const result = mapTest.testInsertMapEntryBytes(mapEntrys, querykeys, MapTest.toData(map, "HashedMap<bytes, bytes>")).verify()
            expect(result.success, result.error).to.be.true;

        })


        it('test testInsertMapEntrySt', () => {

            let map = new Map<StructObject, bigint[]>();

            let mapEntrys = getRandomStMap(map);

            const querykeys = Array.from(map, ([key, val]) => (getSortedItem(map, key)))

            const result = mapTest.testInsertMapEntrySt(mapEntrys, querykeys, MapTest.toData(map, "HashedMap<ST, int[3]>")).verify()
            expect(result.success, result.error).to.be.true;

        })


        it('test testInLoopIf', () => {

            let map = new Map<bigint, bigint>();
            const mapEntrys = [] as any[];

            mapEntrys.push({
                key: getSortedItem(map, 5n),
                val: 3n
            })
            map.set(5n, 3n);
            mapEntrys.push({
                key: getSortedItem(map, 9n),
                val: 11n
            })
            map.set(9n, 11n);
            mapEntrys.push({
                key: getSortedItem(map, 19n),
                val: 22n
            })
            map.set(19n, 22n);


            mapEntrys.push({
                key: getSortedItem(map, 5n),
                val: 3n
            })

            map.delete(5n)

            mapEntrys.push({
                key: getSortedItem(map, 9n),
                val: 11n
            })
            map.delete(9n)
            mapEntrys.push({
                key: getSortedItem(map, 19n),
                val: 22n
            })


            const result = mapTest.testInLoopIf(mapEntrys).verify()
            expect(result.success, result.error).to.be.true;

        })
    })
})
