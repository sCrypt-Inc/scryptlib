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


        it('test generic output', () => {

            const jsonDescr = loadDescription('generic_desc.json')

            expect(jsonDescr.library).to.deep.include.members([
                {
                    "name": "GenericLibray",
                    "params": [
                        {
                            "name": "a",
                            "type": "T"
                        }
                    ],
                    "properties": [
                        {
                            "name": "a",
                            "type": "T"
                        }
                    ],
                    "genericTypes": [
                        "T",
                        "K",
                        "C",
                        "D"
                    ]
                }
            ])
        })


        it('test generic output', () => {

            const jsonDescr = loadDescription('generic_assignment_desc.json')

            expect(jsonDescr.library).to.deep.include.members([
                {
                    "name": "GenericLibray",
                    "params": [],
                    "properties": [],
                    "genericTypes": [
                        "T"
                    ]
                }
            ])
        })
    })
})
