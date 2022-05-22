
import { assert, expect } from 'chai';
import { newTx, loadDescription, getContractFilePath } from './helper';
import { buildContractClass, VerifyError, buildTypeClasses } from '../src/contract';
import { Bytes } from '../src';
import { HashedMap } from '../src/scryptTypes';


describe('GenericStruct  test', () => {

    describe('test genericsst5', () => {
        let c, result;

        const C = buildContractClass(loadDescription('genericsst5_desc.json'));
        const { ST0, ST1, ERC20} = buildTypeClasses(C);
        before(() => {
            const erc20 = new ERC20(
                1000000,
                new HashedMap(new Bytes(''))
            );
            c = new C(erc20);
        });

        it('should unlock successfully', () => {

            result = c.unlock(new ST1({
                x: new ST0({
                    x: false,
                    y: 3000
                }),
                y: 2000
            })).verify();

            expect(result.success, result.error).to.be.true
        })


        it('should unlock fail', () => {
            result = c.unlock(new ST1({
                x: new ST0({
                    x: false,
                    y: 3000
                }),
                y: 2001
            })).verify();

            expect(result.success, result.error).to.be.false
            
        })


    });
});