
import { assert, expect } from 'chai';
import { newTx, loadDescription, getContractFilePath } from './helper';
import { buildContractClass, VerifyError, buildTypeClasses } from '../src/contract';


describe('GenericStruct  test', () => {

    describe('test genericsst2', () => {
        let c, result;

        const C = buildContractClass(loadDescription('genericsst2_desc.json'));
        const { ST0, ST1} = buildTypeClasses(C);
        before(() => {
            
            c = new C(new ST0({
                x: [false],
                y: [1,2,3]
            }));
        });

        it('should unlock successfully', () => {

            result = c.unlock(new ST0({
                x: true,
                y: 1
            }), new ST0({
                x: [false],
                y: [1,2,3]
            })).verify();

            expect(result.success, result.error).to.be.true
        })


        it('should unlock fail', () => {

            result = c.unlock(new ST0({
                x: true,
                y: 1
            }), new ST0({
                x: [false],
                y: [1,2,31]
            })).verify();

            expect(result.success, result.error).to.be.false
        })


    });
});