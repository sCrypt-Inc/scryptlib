
import { assert, expect } from 'chai';
import { loadArtifact } from './helper';
import { buildContractClass } from '../src/contract';



describe('GenericStruct  test', () => {

    describe('test genericsst_simple', () => {
        let c, result;

        const C = buildContractClass(loadArtifact('genericsst_simple.json'));

        before(() => {
            c = new C({
                x: {
                    y: 1n,
                    x: 3n
                }
            });
        });

        it('should unlock successfully', () => {
            result = c.unlock({
                x: {
                    y: 1n,
                    x: 3n
                }
            }).verify();

            expect(result.success, result.error).to.be.true
        })


        it('should fail', () => {
            result = c.unlock({
                x: {
                    y: 12n,
                    x: 3n
                }
            }).verify();

            expect(result.success, result.error).to.be.false
        })

    });


    describe('test genericsst_ctor', () => {
        let c, result;

        const C = buildContractClass(loadArtifact('genericsst_ctor.json'));
        before(() => {
            c = new C({
                x: 1n
            }, {
                x: [1n, 2n, 3n]
            }, {
                x: {
                    x: 1n,
                    y: 2n
                }
            }, {
                x: [
                    {
                        x: 1n
                    },
                    {
                        x: 2n
                    }
                ]
            });
        });

        it('should unlock successfully', () => {
            result = c.unlock({
                x: 1n
            }, {
                x: [1n, 2n, 3n]
            }, {
                x: {
                    x: 1n,
                    y: 2n
                }
            }, {
                x: [
                    {
                        x: 1n
                    },
                    {
                        x: 2n
                    }
                ]
            }).verify();

            expect(result.success, result.error).to.be.true
        })

        it('should fail', () => {
            result = c.unlock({
                x: 1n
            }, {
                x: [1n, 1n, 3n]
            }, {
                x: {
                    x: 1n,
                    y: 2n
                }
            }, {
                x: [
                    {
                        x: 10n
                    },
                    {
                        x: 2n
                    }
                ]
            }).verify();

            expect(result.success, result.error).to.be.false
        })
    });


    describe('test genericsst_alias', () => {
        let c, result;

        const C = buildContractClass(loadArtifact('genericsst_alias.json'));
        before(() => {
            c = new C({
                x: {
                    x: [1n, 3n, 44n]
                },
                y: {
                    x: 99n,
                    y: {
                        x: 33n,
                        y: 22n
                    }
                }
            }, {
                x: 199n,
                y: {
                    x: 333n,
                    y: 242n
                }
            });
        });

        it('should fail', () => {
            result = c.unlock({
                x: {
                    x: [1n, 3n, 44n]
                },
                y: {
                    x: 99n,
                    y: {
                        x: 33n,
                        y: 22n
                    }
                }
            }, {
                x: 199n,
                y: {
                    x: 333n,
                    y: 242n
                }
            }).verify();

            expect(result.success, result.error).to.be.true
        })

        it('should unlock successfully', () => {
            result = c.unlock({
                x: {
                    x: [1n, 3n, 2n]
                },
                y: {
                    x: 99n,
                    y: {
                        x: 33n,
                        y: 22n
                    }
                }
            }, {
                x: 199n,
                y: {
                    x: 333n,
                    y: 242n
                }
            }).verify();

            expect(result.success, result.error).to.be.false
        })
    });



    describe('test genericsst.scrypt', () => {
        let c, result;

        const C = buildContractClass(loadArtifact('genericsst.json'));
        before(() => {
            c = new C({
                x: 1n
            }, {
                x: [1n, 2n, 3n]
            }, {
                x: {
                    x: 1n,
                    y: 2n
                }
            }, {
                x: [{
                    x: 1n
                }, {
                    x: 2n
                }]
            });
        });

        it('should unlock successfully', () => {
            result = c.unlock({
                x: 1n
            }, {
                x: [1n, 2n, 3n]
            }, {
                x: {
                    x: 1n,
                    y: 2n
                }
            }, {
                x: [{
                    x: 1n
                }, {
                    x: 2n
                }]
            }).verify();

            expect(result.success, result.error).to.be.true
        })

        it('should fail', () => {
            result = c.unlock({
                x: 1n
            }, {
                x: [1n, 2n, 3n]
            }, {
                x: {
                    x: 1n,
                    y: 2n
                }
            }, {
                x: [{
                    x: 1n
                }, {
                    x: 22n
                }]
            }).verify();

            expect(result.success, result.error).to.be.false
        })

        it('should call unlock1 successfully', () => {

            const st2a = [{
                x: 1n
            }, {
                x: 2n
            }, {
                x: 3n
            }];

            const st0 = {
                x: 11n,
                y: st2a
            }

            const st1a = [{
                x: st0
            }, {
                x: st0
            }]

            result = c.unlock1({
                x: st1a,
                st0: {
                    x: 111n,
                    y: st1a
                }
            }).verify();

            expect(result.success, result.error).to.be.true
        })

        it('should call unlock1 fail', () => {

            const st2a = [{
                x: 1n
            }, {
                x: 2n
            }, {
                x: 31n
            }];

            const st0 = {
                x: 11n,
                y: st2a
            }

            const st1a = [{
                x: st0
            }, {
                x: st0
            }]

            result = c.unlock1({
                x: st1a,
                st0: {
                    x: 111n,
                    y: st1a
                }
            }).verify();

            expect(result.success, result.error).to.be.false
        })
    });


});