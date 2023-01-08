
import { expect } from 'chai';
import { loadArtifact } from './helper';
import { buildContractClass } from '../src/contract';


describe('GenericStruct  test', () => {

    describe('test genericsst1', () => {
        let c, result;

        const C = buildContractClass(loadArtifact('genericsst1.json'));
        before(() => {
            const st2a = [{
                x: 11n
            }, {
                x: 12n
            }]

            const st0 = {
                x: 11n,
                y: st2a
            }

            const st1 = {
                x: st0,
                st0: {
                    x: 12n,
                    y: st0
                }
            }

            c = new C([st1]);
        });

        it('should unlock successfully', () => {

            const st2a = [{
                x: 111n
            }, {
                x: 122n
            }]

            const st0 = {
                x: 112n,
                y: st2a
            }

            const st1 = {
                x: st0,
                st0: {
                    x: 44n,
                    y: st0
                }
            }

            result = c.unlock(st1).verify();

            expect(result.success, result.error).to.be.true
        })


        it('should unlock fail', () => {

            const st2a = [{
                x: 11n
            }, {
                x: 12n
            }]

            const st0 = {
                x: 11n,
                y: st2a
            }

            const st1 = {
                x: st0,
                st0: {
                    x: 12n,
                    y: st0
                }
            }

            result = c.unlock(st1).verify();

            expect(result.success, result.error).to.be.false
        })



    });
});