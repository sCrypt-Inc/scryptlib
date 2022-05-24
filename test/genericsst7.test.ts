
import { assert, expect } from 'chai';
import { newTx, loadDescription, getContractFilePath } from './helper';
import { buildContractClass, VerifyError, buildTypeClasses } from '../src/contract';
import { findKeyIndex, Struct, toHashedMap, toHashedSet } from '../src';
import { SortedItem } from '../src/scryptTypes';
import { bsv, toHex, getPreimage } from '../src/utils';
const inputIndex = 0;
const inputSatoshis = 100000;
const outputAmount = inputSatoshis

describe('GenericStruct  test', () => {

    describe('test genericsst7', () => {
        let c, result;
        let map = new Map<number, any>();
        let set = new Set<any>();

        const C = buildContractClass(loadDescription('genericsst7_desc.json'));
        const { ST0} = buildTypeClasses(C);
        before(() => {

            c = new C(toHashedMap(map), toHashedSet(set));
        });

        it('should add element successfully', () => {

            const valMap = new ST0({
                x: 1,
                y: 2
            });
            map.set(100, valMap);

            const valSet = new ST0({
                x: 11,
                y: 22
            })

            set.add(valSet);


            let newLockingScript = c.getNewStateScript({
                hm: toHashedMap(map),
                hs: toHashedSet(set)
            });

            const tx = newTx(inputSatoshis);
            tx.addOutput(new bsv.Transaction.Output({
                script: newLockingScript,
                satoshis: outputAmount
            }))

            c.txContext = {
                tx: tx,
                inputIndex,
                inputSatoshis
            }

            const preimage = getPreimage(tx, c.lockingScript, inputSatoshis)

            result = c.unlock(new SortedItem({
                item: 100,
                idx: findKeyIndex(map, 100)
            }), valMap, new SortedItem({
                item: valSet,
                idx: findKeyIndex(set, valSet)
            }), preimage).verify();

            expect(result.success, result.error).to.be.true

            c.hs = toHashedSet(set)
            c.hm = toHashedMap(map)
        })


        it('should add element successfully', () => {

            const valMap = new ST0({
                x: 1,
                y: 2
            });
            map.set(444, valMap);

            const valSet = new ST0({
                x: 55,
                y: 676
            })

            set.add(valSet);


            let newLockingScript = c.getNewStateScript({
                hm: toHashedMap(map),
                hs: toHashedSet(set)
            });

            const tx = newTx(inputSatoshis);
            tx.addOutput(new bsv.Transaction.Output({
                script: newLockingScript,
                satoshis: outputAmount
            }))

            c.txContext = {
                tx: tx,
                inputIndex,
                inputSatoshis
            }

            const preimage = getPreimage(tx, c.lockingScript, inputSatoshis)

            result = c.unlock(new SortedItem({
                item: 444,
                idx: findKeyIndex(map, 444)
            }), valMap, new SortedItem({
                item: valSet,
                idx: findKeyIndex(set, valSet)
            }), preimage).verify();

            expect(result.success, result.error).to.be.true

            c.hs = toHashedSet(set)
            c.hm = toHashedMap(map)
        })



        it('should add element fail', () => {

            const valMap = new ST0({
                x: 1,
                y: 2
            });
            map.set(444, valMap);

            const valSet = new ST0({
                x: 55,
                y: 676
            })

            set.add(valSet);


            let newLockingScript = c.getNewStateScript({
                hm: toHashedMap(map),
                hs: toHashedSet(set)
            });

            const tx = newTx(inputSatoshis);
            tx.addOutput(new bsv.Transaction.Output({
                script: newLockingScript,
                satoshis: outputAmount
            }))

            c.txContext = {
                tx: tx,
                inputIndex,
                inputSatoshis
            }

            const preimage = getPreimage(tx, c.lockingScript, inputSatoshis)

            result = c.unlock(new SortedItem({
                item: 444,
                idx: findKeyIndex(map, 444)
            }), valMap, new SortedItem({
                item: valSet,
                idx: findKeyIndex(set, valSet)
            }), preimage).verify();

            expect(result.success, result.error).to.be.false

        })

    });
});