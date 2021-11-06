import { expect } from 'chai'
import { loadDescription, newTx } from './helper'
import { buildContractClass } from '../src/contract'

describe('test.flattenSha256', () => {
    describe('check flattenSha256', () => {
        let testflattenSha256;

        before(() => {
            const jsonDescr = loadDescription('flattenSha256_desc.json')
            const TestflattenSha256 = buildContractClass(jsonDescr)
            testflattenSha256 = new TestflattenSha256()
        })

        it('test unlock', () => {

            const result = testflattenSha256.unlock(1).verify()

            expect(result.success, result.error).to.be.true;

        })


    })
})
