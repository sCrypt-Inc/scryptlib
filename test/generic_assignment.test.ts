import { expect } from 'chai'
import { loadArtifact, newTx } from './helper'
import { buildContractClass } from '../src/contract'

describe('test.generic_assignment', () => {
    describe('check generic_assignment', () => {
        let testGenericLibray;

        before(() => {
            const jsonArtifact = loadArtifact('generic_assignment.json')
            const TestGenericLibray = buildContractClass(jsonArtifact)
            testGenericLibray = new TestGenericLibray()
        })

        it('test unlock', () => {

            const result = testGenericLibray.unlock(1n).verify()

            expect(result.success, result.error).to.be.true;

        })


    })
})
