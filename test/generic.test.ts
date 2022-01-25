import { expect } from 'chai'
import { loadDescription, newTx } from './helper'
import { buildContractClass, buildTypeClasses } from '../src/contract'
import { Bytes } from '../src'

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

    describe('check generic_nested_property', () => {
        let testGenericLibray;

        before(() => {
            const jsonDescr = loadDescription('generic_nested_property_desc.json')
            const TestGenericLibray = buildContractClass(jsonDescr)
            const { GenericLibray, GenericA, ST } = buildTypeClasses(TestGenericLibray);
            testGenericLibray = new TestGenericLibray(new GenericLibray(new GenericA(new ST({
                a: 101,
                b: new Bytes("01010f")
            })), 11))
        })

        it('test unlock', () => {

            const result = testGenericLibray.unlock(11).verify()

            expect(result.success, result.error).to.be.true;

        })

    })


    describe('check generic_nested_property1', () => {
        let testGenericLibray;

        before(() => {
            const jsonDescr = loadDescription('generic_nested_property1_desc.json')
            const TestGenericLibray = buildContractClass(jsonDescr)
            const { GenericLibray, GenericA } = buildTypeClasses(TestGenericLibray);
            testGenericLibray = new TestGenericLibray(new GenericLibray(new GenericA(111)))
        })

        it('test unlock', () => {
            const result = testGenericLibray.unlock(111).verify()
            expect(result.success, result.error).to.be.true;
        })

        it('should unlock fail', () => {
            const result = testGenericLibray.unlock(1111).verify()
            expect(result.success, result.error).to.be.false;
        })
    })
})
