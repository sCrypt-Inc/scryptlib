import { expect } from 'chai'
import { loadDescription, newTx } from './helper'
import { buildContractClass } from '../src/contract'

describe('instProp.test', () => {
    describe('instProp.test', () => {
        let c;

        before(() => {
            const jsonDescr = loadDescription('instProp_desc.json')
            const C = buildContractClass(jsonDescr)
            c = new C()
        })

        it('test unlock', () => {
            const result = c.unlock().verify()
            expect(result.success, result.error).to.be.true;
        })

    })
})
