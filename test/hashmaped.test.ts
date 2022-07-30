import { assert, expect } from 'chai'
import { loadDescription, newTx } from './helper'
import { buildContractClass, buildTypeClasses } from '../src/contract'
import { Bytes, SortedItem, } from '../src/scryptTypes'
import { findKeyIndex, toData, toHashedMap } from '../src/internal'

describe('test.hashedmap', () => {
    describe('hashedmap', () => {
        let mapTest;

        let map = new Map<number, any>();

        before(() => {
            const jsonDescr = loadDescription('hashedmap_desc.json')
            const C = buildContractClass(jsonDescr)

            map.set(22, new Bytes("f1"))
            map.set(3, new Bytes("99"))
            map.set(1234, new Bytes("f1ff"))



            mapTest = new C(toHashedMap(map))
        })


        it('test unlock', () => {

            const hex = toData(map).toHex()

            assert.equal(hex, "4cc0084fed08b978af4d7d196a7446a86b58009e636b611db16211b65a9aadff29c5fd9528b920d6d3956e9e16114523e1889c751e8c1e040182116d4c906b43f5587cb7c4547cf2653590d7a9ace60cc623d25148adfbc88a89aeb0ef88da7839bad4f09e5c5af99a24c7e304ca7997d26cb00901697de08a49be0d46ab5839b614806505393e046db3163e748c7c7ee1763d242f1f7815a0aaa32c211916df6f0438999152af10c421ddd26ea0baa3ad39ac02d45108d0bd2a6689321273293632")

            const result = mapTest.unlock().verify()
            expect(result.success, result.error).to.be.true;
        })
    })
})
