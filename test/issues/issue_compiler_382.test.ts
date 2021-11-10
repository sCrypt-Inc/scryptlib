import { expect } from 'chai'
import { loadDescription, newTx } from '../helper'
import { buildContractClass } from '../../src/contract'

describe('test.issue_compiler_382', () => {
    describe('check issue_compiler_382', () => {
        let testGenericLibray;

        before(() => {
            const jsonDescr = loadDescription('issue_compiler_382_desc.json')
            const TestGenericLibray = buildContractClass(jsonDescr)
            testGenericLibray = new TestGenericLibray()
        })

        it('test unlock', () => {
            const result = testGenericLibray.unlock(1).verify()

            expect(result.success, result.error).to.be.true;
        })
    })
})
