
import { assert, expect } from 'chai';
import { newTx, loadDescription, getContractFilePath } from './helper';
import { buildContractClass, VerifyError, buildTypeClasses } from '../src/contract';
import { compileContract } from '../src';



describe('GenericStruct  test', () => {

    describe('test genericsst_simple', () => {
        let c, result;

        const C = buildContractClass(loadDescription('genericsst_simple_desc.json'));
        const { ST } = buildTypeClasses(C);
        before(() => {
            c = new C(new ST({
                x: 3
            }));
        });

        it('should unlock successfully', () => {
            result = c.unlock(new ST({
                x: 3
            })).verify();

            expect(result.success, result.error).to.be.true
        })

                
        it('should fail', () => {
            result = c.unlock(new ST({
                x: 2
            })).verify();

            expect(result.success, result.error).to.be.false
        })

    });


    describe('test genericsst_ctor', () => {
        let c, result;

        const C = buildContractClass(loadDescription('genericsst_ctor_desc.json'));
        const { ST0, ST1, ST2 } = buildTypeClasses(C);
        before(() => {
            c = new C(new ST1({
                x: 1
            }), new ST1({
                x: [1,2,3]
            }), new ST1({
                x: new ST0({
                    x: 1,
                    y: 2
                })
            }), new ST1({
                x: [
                    new ST2({
                        x:1
                    }),
                    new ST2({
                        x:2
                    })
                ]
            }));
        });

        it('should unlock successfully', () => {
            result = c.unlock(new ST1({
                x: 1
            }), new ST1({
                x: [1,2,3]
            }), new ST1({
                x: new ST0({
                    x: 1,
                    y: 2
                })
            }), new ST1({
                x: [
                    new ST2({
                        x:1
                    }),
                    new ST2({
                        x:2
                    })
                ]
            })).verify();

            expect(result.success, result.error).to.be.true
        })

        it('should fail', () => {
            result = c.unlock(new ST1({
                x: 1
            }), new ST1({
                x: [1,1,3]
            }), new ST1({
                x: new ST0({
                    x: 1,
                    y: 2
                })
            }), new ST1({
                x: [
                    new ST2({
                        x:10
                    }),
                    new ST2({
                        x:2
                    })
                ]
            })).verify();

            expect(result.success, result.error).to.be.false
        })
    });


    describe('test genericsst_alias', () => {
        let c, result;

        const C = buildContractClass(loadDescription('genericsst_alias_desc.json'));
        const { ST0, ST1, ST2, ST3 } = buildTypeClasses(C);
        before(() => {
            c = new C(new ST3({
                x: new ST1({
                    x: [1,3,44]
                }),
                y: new ST0({
                    x: 99,
                    y: new ST0({
                        x: 33,
                        y: 22
                    })
                })
            }), new ST0({
                x: 199,
                y: new ST0({
                    x: 333,
                    y: 242
                })
            }));
        });

        it('should fail', () => {
            result = c.unlock(new ST3({
                x: new ST1({
                    x: [1,3,44]
                }),
                y: new ST0({
                    x: 99,
                    y: new ST0({
                        x: 33,
                        y: 22
                    })
                })
            }), new ST0({
                x: 199,
                y: new ST0({
                    x: 333,
                    y: 242
                })
            })).verify();

            expect(result.success, result.error).to.be.true
        })

        it('should unlock successfully', () => {
            result = c.unlock(new ST3({
                x: new ST1({
                    x: [1,3,2]
                }),
                y: new ST0({
                    x: 99,
                    y: new ST0({
                        x: 33,
                        y: 22
                    })
                })
            }), new ST0({
                x: 199,
                y: new ST0({
                    x: 333,
                    y: 242
                })
            })).verify();

            expect(result.success, result.error).to.be.false
        })
    });



    describe('test genericsst.scrypt', () => {
        let c, result;

        const C = buildContractClass(loadDescription('genericsst_desc.json'));
        const { ST0, ST1, ST2, ST3 } = buildTypeClasses(C);
        before(() => {
            c = new C(new ST1({
                x: 1
            }), new ST1({
                x: [1,2,3]
            }), new ST1({
                x: new ST0({
                    x: 1,
                    y: 2
                })
            }), new ST1({
                x: [new ST2({
                    x: 1
                }), new ST2({
                    x: 2
                })]
            }));
        });

        it('should unlock successfully', () => {
            result = c.unlock(new ST1({
                x: 1
            }), new ST1({
                x: [1,2,3]
            }), new ST1({
                x: new ST0({
                    x: 1,
                    y: 2
                })
            }), new ST1({
                x: [new ST2({
                    x: 1
                }), new ST2({
                    x: 2
                })]
            })).verify();

            expect(result.success, result.error).to.be.true
        })

        it('should fail', () => {
            result = c.unlock(new ST1({
                x: 1
            }), new ST1({
                x: [1,2,3]
            }), new ST1({
                x: new ST0({
                    x: 1,
                    y: 2
                })
            }), new ST1({
                x: [new ST2({
                    x: 1
                }), new ST2({
                    x: 22
                })]
            })).verify();

            expect(result.success, result.error).to.be.false
        })

        it('should call unlock1 successfully', () => {

            const st2a = [new ST2({
                x: 1
            }), new ST2({
                x: 2
            }), new ST2({
                x: 3
            })];

            const st0 = new ST0({
                x: 11,
                y: st2a
            })

            const st1a = [new ST1({
                x: st0
            }), new ST1({
                x: st0
            })]

            result = c.unlock1(new ST3({
                x: st1a,
                st0: new ST0({
                    x: 111,
                    y: st1a
                })
            })).verify();

            expect(result.success, result.error).to.be.true
        })

        it('should call unlock1 fail', () => {

            const st2a = [new ST2({
                x: 1
            }), new ST2({
                x: 2
            }), new ST2({
                x: 31
            })];

            const st0 = new ST0({
                x: 11,
                y: st2a
            })

            const st1a = [new ST1({
                x: st0
            }), new ST1({
                x: st0
            })]

            result = c.unlock1(new ST3({
                x: st1a,
                st0: new ST0({
                    x: 111,
                    y: st1a
                })
            })).verify();

            expect(result.success, result.error).to.be.false
        })
    });


});