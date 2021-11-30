import { expect } from 'chai'
import { loadDescription, newTx } from '../helper'
import { buildContractClass } from '../../src/contract'
import { PrivKey } from '../../src/scryptTypes'
import { readLaunchJson } from '../../src/internal'

describe('test.Issue149', () => {
    describe('check Issue149', () => {
        let test;

        before(() => {
            const jsonDescr = loadDescription('issue149_desc.json')
            const Issue149 = buildContractClass(jsonDescr)
            test = new Issue149()
        })

        it('test Expect generate right launch.json when public function contains PrivKey', () => {
            const result = test.unlock(new PrivKey(11)).verify()
            expect(result.success, result.error).to.be.false;
            const launch = readLaunchJson(result.error);
            expect(launch.configurations[0].pubFuncArgs).to.deep.eq(["PrivKey(0x0b)"]);
        })
    })
})
