import { assert, expect } from 'chai';
import * as path from "path";
import * as os from "os";
import { loadArtifact, getContractFilePath, getInvalidContractFilePath, excludeMembers, newTx } from './helper'
import { ABIEntityType, compilerVersion, compile } from '../src/compilerWrapper';
import { compileContract, compileContractAsync, bsv, signTx } from '../src/utils';
import { writeFileSync, readFileSync, mkdtempSync, copyFileSync } from 'fs';
import { join } from 'path';
import { buildContractClass } from '../src/contract';
import { findCompiler } from '../src/findCompiler';
import { Ripemd160, PubKey, toHex, Sig, Artifact } from '../src';

describe('compile()', () => {
  it('compile successfully', () => {
    const result = compileContract(getContractFilePath('p2pkh.scrypt'));

    assert.typeOf(result, 'object');
    assert.equal(result.errors.length, 0, "No Errors");
  })



  it('should generate description file properly', () => {

    const content = loadArtifact('bar.json');

    assert.deepEqual(content.abi, [
      {
        "type": ABIEntityType.FUNCTION,
        "name": "unlock",
        "index": 0,
        "params": [
          {
            "name": "y",
            "type": "int"
          }
        ]
      }, {
        "type": ABIEntityType.CONSTRUCTOR,
        "params": [
          {
            "name": "_x",
            "type": "int"
          },
          {
            "name": "y",
            "type": "int"
          },
          {
            "name": "z",
            "type": "int"
          }
        ]
      }
    ])
  })

  it('should generate structs properly', () => {
    const result = loadArtifact('person.json');

    assert.equal(result.structs.length, 2);

    expect(result.structs).to.deep.include.members([{
      name: 'Person',
      params: [{
        "name": "addr",
        "type": "bytes"
      }, {
        "name": "isMale",
        "type": "bool"
      }, {
        "name": "age",
        "type": "int"
      }],
      "genericTypes": []
    }, {
      name: 'Block',
      params: [{
        "name": "hash",
        "type": "bytes"
      }, {
        "name": "header",
        "type": "bytes"
      }, {
        "name": "time",
        "type": "int"
      }],
      "genericTypes": []
    }
    ])
  })

  describe('test compilerVersion', () => {


    it('test compilerVersion', () => {
      let scryptc = findCompiler() as string;

      assert.isDefined(scryptc)

      const version = compilerVersion(scryptc) as string;
      expect(/^(\d)+\.(\d)+\.(\d)+\+commit\./.test(version)).to.be.true
    })

  })



  describe('artifact should be as expected', () => {
    let artifact: Artifact;
    before(() => {
      artifact = loadArtifact('tokenUtxo.json');
    });

    it('compileResult file should be main contract', () => {
      expect(artifact.file).to.contains("tokenUtxo.scrypt");
    })

  });


  describe('compile error test', () => {
    it('should compile fail with import error', () => {
      const result = compileContract(getInvalidContractFilePath('main.scrypt'));

      assert.typeOf(result.errors, 'array');

      result.errors.forEach(e => {
        e.filePath = path.basename(e.filePath);
      })

      expect(result.errors).to.deep.include.members([{
        filePath: "main.scrypt",
        message: "File not found: \" lib.scrypt\"",
        position: [
          {
            "column": 8,
            "line": 1
          },
          {
            "column": 21,
            "line": 1
          }
        ],
        type: "SemanticError",
        relatedInformation: []

      }])

    })


    it('should compile fail with import error', () => {
      const result = compileContract(getInvalidContractFilePath('main0.scrypt'));

      assert.typeOf(result.errors, 'array');

      result.errors.forEach(e => {
        e.filePath = path.basename(e.filePath);
      })

      expect(result.errors).to.deep.include.members([{
        filePath: "main0.scrypt",
        message: "File not found: \"libx.scrypt\"",
        position: [
          {
            "column": 8,
            "line": 1
          },
          {
            "column": 21,
            "line": 1
          }
        ],
        type: "SemanticError",
        relatedInformation: []
      }])
    })

    it('should compile fail with import error', () => {
      const result = compileContract(getInvalidContractFilePath('demo.scrypt'));

      assert.typeOf(result.errors, 'array');

      result.errors.forEach(e => {
        e.filePath = path.basename(e.filePath);
      })

      expect(result.errors).to.deep.include.members([{
        filePath: "main0.scrypt",
        message: "File not found: \"libx.scrypt\"",
        position: [
          {
            "column": 8,
            "line": 1
          },
          {
            "column": 21,
            "line": 1
          }
        ],
        type: "SemanticError",
        relatedInformation: []
      }])
    })


    it('should compile fail with ImportCycleError', () => {
      const result = compileContract(getInvalidContractFilePath('importCycleA.scrypt'));

      assert.typeOf(result.errors, 'array');

      result.errors.forEach(e => {
        e.filePath = path.basename(e.filePath);
      })

      expect(result.errors).to.deep.include.members([{
        filePath: "importCycleB.scrypt",
        message: "Cycle detected in import dependency: (\"importCycleB.scrypt\" -> \"importCycleC.scrypt\", \"importCycleC.scrypt\" -> \"importCycleA.scrypt\", \"importCycleA.scrypt\" -> \"importCycleB.scrypt\")",
        position: [
          {
            "column": 8,
            "line": 1
          },
          {
            "column": 31,
            "line": 1
          }
        ],
        type: "SemanticError",
        relatedInformation: []
      }])
    })


    it('must have at least one public function', () => {
      const result = compileContract(getInvalidContractFilePath('lib.scrypt'));

      assert.typeOf(result.errors, 'array');

      result.errors.forEach(e => {
        e.filePath = path.basename(e.filePath);
      })

      expect(result.errors).to.deep.include.members([{
        filePath: "lib.scrypt",
        message: "Contact `Lib` must have at least one public function",
        position: [
          {
            "column": 10,
            "line": 1
          },
          {
            "column": 13,
            "line": 1
          }
        ],
        type: "SemanticError",
        relatedInformation: []
      }])
    })


    it('Expecting a compile time constant', () => {
      const result = compileContract(getInvalidContractFilePath('const.scrypt'));

      assert.typeOf(result.errors, 'array');

      result.errors.forEach(e => {
        e.filePath = path.basename(e.filePath);
      })

      expect(result.errors).to.deep.include.members([{
        filePath: "const.scrypt",
        message: "Expecting a compile time constant",
        position: [
          {
            "column": 10,
            "line": 8
          },
          {
            "column": 11,
            "line": 8
          }
        ],
        type: "SemanticError",
        relatedInformation: []
      }, {
        filePath: "const.scrypt",
        message: "Expecting a compile time constant",
        position: [
          {
            "column": 5,
            "line": 12
          },
          {
            "column": 17,
            "line": 12
          }
        ],
        type: "SemanticError",
        relatedInformation: []
      }])
    })

  })


  describe('compile result with autoTypedVars', () => {

    it('autoTypedVars', () => {
      const result = compileContract(getContractFilePath('autoTyped.scrypt'));

      // let autoVars = result.autoTypedVars?.map(v => Object.assign({}, { name: v.name, type: v.type }));

      // expect(autoVars).to.deep.include.members([

      //   {
      //     name: 'Main.y',
      //     type: 'int'
      //   },
      //   {
      //     name: 'y',
      //     type: 'int'
      //   },
      //   {
      //     name: 'z',
      //     type: 'int'
      //   },
      //   {
      //     name: 'aa',
      //     type: 'int[2]'
      //   },
      //   {
      //     name: 'ss',
      //     type: 'ST1[2]'
      //   },
      //   {
      //     name: 'l',
      //     type: 'L'
      //   },
      //   {
      //     name: 'evel',
      //     type: 'int'
      //   },
      //   {
      //     name: 'ss1',
      //     type: 'ST1[2]'
      //   },
      //   {
      //     name: 'll',
      //     type: 'LL<int, ST1>'
      //   }
      // ])
    })
  })


  describe('all param type with const var should be replace with IntLiteral', () => {



    it('result.abi all param type with const var should be replace with IntLiteral', () => {
      const result = loadArtifact('const.json');
      expect(result.abi).to.deep.include.members([
        {
          "type": "function",
          "name": "unlock",
          "index": 0,
          "params": [
            {
              "name": "y",
              "type": "int[5]"
            },
            {
              "name": "x",
              "type": "int[3][5]"
            },
            {
              "name": "amounts",
              "type": "int[1]"
            }
          ]
        },
        {
          "type": "constructor",
          "params": [
            {
              "name": "memberx",
              "type": "int[1]"
            },
            {
              "name": "membery",
              "type": "int[5]"
            }
          ]
        }
      ])
    })


    it('result.abi all param type with alias should be replace with final type', () => {
      const result = loadArtifact('mdarray.json');
      expect(result.abi).to.deep.include.members([
        {
          "type": "function",
          "name": "unlock",
          "index": 0,
          "params": [
            {
              "name": "P1",
              "type": "int[2][3]"
            },
            {
              "name": "P2",
              "type": "int[2]"
            }
          ]
        },
        {
          "type": "function",
          "name": "unlockST1",
          "index": 1,
          "params": [
            {
              "name": "st1array",
              "type": "ST1[2]"
            }
          ]
        },
        {
          "type": "function",
          "name": "unlockAliasST2",
          "index": 2,
          "params": [
            {
              "name": "st1array",
              "type": "ST2[2]"
            }
          ]
        },
        {
          "type": "function",
          "name": "unlockMDArrayST1",
          "index": 3,
          "params": [
            {
              "name": "st1mdarray",
              "type": "ST1[2][2][2]"
            }
          ]
        },
        {
          "type": "constructor",
          "params": [
            {
              "name": "X",
              "type": "int[2][3][4]"
            }
          ]
        }
      ])
    })
  })


  describe('output_warnings test', () => {

    function warningsTest(warnings) {

      assert.isTrue(warnings.length === 5);
      expect(excludeMembers(warnings, ['filePath'])).to.deep.include.members([
        {
          "type": "Warning",
          "position": [
            {
              "line": 15,
              "column": 17
            },
            {
              "line": 15,
              "column": 18
            }
          ],
          "message": "Variable `y` shadows existing binding at ",
          "relatedInformation": [
            {
              "position": [
                {
                  "line": 11,
                  "column": 22
                },
                {
                  "line": 11,
                  "column": 23
                }
              ],
              "message": ""
            }
          ]
        },
        {
          "type": "Warning",
          "position": [
            {
              "line": 19,
              "column": 21
            },
            {
              "line": 19,
              "column": 22
            }
          ],
          "message": "Variable `y` shadows existing binding at ",
          "relatedInformation": [
            {
              "position": [
                {
                  "line": 15,
                  "column": 17
                },
                {
                  "line": 15,
                  "column": 18
                }
              ],
              "message": ""
            }
          ]
        },
        {
          "type": "Warning",
          "position": [
            {
              "line": 34,
              "column": 17
            },
            {
              "line": 34,
              "column": 18
            }
          ],
          "message": "Variable `i` shadows existing binding at ",
          "relatedInformation": [
            {
              "position": [
                {
                  "line": 32,
                  "column": 9
                },
                {
                  "line": 36,
                  "column": 10
                }
              ],
              "message": ""
            }
          ]
        },
        {
          "type": "Warning",
          "position": [
            {
              "line": 44,
              "column": 17
            },
            {
              "line": 44,
              "column": 18
            }
          ],
          "message": "Variable `y` shadows existing binding at ",
          "relatedInformation": [
            {
              "position": [
                {
                  "line": 41,
                  "column": 32
                },
                {
                  "line": 41,
                  "column": 33
                }
              ],
              "message": ""
            }
          ]
        },
        {
          "type": "Warning",
          "position": [
            {
              "line": 48,
              "column": 17
            },
            {
              "line": 48,
              "column": 18
            }
          ],
          "message": "Variable `y` shadows existing binding at ",
          "relatedInformation": [
            {
              "position": [
                {
                  "line": 41,
                  "column": 32
                },
                {
                  "line": 41,
                  "column": 33
                }
              ],
              "message": ""
            }
          ]
        }
      ])

    }

    it('warnings should be right', () => {

      const result = compileContract(getContractFilePath('varshadow.scrypt'));

      warningsTest(result.warnings);
    })

    it('warnings and errors should be right', () => {

      const result = compileContract(getInvalidContractFilePath('varshadow.scrypt'));
      warningsTest(result.warnings);


      expect(excludeMembers(result.errors, ['filePath'])).to.deep.include.members([
        {
          type: 'SemanticError',
          position: [
            {
              "column": 17,
              "line": 13
            },
            {
              "column": 22,
              "line": 13
            }
          ],
          message: "Couldn't match expected type 'int' with actual type 'bytes'",
          relatedInformation: []
        }
      ])
    })

    it('No relatedInformation when relatedInformation in std contract', () => {

      const result = compileContract(getInvalidContractFilePath('relatedInformation.scrypt'));

      expect(excludeMembers(result.errors, ['filePath'])).to.deep.include.members([
        {
          "type": "SemanticError",
          "position": [
            {
              "line": 1,
              "column": 10
            },
            {
              "line": 1,
              "column": 25
            }
          ],
          "message": "Symbol `SigHashPreimage` already defined at null:1:1:1:1",
          "relatedInformation": [
          ]
        }
      ])

    })

    it('warnings and errors should be right', () => {

      const result = compileContract(getInvalidContractFilePath('varshadow1.scrypt'));

      expect(excludeMembers(result.warnings, ['filePath'])).to.deep.include.members([
        {
          "type": "Warning",
          "position": [
            {
              "line": 5,
              "column": 17
            },
            {
              "line": 5,
              "column": 18
            }
          ],
          "message": "Variable `x` shadows existing binding at ",
          "relatedInformation": [
            {
              "position": [
                {
                  "line": 2,
                  "column": 30
                },
                {
                  "line": 2,
                  "column": 31
                }
              ],
              "message": ""
            }
          ]
        }
      ])
      expect(excludeMembers(result.errors, ['filePath'])).to.deep.include.members([
        {
          "type": "SemanticError",
          "position": [
            {
              "line": 3,
              "column": 13
            },
            {
              "line": 3,
              "column": 14
            }
          ],
          "message": "Symbol `x` already defined at ",
          "relatedInformation": [
            {
              "position": [
                {
                  "line": 2,
                  "column": 30
                },
                {
                  "line": 2,
                  "column": 31
                }
              ],
              "message": ""
            }
          ]
        },
        {
          "type": "SemanticError",
          "position": [
            {
              "line": 7,
              "column": 13
            },
            {
              "line": 7,
              "column": 14
            }
          ],
          "message": "Symbol `x` already defined at ",
          "relatedInformation": [
            {
              "position": [
                {
                  "line": 2,
                  "column": 30
                },
                {
                  "line": 2,
                  "column": 31
                }
              ],
              "message": ""
            }
          ]
        }
      ])
    })

  })


  it('issue310.scrypt should be compile success', () => {

    const result = compileContract(getInvalidContractFilePath('issue310.scrypt'));
    assert.isTrue(result.errors.length === 0, "issue310.scrypt should be compile success")
  })



  it('Expecting bigint const toString right ', () => {
    const result = compileContract(getContractFilePath('const.scrypt'));
    const contracts: any = result.ast?.contracts;
    expect(contracts[0].statics[1].expr.value.toString(10)).to.equal('2988348162058574136915891421498819466320163312926952423791023078876139')
    expect(contracts[1].statics[7].expr.value.toString(10)).to.equal('2988348162058574136915891421498819466320163312926952423791023078876139')
  })


  it('check foo ast', () => {
    const result = compileContract(getContractFilePath('foo.scrypt'));
    excludeMembers(result.ast, ['source']);
    //writeFileSync(join(__dirname, './fixture/ast/foo.ast.json'), JSON.stringify(result.ast, null, 4));
    const content = readFileSync(join(__dirname, './fixture/ast/foo.ast.json')).toString();
    expect(JSON.parse(JSON.stringify(result.ast))).to.deep.equal(JSON.parse(content));
  })

  it('IDE stop working properly if got very big number in contract, issue #sCrypt-Inc/ide 367', () => {
    const result = compileContract(getContractFilePath('ast0.scrypt'));
    excludeMembers(result.ast, ['source']);
    writeFileSync(join(__dirname, './fixture/ast/ast0.ast.json'), JSON.stringify(result.ast, null, 4));
    const content = readFileSync(join(__dirname, './fixture/ast/ast0.ast.json')).toString();
    expect(JSON.parse(JSON.stringify(result.ast))).to.deep.equal(JSON.parse(content));
  })


  it('test_ctc_as_parameter_sub', () => {
    const result = compileContract(getContractFilePath('ctc.scrypt'));
    expect(result.abi).to.deep.equal([
      {
        "type": "function",
        "name": "unlock",
        "index": 0,
        "params": [
          {
            "name": "st1",
            "type": "St1"
          },
          {
            "name": "st2",
            "type": "St2"
          },
          {
            "name": "a",
            "type": "St1[2]"
          },
          {
            "name": "b",
            "type": "St1[3][2]"
          },
          {
            "name": "c",
            "type": "int[3]"
          }
        ]
      },
      {
        "type": "constructor",
        "params": [
          {
            "name": "st1",
            "type": "St1"
          },
          {
            "name": "st2",
            "type": "St2"
          },
          {
            "name": "a",
            "type": "St1[2]"
          },
          {
            "name": "b",
            "type": "St1[3][2]"
          },
          {
            "name": "c",
            "type": "int[3]"
          }
        ]
      }
    ]);

    expect(result.structs).to.deep.equal([
      {
        "name": "St1",
        "params": [
          {
            "name": "x",
            "type": "int[3]"
          }
        ],
        "genericTypes": []
      },
      {
        "name": "St2",
        "params": [
          {
            "name": "st1s",
            "type": "St1[2]"
          }
        ],
        "genericTypes": []
      }
    ])

    expect(result.alias).to.deep.equal([
      {
        "name": "St1Array",
        "type": "St1[2]"
      }
    ])



    const CTCContract = buildContractClass(result);

    let st1 = { x: [1n, 3n, 45n] };

    let st2 = { st1s: [st1, st1] };

    const ctc = new CTCContract(st1, st2, [st1, st1], [[st1, st1], [st1, st1], [st1, st1]], [1n, 3n, 3n]);

    let verify_result = ctc.unlock(st1, st2, [st1, st1], [[st1, st1], [st1, st1], [st1, st1]], [1n, 3n, 3n]).verify()

    assert.isTrue(verify_result.success, "unlock CTCContract failed")
  })

  describe('test compileContract hex', () => {
    it('compile successfully', () => {
      const result = compileContract(getContractFilePath('p2pkh.scrypt'));

      expect(result.hex).to.be.equal('00<pubKeyHash>610079527a75517a75615179a95179876952795279ac777777')
    })
  })


  describe('test compileContractAsync hex', () => {
    it('compileContractAsync successfully', async () => {
      const result = await compileContractAsync(getContractFilePath('p2pkh.scrypt'));
      expect(result.hex).to.be.equal('00<pubKeyHash>610079527a75517a75615179a95179876952795279ac777777')
    })

    it('compileContractAsync tokenSwap successfully', async () => {
      const result = await compileContractAsync(getContractFilePath('tokenSwap.scrypt'));
      expect(result.errors.length === 0).to.be.true;
    })

    it('compileContractAsync invalid lib.scrypt', async () => {
      const result = await compileContractAsync(getInvalidContractFilePath('lib.scrypt'));

      assert.typeOf(result.errors, 'array');

      result.errors.forEach(e => {
        e.filePath = path.basename(e.filePath);
      })

      expect(result.errors).to.deep.include.members([{
        filePath: "lib.scrypt",
        message: "Contact `Lib` must have at least one public function",
        position: [
          {
            "column": 10,
            "line": 1
          },
          {
            "column": 13,
            "line": 1
          }
        ],
        type: "SemanticError",
        relatedInformation: []
      }])
    })

  })


  describe('test statics', () => {
    it('compile successfully', () => {
      const result = compileContract(getContractFilePath('p2pkh.scrypt'));

      expect(result.statics).to.deep.equal([])
      const result1 = compileContract(getContractFilePath('const.scrypt'));

      expect(result1.statics).to.deep.equal([
        { const: true, name: 'Util.DATALEN', type: 'int', value: "5" },
        {
          const: true,
          name: 'Util.BIGINT',
          type: 'int',
          value: '2988348162058574136915891421498819466320163312926952423791023078876139'
        },
        {
          const: true,
          name: 'ConstTest.aaa',
          type: 'bool',
          value: undefined
        },
        {
          const: true,
          name: 'ConstTest.bb',
          type: 'bytes',
          value: "b'aaaa'"
        },
        { const: true, name: 'ConstTest.N', type: 'int', value: "3" },
        { const: true, name: 'ConstTest.UU', type: 'int', value: "5" },
        { const: true, name: 'ConstTest.C', type: 'int', value: undefined },
        {
          const: true,
          name: 'ConstTest.amount',
          type: 'int',
          value: "1"
        },
        {
          const: true,
          name: 'ConstTest.p',
          type: 'PubKey',
          value: "b'aaaa'"
        },
        {
          const: true,
          name: 'ConstTest.BIGINT',
          type: 'int',
          value: "2988348162058574136915891421498819466320163312926952423791023078876139"
        }
      ])
    })
  })


  it('compile with stdout successfully', () => {

    const result = compile(
      { path: getContractFilePath('p2pkh.scrypt') },
      {
        artifact: false,
        asm: true,
        ast: true,
        debug: false,
        hex: true,
        stdout: true,
        cmdPrefix: findCompiler()
      }
    );

    const privateKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet);
    const publicKey = privateKey.publicKey;
    const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());
    const inputSatoshis = 100000;
    const tx = newTx(inputSatoshis);

    const DemoP2PKH = buildContractClass(result);

    const p2pkh = new DemoP2PKH(Ripemd160(toHex(pubKeyHash)));
    const sig = signTx(tx, privateKey, p2pkh.lockingScript, inputSatoshis);
    const pubkey = PubKey(toHex(publicKey));
    p2pkh.txContext = { inputSatoshis, tx, inputIndex: 0 };
    const verifyresult = p2pkh.unlock(Sig(sig), pubkey).verify();
    expect(verifyresult.success, verifyresult.error).to.true
  })


  it('compile erc20.scrypt with stdout successfully', () => {

    const result = compile(
      { path: getContractFilePath('erc20.scrypt') },
      {
        artifact: false,
        asm: true,
        ast: true,
        debug: false,
        hex: true,
        stdout: true,
        cmdPrefix: findCompiler()
      }
    );

    expect(result.errors.length === 0).to.true
  })


  it('compile issue146.scrypt with stdout successfully', () => {

    const result = compile(
      { path: getContractFilePath('issue146.scrypt') },
      {
        artifact: false,
        asm: true,
        ast: true,
        debug: false,
        hex: true,
        stdout: true,
        cmdPrefix: findCompiler()
      }
    );

    expect(result.errors.length === 0).to.true
    expect(result.warnings.length === 1).to.true
  })



  it('cmdPrefix with space', () => {

    const dir = mkdtempSync(path.join(os.tmpdir(), 'scrypt space'))

    if (os.platform() === 'win32') {
      copyFileSync(findCompiler() as string, path.join(dir, "scryptc.exe"));
    } else {
      copyFileSync(findCompiler() as string, path.join(dir, "scryptc"));
    }

    const result = compile(
      { path: getContractFilePath('issue146.scrypt') },
      {
        artifact: false,
        asm: true,
        ast: true,
        debug: false,
        hex: true,
        stdout: true,
        cmdPrefix: path.join(dir, "scryptc")
      }
    );

    expect(result.errors.length === 0).to.true
    expect(result.warnings.length === 1).to.true



    const versionStr = compilerVersion(path.join(dir, "scryptc")) as string;

    console.log(versionStr)
    expect(typeof versionStr === 'string').to.be.true
    expect(versionStr.includes("+commit")).to.be.true

  })

})