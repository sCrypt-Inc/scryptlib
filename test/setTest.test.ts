import { expect } from 'chai'
import { loadDescription, newTx } from './helper'
import { buildContractClass, Contract, ContractClass } from '../src/contract'
import { Bytes, StructObject, } from '../src/scryptTypes'
const inputIndex = 0;
const inputSatoshis = 100000;
const outputAmount = inputSatoshis

describe('test.setTest', () => {
    describe('setTest', () => {
        let setTest: Contract, SetTest: ContractClass;



        before(() => {
            const jsonDescr = loadDescription('setTest.json')
            SetTest = buildContractClass(jsonDescr)

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

            const result = setTest.testStructAsKey({
                item: st,
                idx: SetTest.findKeyIndex(set, st, "SetST")
            }, SetTest.toData(set, "HashedSet<SetST>")).verify()
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

            const result = setTest.testArrayAsKey2({
                item: newElem,
                idx: SetTest.findKeyIndex(set, newElem, "SetST[3]")
            }, SetTest.toData(set, "HashedSet<SetST[3]>")).verify()
            expect(result.success, result.error).to.be.true;
        })


        it('test testArrayAsKey2', () => {
            const newElem = [13n, 15n, 17n];
            let set = new Set<bigint[]>();
            set.add([3n, 5n, 7n]);
            set.add(newElem);

            const result = setTest.testArrayAsKey({
                item: newElem,
                idx: SetTest.findKeyIndex(set, newElem, "int[3]")
            }, SetTest.toData(set, "HashedSet<int[3]>")).verify()
            expect(result.success, result.error).to.be.true;
        })





        it('test testDeleteInt', () => {

            const set = SetTest.sortset(new Set([13n, 15n, 17n, 34n, 1n, 4n, 6n, 5n, 6667n, 2n]), "int");
            const initData = Array.from(set).map(e => ({
                item: e,
                idx: SetTest.findKeyIndex(set, e, 'int')
            }))


            for (const iterator of set) {
                const result = setTest.testDeleteInt(initData, {
                    item: iterator,
                    idx: SetTest.findKeyIndex(set, iterator, 'int')
                }).verify()
                expect(result.success, result.error).to.be.true;
            }
        })

        it('test testDeleteInt: should fail when elem not exist', () => {

            const set = SetTest.sortset(new Set([13n, 15n, 17n, 34n, 1n, 4n, 6n, 5n, 6667n, 2n]), "int");
            const initData = Array.from(set).map(e => ({
                item: e,
                idx: SetTest.findKeyIndex(set, e, "int")
            }))

            const fakeElem = 44667n;
            set.add(fakeElem);
            const result = setTest.testDeleteInt(initData, {
                item: fakeElem,
                idx: SetTest.findKeyIndex(set, fakeElem, "int")
            }).verify()
            expect(result.success, result.error).to.be.false;
        })


        it('test testHas', () => {


            const set = SetTest.sortset(new Set([13n, 15n, 17n, 34n, 1n, 4n, 6n, 5n, 6667n, 2n]), "int");
            const initData = Array.from(set).map(e => ({
                item: e,
                idx: SetTest.findKeyIndex(set, e, "int")
            }))
            const result = setTest.testHas(initData, ({
                item: 6667n,
                idx: SetTest.findKeyIndex(set, 6667n, "int")
            })).verify()
            expect(result.success, result.error).to.be.true;
        })

        it('test testHas: should fail when elem not exist', () => {

            const set = SetTest.sortset(new Set([13n, 15n, 17n, 34n, 1n, 4n, 6n, 5n, 6667n, 2n]), "int");
            const initData = Array.from(set).map(e => ({
                item: e,
                idx: SetTest.findKeyIndex(set, e, "int")
            }))
            const fakeElem = 5676n;
            set.add(fakeElem);

            const result = setTest.testHas(initData, ({
                item: fakeElem,
                idx: SetTest.findKeyIndex(set, fakeElem, "int")
            })).verify()
            expect(result.success, result.error).to.be.false;
        })

    })


})
