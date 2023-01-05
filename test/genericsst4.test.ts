
import { expect } from 'chai';
import { loadArtifact, excludeMembers } from './helper';
import { buildContractClass, } from '../src/contract';
import { Bytes } from '../src';
import { readFileSync } from 'fs';
import { uri2path } from '../src/internal';


describe('GenericStruct  test', () => {

    describe('test genericsst4', () => {
        let c, result;

        const C = buildContractClass(loadArtifact('genericsst4.json'));
        before(() => {
            const l = [
                [
                    [{
                        a: {
                            x: [true],
                            y: [1n, 1n, 1n]
                        },
                        b: {
                            x: Bytes('0011'),
                            y: true
                        }
                    }, {
                        a: {
                            x: [true],
                            y: [2n, 2n, 2n]
                        },
                        b: {
                            x: Bytes('001111'),
                            y: true
                        }
                    }],
                    [{
                        a: {
                            x: [true],
                            y: [3n, 3n, 3n]
                        },
                        b: {
                            x: Bytes('001111ff'),
                            y: true
                        }
                    }, {
                        a: {
                            x: [true],
                            y: [4n, 4n, 4n]
                        },
                        b: {
                            x: Bytes('02201111ff'),
                            y: true
                        }
                    }]
                ],

                {
                    x: 11n,
                    y: {
                        x: 2n,
                        y: 3n
                    }
                }
            ];
            c = new C(l);
        });

        it('should unlock successfully', () => {

            result = c.unlock({
                x: [true],
                y: [1n, 1n, 1n]
            }, {
                x: Bytes(''),
                y: false
            }).verify();

            expect(result.success, result.error).to.be.true
        })



        it('test genLaunchConfig', () => {

            const file = c.unlock({
                x: [true],
                y: [1n, 1n, 1n]
            }, {
                x: Bytes(''),
                y: false
            }).genLaunchConfig();


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
            result = c.unlock({
                x: [true],
                y: [1n, 1n, 2n]
            }, {
                x: Bytes(''),
                y: false
            }).verify();

            expect(result.success, result.error).to.be.false

        })


    });
});