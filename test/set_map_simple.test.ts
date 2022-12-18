
import { assert, expect } from 'chai';
import { newTx, loadDescription, getContractFilePath } from './helper';
import { buildContractClass, Contract } from '../src';


describe('GenericStruct  set_map_simple.test', () => {

    let c: Contract, result;

    const C = buildContractClass(loadDescription('set_map_simple_desc.json'));
    before(() => {
        c = new C();
    });

    it('should add2Set successfully', () => {
        let set = new Set<bigint>();
        const e = 1n;
        set.add(e)
        result = c.add2Set(({
            item: 1n,
            idx: C.findKeyIndex(set, e, "int")
        })).verify();

        expect(result.success, result.error).to.be.true
    })

    it('should add2Map successfully', () => {
        let map = new Map<bigint, bigint>();
        const key = 1n, val = 2n;
        map.set(key, val)
        result = c.add2Map(({
            item: key,
            idx: C.findKeyIndex(map, key, "int")
        }), val).verify();

        expect(result.success, result.error).to.be.true
    })
});