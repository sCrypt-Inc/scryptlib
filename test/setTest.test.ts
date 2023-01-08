import { expect } from 'chai'
import { loadArtifact } from './helper'
import { buildContractClass, Contract, ContractClass } from '../src/contract'
import { Bytes, getSortedItem, StructObject, } from '../src/scryptTypes'


describe('test.setTest', () => {
    describe('setTest', () => {
        let setTest: Contract, SetTest: ContractClass;



        before(() => {
            const jsonArtifact = loadArtifact('setTest.json')
            SetTest = buildContractClass(jsonArtifact)

            setTest = new SetTest()
        })


        it('test testStructAsKey', () => {
            let set = new Set<StructObject>();
            set.add({
                a: 3n,
                b: Bytes("003300")
            });

            const st = {
                a: 44n,
                b: Bytes("0033001112")
            };

            set.add(st);

            const result = setTest.testStructAsKey(getSortedItem(set, st), SetTest.toData(set, "HashedSet<SetST>")).verify()
            expect(result.success, result.error).to.be.true;
        })


        it('test testArrayAsKey', () => {

            const initData = [{
                a: 3n,
                b: Bytes("01")
            }, {
                a: 5n,
                b: Bytes("0001")
            }, {
                a: 7n,
                b: Bytes("010101")
            }];

            const newElem = [{
                a: 13n,
                b: Bytes("9801")
            }, {
                a: 15n,
                b: Bytes("660001")
            }, {
                a: 17n,
                b: Bytes("99010101")
            }];


            let set = new Set<StructObject[]>();
            set.add(initData);
            set.add(newElem);

            const result = setTest.testArrayAsKey2(getSortedItem(set, newElem), SetTest.toData(set, "HashedSet<SetST[3]>")).verify()
            expect(result.success, result.error).to.be.true;
        })


        it('test testArrayAsKey2', () => {
            const newElem = [13n, 15n, 17n];
            let set = new Set<bigint[]>();
            set.add([3n, 5n, 7n]);
            set.add(newElem);

            const result = setTest.testArrayAsKey(getSortedItem(set, newElem), SetTest.toData(set, "HashedSet<int[3]>")).verify()
            expect(result.success, result.error).to.be.true;
        })





        it('test testDeleteInt', () => {

            const set = new Set([13n, 15n, 17n, 34n, 1n, 4n, 6n, 5n, 6667n, 2n]);
            let setSorted = new Set();
            const initData = Array.from(set).map(e => {
                setSorted.add(e);
                return getSortedItem(setSorted, e)
            })


            for (const iterator of set) {
                const result = setTest.testDeleteInt(initData, getSortedItem(set, iterator)).verify()
                expect(result.success, result.error).to.be.true;
            }
        })

        it('test testDeleteInt: should fail when elem not exist', () => {

            const set = new Set([13n, 15n, 17n, 34n, 1n, 4n, 6n, 5n, 6667n, 2n]);
            let setSorted = new Set();
            const initData = Array.from(set).map(e => {
                setSorted.add(e);
                return getSortedItem(setSorted, e)
            })

            const fakeElem = 44667n;
            set.add(fakeElem);
            const result = setTest.testDeleteInt(initData, getSortedItem(setSorted, fakeElem)).verify()
            expect(result.success, result.error).to.be.false;
        })


        it('test testHas', () => {


            const set = new Set([13n, 15n, 17n, 34n, 1n, 4n, 6n, 5n, 6667n, 2n]);
            let setSorted = new Set();
            const initData = Array.from(set).map(e => {
                setSorted.add(e);
                return getSortedItem(setSorted, e)
            })

            const result = setTest.testHas(initData, getSortedItem(setSorted, 6667n)).verify()
            expect(result.success, result.error).to.be.true;
        })

        it('test testHas: should fail when elem not exist', () => {

            const set = new Set([13n, 15n, 17n, 34n, 1n, 4n, 6n, 5n, 6667n, 2n]);
            let setSorted = new Set();
            const initData = Array.from(set).map(e => {
                setSorted.add(e);
                return getSortedItem(setSorted, e)
            })
            const fakeElem = 5676n;
            set.add(fakeElem);
            const result = setTest.testHas(initData, getSortedItem(setSorted, fakeElem)).verify()
            expect(result.success, result.error).to.be.false;
        })

    })


})
