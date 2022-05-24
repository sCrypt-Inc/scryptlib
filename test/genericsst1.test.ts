
import { assert, expect } from 'chai';
import { newTx, loadDescription, getContractFilePath } from './helper';
import { buildContractClass, VerifyError, buildTypeClasses } from '../src/contract';


describe('GenericStruct  test', () => {

    describe('test genericsst1', () => {
        let c, result;

        const C = buildContractClass(loadDescription('genericsst1_desc.json'));
        const { ST0, ST1, ST2, L } = buildTypeClasses(C);
        before(() => {
            const st2a = [new ST2({
                x: 11
            }), new ST2({
                x: 12
            })]

            const st0 = new ST0({
                x: 11,
                y: st2a
            })

            const st1 = new ST1({
                x: st0,
                st0: new ST0({
                    x: 12,
                    y: st0
                })
            })

            c = new C(new L(st1));
        });

        it('should unlock successfully', () => {

            const st2a = [new ST2({
                x: 111
            }), new ST2({
                x: 122
            })]

            const st0 = new ST0({
                x: 112,
                y: st2a
            })

            const st1 = new ST1({
                x: st0,
                st0: new ST0({
                    x: 44,
                    y: st0
                })
            })

            result = c.unlock(st1).verify();

            expect(result.success, result.error).to.be.true
        })


        it('should unlock fail', () => {

            const st2a = [new ST2({
                x: 11
            }), new ST2({
                x: 12
            })]

            const st0 = new ST0({
                x: 11,
                y: st2a
            })

            const st1 = new ST1({
                x: st0,
                st0: new ST0({
                    x: 12,
                    y: st0
                })
            })

            result = c.unlock(st1).verify();

            expect(result.success, result.error).to.be.false
        })

             

    });
});