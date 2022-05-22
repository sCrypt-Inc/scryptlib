
import { assert, expect } from 'chai';
import { newTx, loadDescription, getContractFilePath } from './helper';
import { buildContractClass, VerifyError, buildTypeClasses } from '../src/contract';

describe('GenericStruct  test', () => {

    describe('test genericsst6', () => {
        let c, result;

        const C = buildContractClass(loadDescription('genericsst6_desc.json'));
        const { ST0, ST1, ST2,L} = buildTypeClasses(C);
        before(() => {

            c = new C(new L(new ST2({
                x: new ST1({
                    x: new ST0({
                        x: 1,
                        y: [2,3]
                    }),
                    y: [4,5]
                }),
                y: 100
            })));
        });

        it('should unlock successfully', () => {

            result = c.unlock(new ST2({
                x: new ST1({
                    x: new ST0({
                        x: 1,
                        y: [2,3]
                    }),
                    y: [4,5]
                }),
                y: 100
            })).verify();

            expect(result.success, result.error).to.be.true
        })


        it('should unlock fail', () => {
            result = c.unlock(new ST2({
                x: new ST1({
                    x: new ST0({
                        x: 1,
                        y: [2,3]
                    }),
                    y: [4,5]
                }),
                y: 101
            })).verify();

            expect(result.success, result.error).to.be.false
            
        })


    });
});