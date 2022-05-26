
import { assert, expect } from 'chai';
import { newTx, loadDescription, getContractFilePath, excludeMembers } from './helper';
import { buildContractClass, VerifyError, buildTypeClasses } from '../src/contract';
import { Bytes } from '../src';
import { readFileSync } from 'fs';
import { uri2path } from '../src/internal';


describe('GenericStruct  test', () => {

    describe('test genericsst4', () => {
        let c, result;

        const C = buildContractClass(loadDescription('genericsst4_desc.json'));
        const { ST0, ST1, L } = buildTypeClasses(C);
        before(() => {
            const l = new L(
                [
                    [new ST1({
                        a: new ST0({
                            x: [true],
                            y: [1, 1, 1]
                        }),
                        b: new ST0({
                            x: new Bytes('0011'),
                            y: true
                        })
                    }), new ST1({
                        a: new ST0({
                            x: [true],
                            y: [2, 2, 2]
                        }),
                        b: new ST0({
                            x: new Bytes('001111'),
                            y: true
                        })
                    })],
                    [new ST1({
                        a: new ST0({
                            x: [true],
                            y: [3, 3, 3]
                        }),
                        b: new ST0({
                            x: new Bytes('001111ff'),
                            y: true
                        })
                    }), new ST1({
                        a: new ST0({
                            x: [true],
                            y: [4, 4, 4]
                        }),
                        b: new ST0({
                            x: new Bytes('02201111ff'),
                            y: true
                        })
                    })]
                ],

                new ST0({
                    x: 11,
                    y: new ST0({
                        x: 2,
                        y: 3
                    })
                })
            );
            c = new C(l);
        });

        it('should unlock successfully', () => {

            result = c.unlock(new ST0({
                x: [true],
                y: [1, 1, 1]
            }), new ST0({
                x: new Bytes(''),
                y: false
            })).verify();

            expect(result.success, result.error).to.be.true
        })



        it('test genLaunchConfig', () => {

            const file = c.unlock(new ST0({
                x: [true],
                y: [1, 1, 1]
            }), new ST0({
                x: new Bytes(''),
                y: false
            })).genLaunchConfig();


            const config = JSON.parse(readFileSync(uri2path(file)).toString())

            expect(excludeMembers(config, ['program'])).deep.equal({
                "version": "0.2.0",
                "configurations": [
                    {
                        "type": "scrypt",
                        "request": "launch",
                        "internalConsoleOptions": "openOnSessionStart",
                        "name": "Debug C",
                        "constructorArgs": [
                            [
                                [
                                    [
                                        {
                                            "a": {
                                                "x": [
                                                    true
                                                ],
                                                "y": [
                                                    1,
                                                    1,
                                                    1
                                                ]
                                            },
                                            "b": {
                                                "x": "b'0011'",
                                                "y": true
                                            }
                                        },
                                        {
                                            "a": {
                                                "x": [
                                                    true
                                                ],
                                                "y": [
                                                    2,
                                                    2,
                                                    2
                                                ]
                                            },
                                            "b": {
                                                "x": "b'001111'",
                                                "y": true
                                            }
                                        }
                                    ],
                                    [
                                        {
                                            "a": {
                                                "x": [
                                                    true
                                                ],
                                                "y": [
                                                    3,
                                                    3,
                                                    3
                                                ]
                                            },
                                            "b": {
                                                "x": "b'001111ff'",
                                                "y": true
                                            }
                                        },
                                        {
                                            "a": {
                                                "x": [
                                                    true
                                                ],
                                                "y": [
                                                    4,
                                                    4,
                                                    4
                                                ]
                                            },
                                            "b": {
                                                "x": "b'02201111ff'",
                                                "y": true
                                            }
                                        }
                                    ]
                                ],
                                {
                                    "x": 11,
                                    "y": {
                                        "x": 2,
                                        "y": 3
                                    }
                                }
                            ]
                        ],
                        "pubFunc": "unlock",
                        "pubFuncArgs": [
                            {
                                "x": [
                                    true
                                ],
                                "y": [
                                    1,
                                    1,
                                    1
                                ]
                            },
                            {
                                "x": "b''",
                                "y": false
                            }
                        ]
                    }
                ]
            })
        })


        it('should unlock fail', () => {
            result = c.unlock(new ST0({
                x: [true],
                y: [1, 1, 2]
            }), new ST0({
                x: new Bytes(''),
                y: false
            })).verify();

            expect(result.success, result.error).to.be.false

        })


    });
});