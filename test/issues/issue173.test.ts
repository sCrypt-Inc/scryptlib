import { expect } from 'chai'
import { loadArtifact, newTx } from '../helper'
import { buildContractClass } from '../../src/contract'
import { PrivKey } from '../../src/scryptTypes'
import { readLaunchJson } from '../../src/internal'

describe('test.Issue173', () => {
    describe('check Issue173', () => {

        it('should verify success', () => {
            const jsonArtifact = loadArtifact('ctc1.json')
            const B = buildContractClass(jsonArtifact)
            let test = new B(11n)
            const result = test.unlock().verify()
            expect(result.success, result.error).to.be.true;
        })

        it('should verify fail', () => {
            const jsonArtifact = loadArtifact('ctc1.json')
            const B = buildContractClass(jsonArtifact)
            let test = new B(12n)
            const result = test.unlock().verify()
            expect(result.success, result.error).to.be.false;
        })
    })
})
