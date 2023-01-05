import { expect } from 'chai'
import { loadArtifact, newTx } from './helper'
import { buildContractClass } from '../src/contract'

describe('test.flattenSha256', () => {
    describe('check flattenSha256', () => {
        let testflattenSha256;

        before(() => {
            const jsonArtifact = loadArtifact('flattenSha256.json')
            const TestflattenSha256 = buildContractClass(jsonArtifact)
            testflattenSha256 = new TestflattenSha256()
        })

        it('test unlock', () => {

            const result = testflattenSha256.unlock(1n).verify()

            expect(result.success, result.error).to.be.true;

        })


    })
})
