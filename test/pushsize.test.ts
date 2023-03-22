import { expect } from 'chai'
import { loadArtifact } from './helper'
import { buildContractClass } from '../src/contract'

describe('test.pushSize', () => {
    let pushSize;

    before(() => {
        const PushSize = buildContractClass(loadArtifact('pushsize.json'))
        pushSize = new PushSize()
    })

    it('test 520 bytes', () => {
        const result = pushSize.unlock("00".repeat(520), 520n).verify()

        expect(result.success, result.error).to.be.true
    })

    it('test 52000000 bytes', () => {
        const result = pushSize.unlock("00".repeat(5200000), 5200000n).verify()
        expect(result.success, result.error).to.be.true
    })
})
