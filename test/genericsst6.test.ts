
import { expect } from 'chai';
import { loadArtifact } from './helper';
import { buildContractClass, } from '../src/contract';

describe('GenericStruct  test', () => {

    describe('test genericsst6', () => {
        let c, result;

        const C = buildContractClass(loadArtifact('genericsst6.json'));
        before(() => {

            c = new C([{
                x: {
                    x: {
                        x: 1n,
                        y: [2n, 3n]
                    },
                    y: [4n, 5n]
                },
                y: 100n
            }]);
        });

        it('should unlock successfully', () => {

            result = c.unlock({
                x: {
                    x: {
                        x: 1n,
                        y: [2n, 3n]
                    },
                    y: [4n, 5n]
                },
                y: 100n
            }).verify();

            expect(result.success, result.error).to.be.true
        })


        it('should unlock fail', () => {
            result = c.unlock({
                x: {
                    x: {
                        x: 1n,
                        y: [2n, 3n]
                    },
                    y: [4n, 5n]
                },
                y: 101n
            }).verify();

            expect(result.success, result.error).to.be.false

        })


    });
});