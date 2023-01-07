
import { assert, expect } from 'chai';
import { newTx, loadArtifact } from './helper';
import { buildContractClass } from '../src/contract';
import { bsv, getPreimage } from '../src/utils';
import { SigHashPreimage, StructObject } from '../src';
const inputIndex = 0;
const inputSatoshis = 100000;
const outputAmount = inputSatoshis

describe('GenericStruct  test', () => {

    describe('test genericsst7', () => {
        let c, result;
        let map = new Map<bigint, StructObject>();
        let set = new Set<StructObject>();

        const C = buildContractClass(loadArtifact('genericsst7.json'));

        before(() => {

            c = new C(map, set);
        });

        it('should add element successfully', () => {

            const valMap = {
                x: 1n,
                y: 2n
            };
            map.set(100n, valMap);

            const valSet = {
                x: 11n,
                y: 22n
            }

            set.add(valSet);


            let newLockingScript = c.getNewStateScript({
                hm: map,
                hs: set
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

            result = c.unlock({
                item: 100n,
                idx: C.findKeyIndex(map, 100n, "int")
            }, valMap, {
                item: valSet,
                idx: C.findKeyIndex(set, valSet, "ST0<int>")
            }, SigHashPreimage(preimage)).verify();

            expect(result.success, result.error).to.be.true

            c.hs = set
            c.hm = map
        })


        it('should add element successfully', () => {

            const valMap = {
                x: 1n,
                y: 2n
            };
            map.set(444n, valMap);

            const valSet = {
                x: 55n,
                y: 676n
            }

            set.add(valSet);


            let newLockingScript = c.getNewStateScript({
                hm: map,
                hs: set
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

            result = c.unlock({
                item: 444n,
                idx: C.findKeyIndex(map, 444n, "int")
            }, valMap, {
                item: valSet,
                idx: C.findKeyIndex(set, valSet, "ST0<int>")
            }, SigHashPreimage(preimage)).verify();

            expect(result.success, result.error).to.be.true

            c.hs = set
            c.hm = map
        })



        it('should add element fail', () => {

            const valMap = {
                x: 1n,
                y: 2n
            };
            map.set(444n, valMap);

            const valSet = {
                x: 55n,
                y: 676n
            }

            set.add(valSet);


            let newLockingScript = c.getNewStateScript({
                hm: map,
                hs: set
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

            result = c.unlock({
                item: 444n,
                idx: C.findKeyIndex(map, 444n, "int")
            }, valMap, {
                item: valSet,
                idx: C.findKeyIndex(set, valSet, "ST0<int>")
            }, SigHashPreimage(preimage)).verify();

            expect(result.success, result.error).to.be.false

        })

    });
});