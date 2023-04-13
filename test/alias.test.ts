import { getContractFilePath, loadArtifact, newTx } from './helper';
import { assert, expect } from 'chai';
import { buildContractClass, buildTypeResolver } from '../src/contract';
import { Bytes, Int, PubKey, PubKeyHash, Sig, SymbolType } from '../src/scryptTypes';
import { compileContract, signTx, bsv } from '../src/utils';
import { toHex } from '../src';




describe('Alias type check', () => {
  const AliasContract = buildContractClass(loadArtifact('alias.json'));


  let man = {
    name: "68656c6c6f20776f726c6421",
    age: 33n,
    token: 101n
  };

  const alias = new AliasContract({
    name: Bytes("68656c6c6f20776f726c6421"),
    age: 1n,
    token: 101n
  });

  it('should succeeding when using MaleAAA', () => {

    let result = alias.unlock({
      name: Bytes("68656c6c6f20776f726c6421"),
      age: Int(33),
      token: 101n
    }).verify()
    assert.isTrue(result.success, result.error);

  })

  it('should succeeding when using bytes', () => {

    let result = alias.unlock({
      name: Bytes("68656c6c6f20776f726c6421"),
      age: Int(33),
      token: Int(101)
    }).verify()
    assert.isTrue(result.success, result.error);

  })

  it('should succeeding when using Male', () => {

    let result = alias.unlock({
      name: "68656c6c6f20776f726c6421",
      age: 33n,
      token: 101n
    }).verify()
    assert.isTrue(result.success, result.error);

  })


  it('should succeeding when using Person', () => {

    let result = alias.unlock({
      name: "68656c6c6f20776f726c6421",
      age: 33n,
      token: 101n
    }).verify()
    assert.isTrue(result.success, result.error);
  })

  it('should succeeding when using Female', () => {
    let result = alias.unlock({
      name: "68656c6c6f20776f726c6421",
      age: 33n,
      token: 101n
    }).verify()
    assert.isTrue(result.success, result.error);
  })


  it('should throw when using Block', () => {
    expect(() => {
      alias.unlock({
        height: 1n,
        time: 333n,
        coinbase: Bytes("68656c6c6f20776f726c6421")
      })
    }).to.throw('The type of bob is wrong, expected Person but missing member [age]');
  })

  it('should throw when using wrong type', () => {
    expect(() => {
      alias.unlock([3n, 3n])
    }).to.throw('The type of bob is wrong, expected Person but got a array');

    expect(() => {
      alias.unlock(3n)
    }).to.throw('The type of bob is wrong, expected Person but got a bigint');
  })

  it('should succeeding when using Female', () => {
    let result = alias.unlock({
      name: Bytes("68656c6c6f20776f726c6421"),
      age: Int(33),
      token: Int(101)
    }).verify()
    assert.isTrue(result.success, result.error);
  })



  it('should succeeding when using number', () => {
    let result = alias.setToken([10n, 3n, 3n]).verify()
    assert.isTrue(result.success, result.error);
  })

  it('should succeeding when using all int alias', () => {
    let result = alias.setToken([10n, 3n, 3n]).verify()
    assert.isTrue(result.success, result.error);
  })


  it('should succeeding when parameter is array struct have member with alias', () => {
    let result = alias.isPerson([{
      name: Bytes("68656c6c6f20776f726c6421"),
      age: Int(1),
      token: Int(101)
    }]).verify()
    assert.isTrue(result.success, result.error);
  })


  describe('buildTypeResolver', () => {


    it('should succeeding when call buildTypeResolver', () => {
      const jsonArtifact = loadArtifact('alias.json');
      const resolver = buildTypeResolver(jsonArtifact.contract, jsonArtifact.alias, jsonArtifact.structs, jsonArtifact.library)
      expect(resolver("Age")).deep.equal({
        finalType: 'int',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("Time")).deep.equal({
        finalType: 'int',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("Name")).deep.equal({
        finalType: 'bytes',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("Token")).deep.equal({
        finalType: 'int',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("Tokens")).deep.equal({
        finalType: 'int[3]',
        generic: false,
        info: undefined,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("MaleAAA")).deep.equal({
        finalType: 'Person',
        generic: false,
        info: {
          genericTypes: [],
          name: "Person",
          params: [
            {
              name: "age",
              type: "int"
            },
            {
              name: "name",
              type: "bytes"
            },
            {
              name: "token",
              type: "int"
            }
          ]
        },
        symbolType: SymbolType.Struct
      })
      expect(resolver("Male")).deep.equal({
        finalType: 'Person',
        generic: false,
        info: {
          genericTypes: [],
          name: "Person",
          params: [
            {
              name: "age",
              type: "int"
            },
            {
              name: "name",
              type: "bytes"
            },
            {
              name: "token",
              type: "int"
            }
          ]
        },
        symbolType: SymbolType.Struct
      })
      expect(resolver("Female")).deep.equal({
        finalType: 'Person',
        generic: false,
        info: {
          genericTypes: [],
          name: "Person",
          params: [
            {
              name: "age",
              type: "int"
            },
            {
              name: "name",
              type: "bytes"
            },
            {
              name: "token",
              type: "int"
            }
          ]
        },
        symbolType: SymbolType.Struct
      })
      expect(resolver("Block")).deep.equal({
        finalType: 'Block',
        generic: false,
        info: {
          genericTypes: [],
          name: "Block",
          params: [
            {
              name: "height",
              type: "int"
            },
            {
              name: "time",
              type: "int"
            },
            {
              name: "coinbase",
              type: "bytes"
            }
          ]
        },
        symbolType: SymbolType.Struct
      })
      expect(resolver("Coinbase")).deep.equal({
        finalType: 'bytes',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("Integer")).deep.equal({
        finalType: 'int',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("Height")).deep.equal({
        finalType: 'int',
        generic: false,
        symbolType: SymbolType.ScryptType
      })

      expect(resolver("Person[3]")).deep.equal({
        "info": {
          "name": "Person",
          "params": [
            {
              "name": "age",
              "type": "int"
            },
            {
              "name": "name",
              "type": "bytes"
            },
            {
              "name": "token",
              "type": "int"
            }
          ],
          "genericTypes": []
        },
        generic: false,
        "finalType": "Person[3]",
        "symbolType": SymbolType.Struct
      })

      expect(resolver("MaleAAA[3]")).deep.equal({
        "info": {
          "name": "Person",
          "params": [
            {
              "name": "age",
              "type": "int"
            },
            {
              "name": "name",
              "type": "bytes"
            },
            {
              "name": "token",
              "type": "int"
            }
          ],
          "genericTypes": []
        },
        generic: false,
        "finalType": "Person[3]",
        "symbolType": "Struct"
      })
      expect(resolver("MaleB[1]")).deep.equal({
        finalType: 'Person[1][3]',
        "info": {
          "name": "Person",
          "params": [
            {
              "name": "age",
              "type": "int"
            },
            {
              "name": "name",
              "type": "bytes"
            },
            {
              "name": "token",
              "type": "int"
            }
          ],
          "genericTypes": []
        },
        generic: false,
        symbolType: SymbolType.Struct
      })
      expect(resolver("MaleC[5]")).deep.equal({
        finalType: 'Person[5][2][3]',
        "info": {
          "name": "Person",
          "params": [
            {
              "name": "age",
              "type": "int"
            },
            {
              "name": "name",
              "type": "bytes"
            },
            {
              "name": "token",
              "type": "int"
            }
          ],
          "genericTypes": []
        },
        generic: false,
        symbolType: SymbolType.Struct
      })


      expect(resolver("int")).deep.equal({
        finalType: 'int',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("PubKey")).deep.equal({
        finalType: 'PubKey',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("PrivKey")).deep.equal({
        finalType: 'PrivKey',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("SigHashPreimage")).deep.equal({
        finalType: 'SigHashPreimage',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("bool")).deep.equal({
        finalType: 'bool',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("bytes")).deep.equal({
        finalType: 'bytes',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("Sig")).deep.equal({
        finalType: 'Sig',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("Ripemd160")).deep.equal({
        finalType: 'Ripemd160',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("PubKeyHash")).deep.equal({
        finalType: 'Ripemd160',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("Sha1")).deep.equal({
        finalType: 'Sha1',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("Sha256")).deep.equal({
        finalType: 'Sha256',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("SigHashType")).deep.equal({
        finalType: 'SigHashType',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("OpCodeType")).deep.equal({
        finalType: 'OpCodeType',
        generic: false,
        symbolType: SymbolType.ScryptType
      })

    })

    it('should succeeding when resolver generic type', () => {
      const jsonArtifact = loadArtifact('autoTyped.json');

      const resolver = buildTypeResolver(jsonArtifact.contract, jsonArtifact.alias, jsonArtifact.structs, jsonArtifact.library)

      expect(resolver("LL<int,ST1>")).deep.equal({
        "info": {
          "name": "LL",
          "params": [
            {
              "name": "x",
              "type": "T"
            },
            {
              "name": "y",
              "type": "K"
            }
          ],
          "properties": [
            {
              "name": "x",
              "type": "T"
            },
            {
              "name": "y",
              "type": "K"
            }
          ],
          "genericTypes": [
            "T",
            "K"
          ]
        },
        "generic": true,
        "finalType": "LL<int,ST1>",
        "symbolType": "Library"
      })

      expect(resolver("LL<bool[2], ST1>")).deep.equal({
        "info": {
          "name": "LL",
          "params": [
            {
              "name": "x",
              "type": "T"
            },
            {
              "name": "y",
              "type": "K"
            }
          ],
          "properties": [
            {
              "name": "x",
              "type": "T"
            },
            {
              "name": "y",
              "type": "K"
            }
          ],
          "genericTypes": [
            "T",
            "K"
          ]
        },
        "generic": true,
        "finalType": "LL<bool[2],ST1>",
        "symbolType": "Library"
      })

    })

    it('should succeeding when call buildTypeResolver', () => {

      const resolver = buildTypeResolver('', [], [], [], [], [])

      expect(resolver("int")).deep.equal({
        finalType: 'int',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("PubKey")).deep.equal({
        finalType: 'PubKey',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("PrivKey")).deep.equal({
        finalType: 'PrivKey',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("SigHashPreimage")).deep.equal({
        finalType: 'SigHashPreimage',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("bool")).deep.equal({
        finalType: 'bool',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("bytes")).deep.equal({
        finalType: 'bytes',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("Sig")).deep.equal({
        finalType: 'Sig',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("Ripemd160")).deep.equal({
        finalType: 'Ripemd160',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("PubKeyHash")).deep.equal({
        finalType: 'Ripemd160',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("Sha1")).deep.equal({
        finalType: 'Sha1',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("Sha256")).deep.equal({
        finalType: 'Sha256',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("SigHashType")).deep.equal({
        finalType: 'SigHashType',
        generic: false,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("OpCodeType")).deep.equal({
        finalType: 'OpCodeType',
        generic: false,
        symbolType: SymbolType.ScryptType
      })

    })
  })

  describe('Alias1Contract check', () => {

    const Alias1Contract = buildContractClass(loadArtifact('alias1.json'));


    it('should succeeding when call buildTypeResolver', () => {
      const jsonArtifact = loadArtifact('alias1.json');
      const resolver = buildTypeResolver(jsonArtifact.contract, jsonArtifact.alias, jsonArtifact.structs, jsonArtifact.library)
      expect(resolver("Tokens")).deep.equal({
        finalType: 'int[3]',
        generic: false,
        info: undefined,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("TokenArray")).deep.equal({
        finalType: 'int[1][3]',
        generic: false,
        info: undefined,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("TokenAA")).deep.equal({
        finalType: 'int[4][5][1][3]',
        generic: false,
        info: undefined,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("Tokens[1]")).deep.equal({
        finalType: 'int[1][3]',
        generic: false,
        info: undefined,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("TokenArray[4][5]")).deep.equal({
        finalType: 'int[4][5][1][3]',
        generic: false,
        info: undefined,
        symbolType: SymbolType.ScryptType
      })

    })

    const alias = new Alias1Contract([1n, Int(3), 3n], [[2n, 1n, 3n]]);

    it('should succeeding when unlock', () => {

      let result = alias.unlock([1n, 3n, 3n], [[2n, 1n, 3n]]).verify()
      assert.isTrue(result.success, result.error);
    })
  })


  describe('VarAsSub check', () => {


    it('should succeeding when call buildTypeResolver', () => {
      const result = compileContract(getContractFilePath('varassub.scrypt'));
      const resolver = buildTypeResolver(result.contract || '', result.alias || [], result.structs || [], result.library || [], result.contracts, result.statics)
      expect(resolver("int[1][SUB]")).deep.equal({
        finalType: 'int[1][3]',
        generic: false,
        info: undefined,
        symbolType: SymbolType.ScryptType
      })
      expect(resolver("int[1][VarAsSub.SUB]")).deep.equal({
        finalType: 'int[1][3]',
        generic: false,
        info: undefined,
        symbolType: SymbolType.ScryptType
      })

    })

  })


  describe('test pubKeyHash', () => {


    it('should succeeding when unlock by pubKeyHash ', () => {

      const privateKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet);
      const publicKey = privateKey.publicKey;
      const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());

      const inputSatoshis = 100000;
      const tx = newTx(inputSatoshis);

      const jsonArtifact = loadArtifact('p2pkh.json');
      const DemoP2PKH = buildContractClass(jsonArtifact);
      const p2pkh = new DemoP2PKH(PubKeyHash(toHex(pubKeyHash)));

      p2pkh.txContext = {
        tx,
        inputIndex: 0,
        inputSatoshis: inputSatoshis
      }

      const sig = Sig(signTx(tx, privateKey, p2pkh.lockingScript, inputSatoshis));
      const pubkey = PubKey(toHex(publicKey));

      let result = p2pkh.unlock(sig, pubkey).verify({ inputSatoshis, tx })

      expect(result.success).to.be.true;


    })

  })


  describe('test resolver_generic', () => {
    const C = buildContractClass(loadArtifact('genericsst_alias.json'));

    it('should succeeding when resolver type', () => {

      expect(C.resolver("ST0")).deep.equal({
        finalType: 'ST0',
        generic: true,
        info: {
          genericTypes: ["T"],
          name: "ST0",
          params: [
            {
              name: "x",
              type: "int"
            },
            {
              name: "y",
              type: "T"
            }
          ]
        },
        symbolType: SymbolType.Struct
      })

      expect(C.resolver("ST2")).deep.equal({
        finalType: 'ST2',
        generic: false,
        info: {
          genericTypes: [],
          name: "ST2",
          params: [
            {
              name: "x",
              type: "int"
            }
          ]
        },
        symbolType: SymbolType.Struct
      })


      expect(C.resolver("ST1<ST2[2]>")).deep.equal({
        "info": {
          "name": "ST1",
          "params": [
            {
              "name": "x",
              "type": "T"
            }
          ],
          "genericTypes": [
            "T"
          ]
        },
        "generic": true,
        "finalType": "ST1<ST2[2]>",
        "symbolType": "Struct"
      })

      expect(C.resolver("ST1<ST0<int>>")).deep.equal({
        "info": {
          "name": "ST1",
          "params": [
            {
              "name": "x",
              "type": "T"
            }
          ],
          "genericTypes": [
            "T"
          ]
        },
        "generic": true,
        "finalType": "ST1<ST0<int>>",
        "symbolType": "Struct"
      })


      expect(C.resolver("ST1<ST0<int[3]>[3][1]>")).deep.equal({
        "info": {
          "name": "ST1",
          "params": [
            {
              "name": "x",
              "type": "T"
            }
          ],
          "genericTypes": [
            "T"
          ]
        },
        "generic": true,
        "finalType": "ST1<ST0<int[3]>[3][1]>",
        "symbolType": "Struct"
      })

      expect(C.resolver("ST0A")).deep.equal({
        "info": {
          "name": "ST0",
          "params": [
            {
              "name": "x",
              "type": "int"
            },
            {
              "name": "y",
              "type": "T"
            }
          ],
          "genericTypes": [
            "T"
          ]
        },
        "generic": true,
        "finalType": "ST0<int>",
        "symbolType": "Struct"
      })

      expect(C.resolver("ST0AA")).deep.equal({
        "info": {
          "name": "ST0",
          "params": [
            {
              "name": "x",
              "type": "int"
            },
            {
              "name": "y",
              "type": "T"
            }
          ],
          "genericTypes": [
            "T"
          ]
        },
        "generic": true,
        "finalType": "ST0<ST0<int>>",
        "symbolType": "Struct"
      })


      expect(C.resolver("INTA")).deep.equal({
        finalType: 'int[3]',
        generic: false,
        info: undefined,
        symbolType: SymbolType.ScryptType
      })


      expect(C.resolver("ST1A")).deep.equal({
        "info": {
          "name": "ST1",
          "params": [
            {
              "name": "x",
              "type": "T"
            }
          ],
          "genericTypes": [
            "T"
          ]
        },
        "generic": true,
        "finalType": "ST1<int[3]>",
        "symbolType": "Struct"
      })

      expect(C.resolver("ST3A")).deep.equal({
        "info": {
          "name": "ST3",
          "params": [
            {
              "name": "x",
              "type": "T"
            },
            {
              "name": "y",
              "type": "K"
            }
          ],
          "genericTypes": [
            "T",
            "K"
          ]
        },
        "generic": true,
        "finalType": "ST3<ST1<int[3]>,ST0<ST0<int>>>",
        "symbolType": "Struct"
      })

    })

  })


})
