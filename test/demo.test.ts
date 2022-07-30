import { expect } from 'chai'
import { loadDescription } from './helper'
import { buildContractClass } from '../src/contract'

describe('test.demo', () => {
    let demo;

    before(() => {
        const Demo = buildContractClass(loadDescription('demo_desc.json'))
        demo = new Demo(1, 2)
    })

    it('test add', () => {
        const result = demo.add(4).verify()
        expect(result.success, result.error).to.be.false;
        expect(result.error).to.be.contains("VerifyError: SCRIPT_ERR_EVAL_FALSE_IN_STACK \n");
        expect(result.error).to.be.contains("demo.scrypt#15");
        expect(result.error).to.be.contains("fails at OP_ENDIF\n");

    })
})
