
import { assert, expect } from 'chai';
import { newTx, loadDescription, getContractFilePath } from './helper';
import { buildContractClass, VerifyError, buildTypeClasses } from '../src/contract';
import { Bytes, findKeyIndex, Int } from '../src';
import { HashedMap, SortedItem } from '../src/scryptTypes';


describe('GenericStruct  set_map_simple.test', () => {

    let c, result;

    const C = buildContractClass(loadDescription('set_map_simple_desc.json'));
    before(() => {
        c = new C();
    });

    it('should add2Set successfully', () => {
        let set = new Set<number>();
        const e = 1;
        set.add(e)
        result = c.add2Set(new SortedItem({
            item: 1,
            idx: findKeyIndex(set, e)
        })).verify();

        expect(result.success, result.error).to.be.true
    })

    it('should add2Map successfully', () => {
        let map = new Map<number, number>();
        const key = 1, val = 2;
        map.set(key, val)
        result = c.add2Map(new SortedItem({
            item: key,
            idx: findKeyIndex(map, key)
        }), val).verify();

        expect(result.success, result.error).to.be.true
    })
});