import { expect } from 'chai'
import { loadDescription, newTx } from './helper'
import { buildContractClass, buildTypeClasses } from '../src/contract'
import { Bytes, HashedSet, SortedItem, Struct } from '../src/scryptTypes'
import { findKeyIndex, sortset, toData } from '../src/internal'
import { bsv, toHex, getPreimage } from '../src/utils';
const inputIndex = 0;
const inputSatoshis = 100000;
const outputAmount = inputSatoshis

describe('test.setTest', () => {
    describe('setTest', () => {
        let setTest, SetTest;



        before(() => {
            const jsonDescr = loadDescription('setTest_desc.json')
            SetTest = buildContractClass(jsonDescr)

            setTest = new SetTest()
        })


        it('test testStructAsKey', () => {
            const { SetST } = buildTypeClasses(SetTest);
            let set = new Set<Struct>();
            set.add(new SetST({
                a: 3,
                b: new Bytes("003300")
            }) as Struct);

            const st = new SetST({
                a: 44,
                b: new Bytes("0033001112")
            }) as Struct;

            set.add(st);

            const result = setTest.testStructAsKey(new SortedItem({
                item: st,
                idx: findKeyIndex(set, st)
            }), toData(set)).verify()
            expect(result.success, result.error).to.be.true;
        })


        it('test testArrayAsKey', () => {
            const { SetST } = buildTypeClasses(SetTest);
            const initData = [new SetST({
                a: 3,
                b: new Bytes("01")
            }), new SetST({
                a: 5,
                b: new Bytes("0001")
            }), new SetST({
                a: 7,
                b: new Bytes("010101")
            })];

            const newElem = [new SetST({
                a: 13,
                b: new Bytes("9801")
            }), new SetST({
                a: 15,
                b: new Bytes("660001")
            }), new SetST({
                a: 17,
                b: new Bytes("99010101")
            })];


            let set = new Set<Struct[]>();
            set.add(initData as Struct[]);
            set.add(newElem as Struct[]);

            const result = setTest.testArrayAsKey2(new SortedItem({
                item: newElem,
                idx: findKeyIndex(set, newElem)
            }), toData(set)).verify()
            expect(result.success, result.error).to.be.true;
        })


        it('test testArrayAsKey2', () => {
            const newElem = [13, 15, 17];
            let set = new Set<number[]>();
            set.add([3, 5, 7]);
            set.add(newElem);

            const result = setTest.testArrayAsKey(new SortedItem({
                item: newElem,
                idx: findKeyIndex(set, newElem)
            }), toData(set)).verify()
            expect(result.success, result.error).to.be.true;
        })





        it('test testDeleteInt', () => {

            const set = sortset(new Set([13, 15, 17, 34, 1, 4, 6, 5, 6667, 2]));
            const initData = Array.from(set).map(e => new SortedItem({
                item: e,
                idx: findKeyIndex(set, e)
            }))


            for (const iterator of set) {
                const result = setTest.testDeleteInt(initData, new SortedItem({
                    item: iterator,
                    idx: findKeyIndex(set, iterator)
                })).verify()
                expect(result.success, result.error).to.be.true;
            }
        })

        it('test testDeleteInt: should fail when elem not exist', () => {

            const { Entry } = buildTypeClasses(SetTest);
            const set = sortset(new Set([13, 15, 17, 34, 1, 4, 6, 5, 6667, 2]));
            const initData = Array.from(set).map(e => new SortedItem({
                item: e,
                idx: findKeyIndex(set, e)
            }))

            const fakeElem = 44667;
            set.add(fakeElem);
            const result = setTest.testDeleteInt(initData, new SortedItem({
                item: fakeElem,
                idx: findKeyIndex(set, fakeElem)
            })).verify()
            expect(result.success, result.error).to.be.false;
        })


        it('test testHas', () => {

            const { Entry } = buildTypeClasses(SetTest);
            const set = sortset(new Set([13, 15, 17, 34, 1, 4, 6, 5, 6667, 2]));
            const initData = Array.from(set).map(e => new SortedItem({
                item: e,
                idx: findKeyIndex(set, e)
            }))
            const result = setTest.testHas(initData, new SortedItem({
                item: 6667,
                idx: findKeyIndex(set, 6667)
            })).verify()
            expect(result.success, result.error).to.be.true;
        })

        it('test testHas: should fail when elem not exist', () => {

            const set = sortset(new Set([13, 15, 17, 34, 1, 4, 6, 5, 6667, 2]));
            const initData = Array.from(set).map(e => new SortedItem({
                item: e,
                idx: findKeyIndex(set, e)
            }))
            const fakeElem = 5676;
            set.add(fakeElem);

            const result = setTest.testHas(initData, new SortedItem({
                item: fakeElem,
                idx: findKeyIndex(sortset(set), fakeElem)
            })).verify()
            expect(result.success, result.error).to.be.false;
        })

    })


})
