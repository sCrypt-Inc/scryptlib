
import { assert, expect } from 'chai';
import { newTx, loadArtifact } from './helper';
import { buildContractClass } from '../src/contract';
import { Bytes, Contract } from '../src';


describe('GenericStruct  test', () => {

    describe('test genericsst5', () => {
        let c: Contract, result;

        const C = buildContractClass(loadArtifact('genericsst5.json'));
        before(() => {
            c = new C([1000000n, [Bytes('')]]);
        });

        it('should unlock successfully', () => {

            result = c.unlock({
                x: {
                    x: false,
                    y: 3000n
                },
                y: 2000n
            }).verify();

            expect(result.success, result.error).to.be.true
        })


        it('should unlock fail', () => {
            result = c.unlock({
                x: {
                    x: false,
                    y: 3000n
                },
                y: 2001n
            }).verify();

            expect(result.success, result.error).to.be.false

        })

    });
});