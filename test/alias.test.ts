import { loadDescription } from './helper';
import { assert, expect } from 'chai';
import { buildContractClass, buildTypeClasses, buildTypeResolver } from '../src/contract';
import { Bytes, Int } from '../src/scryptTypes';





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

  it('should success when using MaleAAA', () => {

    let result = alias.unlock(new MaleAAA({
      name: new Name("68656c6c6f20776f726c6421"),
      age: new Age(33),
      token: new Token(101)
    })).verify()
    assert.isTrue(result.success, result.error);

  })

  it('should success when using bytes', () => {

    let result = alias.unlock(new MaleAAA({
      name: new Bytes("68656c6c6f20776f726c6421"),
      age: new Int(33),
      token: new Int(101)
    })).verify()
    assert.isTrue(result.success, result.error);

  })

  it('should success when using Male', () => {

    let result = alias.unlock(new Male({
      name: new Name("68656c6c6f20776f726c6421"),
      age: new Age(33),
      token: new Token(101)
    })).verify()
    assert.isTrue(result.success, result.error);

  })


  it('should success when using Person', () => {

    let result = alias.unlock(new Person({
      name: new Name("68656c6c6f20776f726c6421"),
      age: 33,
      token: new Token(101)
    })).verify()
    assert.isTrue(result.success, result.error);
  })

  it('should success when using Female', () => {
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
    }).to.throw('expect struct Person but got struct Block');
  })

  it('should success when using Female', () => {
    let result = alias.unlock(new Male({
      name: new Coinbase("68656c6c6f20776f726c6421"),
      age: new Time(33),
      token: new Age(101)
    })).verify()
    assert.isTrue(result.success, result.error);
  })



  it('should success when using number', () => {
    let result = alias.setToken([10, 3, 3]).verify()
    assert.isTrue(result.success, result.error);
  })

  it('should success when using all int alias', () => {
    let result = alias.setToken([new Time(10), new Age(3), new Token(3)]).verify()
    assert.isTrue(result.success, result.error);
  })


  it('should success when parameter is array struct have member with alias', () => {
    let result = alias.isPerson([new Female({
      name: new Name("68656c6c6f20776f726c6421"),
      age: new Age(1),
      token: new Token(101)
    })]).verify()
    assert.isTrue(result.success, result.error);
  })


  describe('Alias buildTypeResolver', () => {


    it('should success when call buildTypeResolver', () => {
      const jsondesc = loadDescription('alias_desc.json');
      const finalTypeResolver = buildTypeResolver(jsondesc.alias, jsondesc.structs, {})
      expect(finalTypeResolver("Age")).to.equal('int')
      expect(finalTypeResolver("Time")).to.equal('int')
      expect(finalTypeResolver("Name")).to.equal('bytes')
      expect(finalTypeResolver("Token")).to.equal('int')
      expect(finalTypeResolver("Tokens")).to.equal('int[3]')
      expect(finalTypeResolver("MaleAAA")).to.equal('struct Person {}')
      expect(finalTypeResolver("Male")).to.equal('struct Person {}')
      expect(finalTypeResolver("Female")).to.equal('struct Person {}')
      expect(finalTypeResolver("Block")).to.equal('struct Block {}')
      expect(finalTypeResolver("Coinbase")).to.equal('bytes')
      expect(finalTypeResolver("Integer")).to.equal('int')
      expect(finalTypeResolver("Height")).to.equal('int')
      expect(finalTypeResolver("struct Person {}[3]")).to.equal('struct Person {}[3]')
      expect(finalTypeResolver("struct MaleAAA {}[3]")).to.equal('struct Person {}[3]')
      expect(finalTypeResolver("struct MaleB {}[1]")).to.equal('struct Person {}[1][3]')
      expect(finalTypeResolver("struct MaleC {}[5]")).to.equal('struct Person {}[5][2][3]')


      expect(finalTypeResolver("int")).to.equal('int')
      expect(finalTypeResolver("PubKey")).to.equal('PubKey')
      expect(finalTypeResolver("PrivKey")).to.equal('PrivKey')
      expect(finalTypeResolver("SigHashPreimage")).to.equal('SigHashPreimage')
      expect(finalTypeResolver("bool")).to.equal('bool')
      expect(finalTypeResolver("bytes")).to.equal('bytes')
      expect(finalTypeResolver("Sig")).to.equal('Sig')
      expect(finalTypeResolver("Ripemd160")).to.equal('Ripemd160')
      expect(finalTypeResolver("Sha1")).to.equal('Sha1')
      expect(finalTypeResolver("Sha256")).to.equal('Sha256')
      expect(finalTypeResolver("SigHashType")).to.equal('SigHashType')
      expect(finalTypeResolver("OpCodeType")).to.equal('OpCodeType')

    })

    it('should success when call buildTypeResolver', () => {

      const finalTypeResolver = buildTypeResolver([], [], {})

      expect(() => {
        finalTypeResolver("Person")
      }).to.throw("typeResolver with unknown type Person")

      expect(() => {
        finalTypeResolver("Person[3]")
      }).to.throw("typeResolver with unknown elemTypeName Person")

      expect(finalTypeResolver("int")).to.equal('int')
      expect(finalTypeResolver("PubKey")).to.equal('PubKey')
      expect(finalTypeResolver("PrivKey")).to.equal('PrivKey')
      expect(finalTypeResolver("SigHashPreimage")).to.equal('SigHashPreimage')
      expect(finalTypeResolver("bool")).to.equal('bool')
      expect(finalTypeResolver("bytes")).to.equal('bytes')
      expect(finalTypeResolver("Sig")).to.equal('Sig')
      expect(finalTypeResolver("Ripemd160")).to.equal('Ripemd160')
      expect(finalTypeResolver("Sha1")).to.equal('Sha1')
      expect(finalTypeResolver("Sha256")).to.equal('Sha256')
      expect(finalTypeResolver("SigHashType")).to.equal('SigHashType')
      expect(finalTypeResolver("OpCodeType")).to.equal('OpCodeType')

    })
  })

  describe('Alias1Contract check', () => {

    const Alias1Contract = buildContractClass(loadDescription('alias1_desc.json'));

    const { Tokens, TokenArray, Token } = buildTypeClasses(loadDescription('alias1_desc.json'));


    it('should success when call buildTypeResolver', () => {
      const jsondesc = loadDescription('alias1_desc.json');
      const finalTypeResolver = buildTypeResolver(jsondesc.alias, jsondesc.structs, {})
      expect(finalTypeResolver("Tokens")).to.equal('int[3]')
      expect(finalTypeResolver("TokenArray")).to.equal('int[1][3]')
      expect(finalTypeResolver("TokenAA")).to.equal('int[4][5][1][3]')
      expect(finalTypeResolver("Tokens[1]")).to.equal('int[1][3]')
      expect(finalTypeResolver("TokenArray[4][5]")).to.equal('int[4][5][1][3]')

    })

    const alias = new Alias1Contract([1, 3, 3], [[2, 1, 3]]);

    it('should success when unlock', () => {

      let result = alias.unlock([1, 3, 3], [[2, 1, 3]]).verify()
      assert.isTrue(result.success, result.error);
    })
  })
})
