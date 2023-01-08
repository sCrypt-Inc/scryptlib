
import { assert, expect } from 'chai';
import { loadArtifact } from './helper';
import { buildContractClass, Contract } from '../src';
import { getSortedItem } from '../src/scryptTypes';


describe('GenericStruct  set_map_simple.test', () => {

    let c: Contract, result;

    const C = buildContractClass(loadArtifact('set_map_simple.json'));
    before(() => {
        c = new C();
    });

    it('should add2Set successfully', () => {
        let set = new Set<bigint>();
        const e = 1n;
        set.add(e)
        result = c.add2Set(getSortedItem(set, 1n)).verify();

        expect(result.success, result.error).to.be.true
    })

    it('should add2Map successfully', () => {
        let map = new Map<bigint, bigint>();
        const key = 1n, val = 2n;
        map.set(key, val)
        result = c.add2Map(getSortedItem(map, key), val).verify();

        expect(result.success, result.error).to.be.true
    })
});