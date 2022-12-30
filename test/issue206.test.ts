import { expect } from 'chai'
import { loadArtifact } from './helper'
import { buildContractClass } from '../src/contract'

describe('test.issue206', () => {
    let demo;

    before(() => {
        const Demo = buildContractClass(loadArtifact('issue206.json'))
        demo = new Demo()
    })

    it('test add', () => {
        const result = demo.add(11n).verify()
        expect(result.success, result.error).to.be.true;
    })
})
