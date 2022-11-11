import { expect } from 'chai'
import { loadDescription } from './helper'
import { buildContractClass } from '../src/contract'

describe('test.issue206', () => {
    let demo;

    before(() => {
        const Demo = buildContractClass(loadDescription('issue206_desc.json'))
        demo = new Demo()
    })

    it('test add', () => {
        const result = demo.add(11).verify()
        expect(result.success, result.error).to.be.true;
    })
})
