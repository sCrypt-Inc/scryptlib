import { expect } from 'chai'
import { loadArtifact, newTx } from '../helper'
import { buildContractClass } from '../../src/contract'

describe('test.issue146', () => {
    describe('check issue146', () => {
        let test;

        before(() => {
            const jsonArtifact = loadArtifact('issue146.json')
            const OpIfDup = buildContractClass(jsonArtifact)
            test = new OpIfDup()
        })

        it('test Expect failure due to non-clean stack', () => {
            const result = test.unlock(1n).verify()
            expect(result.success, result.error).to.be.false;
            expect(result.error).to.be.contains("SCRIPT_ERR_INVALID_STACK_OPERATION");
        })
    })
})
