import { expect } from 'chai'
import { loadDescription, newTx } from '../helper'
import { buildContractClass } from '../../src/contract'
import { PrivKey } from '../../src/scryptTypes'
import { readLaunchJson } from '../../src/internal'

describe('test.Issue173', () => {
    describe('check Issue173', () => {

        it('should verify success', () => {
            const jsonDescr = loadDescription('ctc1_desc.json')
            const B = buildContractClass(jsonDescr)
            let test = new B(11)
            const result = test.unlock().verify()
            expect(result.success, result.error).to.be.true;
        })

        it('should verify fail', () => {
            const jsonDescr = loadDescription('ctc1_desc.json')
            const B = buildContractClass(jsonDescr)
            let test = new B(12)
            const result = test.unlock().verify()
            expect(result.success, result.error).to.be.false;
        })
    })
})
