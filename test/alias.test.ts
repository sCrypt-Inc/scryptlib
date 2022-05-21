import { getContractFilePath, loadDescription, newTx } from './helper';
import { assert, expect } from 'chai';
import { buildContractClass, buildTypeClasses, buildTypeResolver } from '../src/contract';
import { Bytes, Int, PubKeyHash, PubKey, SymbolType } from '../src/scryptTypes';
import { compileContract, toHex, signTx, bsv } from '../src/utils';




describe('Alias type check', () => {
  const AliasContract = buildContractClass(loadDescription('alias_desc.json'));

  const { Male, MaleAAA, Female, Name, Age, Token, Person, Block, Height, Time, Coinbase } = buildTypeClasses(loadDescription('alias_desc.json'));

  let man = new Person({
    name: new Name("68656c6c6f20776f726c6421"),
    age: new Age(33),
    token: new Token(101)
  });

  const alias = new AliasContract(new Female({
    name: new Name("68656c6c6f20776f726c6421"),
    age: new Age(1),
    token: new Token(101)
  }));

  it('should succeeding when using MaleAAA', () => {

    let result = alias.unlock(new MaleAAA({
      name: new Name("68656c6c6f20776f726c6421"),
      age: new Age(33),
      token: new Token(101)
    })).verify()
    assert.isTrue(result.success, result.error);

  })

  it('should succeeding when using bytes', () => {

    let result = alias.unlock(new MaleAAA({
      name: new Bytes("68656c6c6f20776f726c6421"),
      age: new Int(33),
      token: new Int(101)
    })).verify()
    assert.isTrue(result.success, result.error);

  })

  it('should succeeding when using Male', () => {

    let result = alias.unlock(new Male({
      name: new Name("68656c6c6f20776f726c6421"),
      age: new Age(33),
      token: new Token(101)
    })).verify()
    assert.isTrue(result.success, result.error);

  })


  it('should succeeding when using Person', () => {

    let result = alias.unlock(new Person({
      name: new Name("68656c6c6f20776f726c6421"),
      age: 33,
      token: new Token(101)
    })).verify()
    assert.isTrue(result.success, result.error);
  })

  it('should succeeding when using Female', () => {
    let result = alias.unlock(new Female({
      name: new Name("68656c6c6f20776f726c6421"),
      age: new Age(33),
      token: new Token(101)
    })).verify()
    assert.isTrue(result.success, result.error);
  })


  it('should throw when using Block', () => {
    expect(() => {
      alias.unlock(new Block({
        height: new Height(1),
        time: new Time(333),
        coinbase: new Coinbase("68656c6c6f20776f726c6421")
      }))
    }).to.throw('The type of bob is wrong, expected Person but got Block');
  })

  it('should succeeding when using Female', () => {
    let result = alias.unlock(new Male({
      name: new Coinbase("68656c6c6f20776f726c6421"),
      age: new Time(33),
      token: new Age(101)
    })).verify()
    assert.isTrue(result.success, result.error);
  })



  it('should succeeding when using number', () => {
    let result = alias.setToken([10, 3, 3]).verify()
    assert.isTrue(result.success, result.error);
  })

  it('should succeeding when using all int alias', () => {
    let result = alias.setToken([new Time(10), new Age(3), new Token(3)]).verify()
    assert.isTrue(result.success, result.error);
  })


  it('should succeeding when parameter is array struct have member with alias', () => {
    let result = alias.isPerson([new Female({
      name: new Name("68656c6c6f20776f726c6421"),
      age: new Age(1),
      token: new Token(101)
    })]).verify()
    assert.isTrue(result.success, result.error);
  })


  describe('buildTypeResolver', () => {


    it('should succeeding when call buildTypeResolver', () => {
      const jsondesc = loadDescription('alias_desc.json');
      const resolver = buildTypeResolver(jsondesc.contract, jsondesc.alias, jsondesc.structs, jsondesc.library, [])
      expect(resolver("Age")).deep.equal({
        finalType: 'int',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("Time")).deep.equal({
        finalType: 'int',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("Name")).deep.equal({
        finalType: 'bytes',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("Token")).deep.equal({
        finalType: 'int',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("Tokens")).deep.equal({
        finalType: 'int[3]',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("MaleAAA")).deep.equal({
        finalType: 'Person',
        symbolType: SymbolType.Struct
      })
      expect(resolver("Male")).deep.equal({
        finalType: 'Person',
        symbolType: SymbolType.Struct
      })
      expect(resolver("Female")).deep.equal({
        finalType: 'Person',
        symbolType: SymbolType.Struct
      })
      expect(resolver("Block")).deep.equal({
        finalType: 'Block',
        symbolType: SymbolType.Struct
      })
      expect(resolver("Coinbase")).deep.equal({
        finalType: 'bytes',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("Integer")).deep.equal({
        finalType: 'int',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("Height")).deep.equal({
        finalType: 'int',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("Person[3]")).deep.equal({
        finalType: 'Person[3]',
        symbolType: SymbolType.Struct
      })
      expect(resolver("MaleAAA[3]")).deep.equal({
        finalType: 'Person[3]',
        symbolType: SymbolType.Struct
      })
      expect(resolver("MaleB[1]")).deep.equal({
        finalType: 'Person[1][3]',
        symbolType: SymbolType.Struct
      })
      expect(resolver("MaleC[5]")).deep.equal({
        finalType: 'Person[5][2][3]',
        symbolType: SymbolType.Struct
      })


      expect(resolver("int")).deep.equal({
        finalType: 'int',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("PubKey")).deep.equal({
        finalType: 'PubKey',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("PrivKey")).deep.equal({
        finalType: 'PrivKey',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("SigHashPreimage")).deep.equal({
        finalType: 'SigHashPreimage',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("bool")).deep.equal({
        finalType: 'bool',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("bytes")).deep.equal({
        finalType: 'bytes',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("Sig")).deep.equal({
        finalType: 'Sig',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("Ripemd160")).deep.equal({
        finalType: 'Ripemd160',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("PubKeyHash")).deep.equal({
        finalType: 'Ripemd160',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("Sha1")).deep.equal({
        finalType: 'Sha1',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("Sha256")).deep.equal({
        finalType: 'Sha256',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("SigHashType")).deep.equal({
        finalType: 'SigHashType',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("OpCodeType")).deep.equal({
        finalType: 'OpCodeType',
        symbolType: SymbolType.BaseType
      })

    })

    it('should succeeding when resolver generic type', () => {
      const jsondesc = loadDescription('autoTyped_desc.json');

      const resolver = buildTypeResolver(jsondesc.contract, jsondesc.alias, jsondesc.structs, jsondesc.library, [])

      expect(resolver("LL<int,ST1>")).deep.equal({
        finalType: 'LL<int,ST1>',
        symbolType: SymbolType.Library
      })
      expect(resolver("LL<bool[2], ST1>")).deep.equal({
        finalType: 'LL<bool[2],ST1>',
        symbolType: SymbolType.Library
      })

    })

    it('should succeeding when call buildTypeResolver', () => {

      const resolver = buildTypeResolver('', [], [], [], [])

      expect(resolver("int")).deep.equal({
        finalType: 'int',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("PubKey")).deep.equal({
        finalType: 'PubKey',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("PrivKey")).deep.equal({
        finalType: 'PrivKey',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("SigHashPreimage")).deep.equal({
        finalType: 'SigHashPreimage',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("bool")).deep.equal({
        finalType: 'bool',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("bytes")).deep.equal({
        finalType: 'bytes',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("Sig")).deep.equal({
        finalType: 'Sig',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("Ripemd160")).deep.equal({
        finalType: 'Ripemd160',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("PubKeyHash")).deep.equal({
        finalType: 'Ripemd160',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("Sha1")).deep.equal({
        finalType: 'Sha1',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("Sha256")).deep.equal({
        finalType: 'Sha256',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("SigHashType")).deep.equal({
        finalType: 'SigHashType',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("OpCodeType")).deep.equal({
        finalType: 'OpCodeType',
        symbolType: SymbolType.BaseType
      })

    })
  })

  describe('Alias1Contract check', () => {

    const Alias1Contract = buildContractClass(loadDescription('alias1_desc.json'));

    const { Tokens, TokenArray, Token } = buildTypeClasses(loadDescription('alias1_desc.json'));


    it('should succeeding when call buildTypeResolver', () => {
      const jsondesc = loadDescription('alias1_desc.json');
      const resolver = buildTypeResolver(jsondesc.contract, jsondesc.alias, jsondesc.structs, jsondesc.library, [])
      expect(resolver("Tokens")).deep.equal({
        finalType: 'int[3]',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("TokenArray")).deep.equal({
        finalType: 'int[1][3]',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("TokenAA")).deep.equal({
        finalType: 'int[4][5][1][3]',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("Tokens[1]")).deep.equal({
        finalType: 'int[1][3]',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("TokenArray[4][5]")).deep.equal({
        finalType: 'int[4][5][1][3]',
        symbolType: SymbolType.BaseType
      })

    })

    const alias = new Alias1Contract([1, 3, 3], [[2, 1, 3]]);

    it('should succeeding when unlock', () => {

      let result = alias.unlock([1, 3, 3], [[2, 1, 3]]).verify()
      assert.isTrue(result.success, result.error);
    })
  })


  describe('VarAsSub check', () => {

    const result = compileContract(getContractFilePath('varassub.scrypt'));
    it('should succeeding when call buildTypeResolver', () => {

      const resolver = buildTypeResolver(result.contract, result.alias, result.structs, result.library, result.statics)
      expect(resolver("int[1][SUB]")).deep.equal({
        finalType: 'int[1][3]',
        symbolType: SymbolType.BaseType
      })
      expect(resolver("int[1][VarAsSub.SUB]")).deep.equal({
        finalType: 'int[1][3]',
        symbolType: SymbolType.BaseType
      })

    })

  })


  describe('test pubKeyHash', () => {


    it('should succeeding when unlock by pubKeyHash ', () => {

      const privateKey = new bsv.PrivateKey.fromRandom('testnet');
      const publicKey = privateKey.publicKey;
      const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());

      const inputSatoshis = 100000;
      const tx = newTx(inputSatoshis);

      const jsonDescr = loadDescription('p2pkh_desc.json');
      const DemoP2PKH = buildContractClass(jsonDescr);
      const p2pkh = new DemoP2PKH(new PubKeyHash(toHex(pubKeyHash)));

      p2pkh.txContext = {
        tx,
        inputIndex: 0,
        inputSatoshis: inputSatoshis
      }

      const sig = signTx(tx, privateKey, p2pkh.lockingScript, inputSatoshis);
      const pubkey = new PubKey(toHex(publicKey));

      let result = p2pkh.unlock(sig, pubkey).verify({ inputSatoshis, tx })

      expect(result.success).to.be.true;


    })

  })


  describe('test resolver_generic', () => {
    const C = buildContractClass(loadDescription('genericsst_alias_desc.json'));

    it('should succeeding when resolver type', () => {

      expect(C.resolver.resolverType("ST0")).deep.equal({
        finalType: 'ST0',
        symbolType: SymbolType.Struct
      })

      expect(C.resolver.resolverType("ST2")).deep.equal({
        finalType: 'ST2',
        symbolType: SymbolType.Struct
      })

      expect(C.resolver.resolverType("ST1<ST2[2]>")).deep.equal({
        finalType: 'ST1<ST2[2]>',
        symbolType: SymbolType.Struct
      })

      expect(C.resolver.resolverType("ST1<ST0<int>>")).deep.equal({
        finalType: 'ST1<ST0<int>>',
        symbolType: SymbolType.Struct
      })


      expect(C.resolver.resolverType("ST1<ST0<int[3]>[3][1]>")).deep.equal({
        finalType: 'ST1<ST0<int[3]>[3][1]>',
        symbolType: SymbolType.Struct
      })

      expect(C.resolver.resolverType("ST0A")).deep.equal({
        finalType: 'ST0<int>',
        symbolType: SymbolType.Struct
      })
      
      expect(C.resolver.resolverType("ST0AA")).deep.equal({
        finalType: 'ST0<ST0<int>>',
        symbolType: SymbolType.Struct
      })

      expect(C.resolver.resolverType("INTA")).deep.equal({
        finalType: 'int[3]',
        symbolType: SymbolType.BaseType
      })

      expect(C.resolver.resolverType("ST1A")).deep.equal({
        finalType: 'ST1<int[3]>',
        symbolType: SymbolType.Struct
      })

      expect(C.resolver.resolverType("ST3A")).deep.equal({
        finalType: 'ST3<ST1<int[3]>,ST0<ST0<int>>>',
        symbolType: SymbolType.Struct
      })

    })

  })


})
