
import { assert, expect } from 'chai';
import { loadArtifact } from './helper';
import { buildContractClass } from '../src/contract';


describe('GenericStruct  test', () => {

    describe('test genericsst2', () => {
        let c, result;

        const C = buildContractClass(loadArtifact('genericsst2.json'));
        before(() => {

            c = new C({
                x: [false],
                y: [1n, 2n, 3n]
            });
        });

        it('should unlock successfully', () => {

            result = c.unlock({
                x: true,
                y: 1n
            }, {
                x: [false],
                y: [1n, 2n, 3n]
            }).verify();

            expect(result.success, result.error).to.be.true
        })


        it('should unlock fail', () => {

            result = c.unlock({
                x: true,
                y: 1n
            }, {
                x: [false],
                y: [1n, 2n, 31n]
            }).verify();

            expect(result.success, result.error).to.be.false
        })


    });
});