import { expect } from 'chai'
import { loadArtifact, newTx } from './helper'
import { buildContractClass } from '../src/contract'

describe('instProp.test', () => {
    describe('instProp.test', () => {
        let c;

        before(() => {
            const jsonArtifact = loadArtifact('instProp.json')
            const C = buildContractClass(jsonArtifact)
            c = new C()
        })

        it('test unlock', () => {
            const result = c.unlock().verify()
            expect(result.success, result.error).to.be.true;
        })

    })
})
