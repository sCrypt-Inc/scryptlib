import { expect } from 'chai'
import { loadArtifact, newTx } from '../helper'
import { buildContractClass } from '../../src/contract'

describe('test.issue_compiler_382', () => {
    describe('check issue_compiler_382', () => {
        let testGenericLibray;

        before(() => {
            const jsonArtifact = loadArtifact('issue_compiler_382.json')
            const TestGenericLibray = buildContractClass(jsonArtifact)
            testGenericLibray = new TestGenericLibray()
        })

        it('test unlock', () => {
            const result = testGenericLibray.unlock(1n).verify()

            expect(result.success, result.error).to.be.true;
        })
    })
})
