import { expect } from 'chai'
import { loadDescription, newTx } from './helper'
import { buildContractClass } from '../src/contract'

describe('test.generic', () => {
    describe('check generic', () => {
        let testGenericLibray;

        before(() => {
            const jsonDescr = loadDescription('generic_desc.json')
            const TestGenericLibray = buildContractClass(jsonDescr)
            testGenericLibray = new TestGenericLibray(12)
        })

        it('test unlock', () => {

            const result = testGenericLibray.unlock(1).verify()

            expect(result.success, result.error).to.be.true;

        })


    })
})
