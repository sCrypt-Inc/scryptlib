import { expect } from 'chai'
import { loadArtifact } from './helper'
import { buildContractClass } from '../src/contract'
import { Bytes } from '../src'

describe('test.generic', () => {
    describe('check generic', () => {
        let testGenericLibray;

        before(() => {
            const jsonArtifact = loadArtifact('generic.json')
            const TestGenericLibray = buildContractClass(jsonArtifact)
            testGenericLibray = new TestGenericLibray(12n)
        })

        it('test unlock', () => {

            const result = testGenericLibray.unlock(1n).verify()

            expect(result.success, result.error).to.be.true;

        })


        it('test generic output', () => {

            const jsonArtifact = loadArtifact('generic.json')

            expect(jsonArtifact.library).to.deep.include.members([
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

            const jsonArtifact = loadArtifact('generic_assignment.json')

            expect(jsonArtifact.library).to.deep.include.members([
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

    describe('check generic_nested_property', () => {
        let testGenericLibray;

        before(() => {
            const jsonArtifact = loadArtifact('generic_nested_property.json')
            const TestGenericLibray = buildContractClass(jsonArtifact)

            testGenericLibray = new TestGenericLibray([[{
                a: 101n,
                b: Bytes("01010f")
            }], 11n])
        })

        it('test unlock', () => {

            const result = testGenericLibray.unlock(11n).verify()

            expect(result.success, result.error).to.be.true;

        })

    })


    describe('check generic_nested_property1', () => {
        let testGenericLibray;

        before(() => {
            const jsonArtifact = loadArtifact('generic_nested_property1.json')
            const TestGenericLibray = buildContractClass(jsonArtifact)
            testGenericLibray = new TestGenericLibray([[111n]])
        })

        it('test unlock', () => {
            const result = testGenericLibray.unlock(111n).verify()
            expect(result.success, result.error).to.be.true;
        })

        it('should unlock fail', () => {
            const result = testGenericLibray.unlock(1111n).verify()
            expect(result.success, result.error).to.be.false;
        })
    })
})
