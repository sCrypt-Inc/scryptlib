import { expect } from 'chai'
import { loadDescription, newTx } from '../helper'
import { buildContractClass } from '../../src/contract'

describe('test.issue146', () => {
    describe('check issue146', () => {
        let test;

        before(() => {
            const jsonDescr = loadDescription('issue146_desc.json')
            const TestGenericLibray = buildContractClass(jsonDescr)
            test = new TestGenericLibray()
        })

        it('test Expect failure due to non-clean stack', () => {
            const result = test.unlock(1).verify()
            expect(result.success, result.error).to.be.false;
            expect(result.error).to.be.contains("SCRIPT_ERR_INVALID_STACK_OPERATION");
        })
    })
})
