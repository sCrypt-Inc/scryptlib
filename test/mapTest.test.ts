import { expect } from 'chai'
import { loadArtifact, newTx } from './helper'
import { buildContractClass } from '../src/contract'
import { Bytes, } from '../src/scryptTypes'
import { Contract, ContractClass, num2bin } from '../src';
import { StructObject } from '../dist';
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


function getRandomBytesMap(n: bigint) {
    let map = new Map<Bytes, Bytes>();
    for (; map.size < n;) {
        map.set(Bytes(num2bin(getRandomInt(), 8)), Bytes(num2bin(getRandomInt(), 8)));
    }
    return map;
}

function getRandomBoolMap(n: bigint) {
    let map = new Map<bigint, boolean>();
    for (; map.size < n;) {
        map.set(getRandomInt(), getRandomInt() % 2n === 0n);
    }
    return map;
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
            const result = mapTest.unlock({
                item: 3n,
                idx: MapTest.findKeyIndex(map, 3n, "int")
            }, 1n).verify()
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

            let map = getRandomBoolMap(10n);


            const mapEntrys = Array.from(map, ([key, val]) => ({
                key: {
                    item: key,
                    idx: MapTest.findKeyIndex(map, key, "int")
                }, val
            }))
                .sort((a, b) => {
                    return Number(a.key.idx - b.key.idx);
                })


            const result = mapTest.testInsertMapEntryBool(mapEntrys, MapTest.toData(map, "HashedMap<int, bool>")).verify()
            expect(result.success, result.error).to.be.true;

        })

        it('test testInsertMapEntryBytes', () => {

            let map = getRandomBytesMap(10n);


            const mapEntrys = Array.from(MapTest.sortmap(map, "bytes"), ([key, val]) => ({ key, val }))
                .map((entry, index) => ({
                    key: {
                        item: entry.key,
                        idx: BigInt(index)
                    },
                    val: entry.val
                }))


            const result = mapTest.testInsertMapEntryBytes(mapEntrys, MapTest.toData(map, "HashedMap<bytes, bytes>")).verify()
            expect(result.success, result.error).to.be.true;

        })


        it('test testInsertMapEntrySt', () => {


            function getRandomStMap(n: bigint) {
                let map = new Map<StructObject, bigint[]>();
                for (; map.size < n;) {
                    map.set({
                        a: getRandomInt(),
                        b: getRandomInt() % 2n === 0n,
                        c: [Bytes(num2bin(getRandomInt(), 8)), Bytes(num2bin(getRandomInt(), 8)), Bytes(num2bin(getRandomInt(), 8))]
                    }, [getRandomInt(), getRandomInt(), getRandomInt()]);
                }
                return map;
            }

            let map = getRandomStMap(10n);


            const mapEntrys = Array.from(map, ([key, val]) => ({
                key: {
                    item: key,
                    idx: MapTest.findKeyIndex(map, key, "ST")
                }, val
            }))
                .sort((a, b) => {
                    return Number(a.key.idx - b.key.idx);
                })


            const result = mapTest.testInsertMapEntrySt(mapEntrys, MapTest.toData(map, "HashedMap<ST, int[3]>")).verify()
            expect(result.success, result.error).to.be.true;

        })


        it('test testInLoopIf', () => {

            let map = new Map<bigint, bigint>();

            map.set(5n, 3n);
            map.set(9n, 11n);
            map.set(19n, 22n);

            //init

            const mapEntrys = Array.from(map, ([key, val]) => ({
                key: {
                    item: key,
                    idx: MapTest.findKeyIndex(map, key, "int")
                }, val
            }))
                .sort((a, b) => {
                    return Number(a.key.idx - b.key.idx);
                })

            // delete

            mapEntrys.push({
                key: {
                    item: 5n,
                    idx: MapTest.findKeyIndex(map, 5n, "int")
                },
                val: 3n
            })
            map.delete(5n)

            mapEntrys.push({
                key: {
                    item: 9n,
                    idx: MapTest.findKeyIndex(map, 9n, "int")
                },
                val: 11n
            })
            map.delete(9n)
            mapEntrys.push({
                key: {
                    item: 19n,
                    idx: MapTest.findKeyIndex(map, 19n, "int")
                },
                val: 22n
            })


            const result = mapTest.testInLoopIf(mapEntrys).verify()
            expect(result.success, result.error).to.be.true;

        })
    })
})
