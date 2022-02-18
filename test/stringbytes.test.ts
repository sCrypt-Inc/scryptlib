
import { assert, expect } from 'chai';
import { newTx, loadDescription } from './helper';
import { buildContractClass, buildTypeClasses } from '../src/contract';
import { bsv, toHex, getPreimage, toHashedMap } from '../src/utils';
import { Bytes, SigHash, SigHashPreimage } from '../src';
import { String } from '../src/scryptTypes';
const inputIndex = 0;
const inputSatoshis = 100000;

const outputAmount = inputSatoshis


describe('String.test', () => {

  describe('test String', () => {

    let instance, result;

    const Test = buildContractClass(loadDescription('stringbytes_desc.json'));
    before(() => {
      instance = new Test();
    });

    it('should succeeding when call unlock', () => {
      result = instance.unlock(new Bytes("1234ab"), new String("你好world"), new String("abcd"), new String("こんにちは"), new String("b'aa'"), new String("😊")).verify()
      expect(result.success, result.error).to.be.true
    });


    it('should succeeding when call testEmpty', () => {
      result = instance.testEmpty(new String("")).verify()
      expect(result.success, result.error).to.be.true
    });

    it('should fail when using wrong value', () => {
      result = instance.unlock(new Bytes("1234ab"), new String("你好world"), new String("abcd"), new String("ここんにちは"), new String("b'aa'"), new String("😊")).verify()
      expect(result.success, result.error).to.be.false
    });


    it('should throw when using Bytes for utf8', () => {

      expect(() => new Bytes("你好world1"))
        .to.throw(`can't construct Bytes from <你好world1>, 你好world1 should only contain [0-9] or characters [a-fA-F]`)

    });

  })

  describe('test stringbytes1.scrypt ', () => {

    let instance, result;

    const Test = buildContractClass(loadDescription('stringbytes1_desc.json'));
    const { L } = buildTypeClasses(Test);
    before(() => {
      instance = new Test(new L(new Bytes("1234ab"), new String("你好world"), new String("abcd"), new String("こんにちは"), new String("b'aa'"), new String("😊")),
        new Bytes("1234ab"), new String("你好world"), new String("abcd"), new String("こんにちは"), new String("b'aa'"), new String("😊"));
    });

    it('should succeeding when call unlock', () => {
      result = instance.unlock(new Bytes("1234ab"), new String("你好world"), new String("abcd"), new String("こんにちは"), new String("b'aa'"), new String("😊")).verify()
      expect(result.success, result.error).to.be.true
    });

    it('should succeeding when with empty space', () => {

      instance = new Test(new L(new Bytes("1234ab"), new String("你好  world"), new String("ab/[]]]cd"), new String("()rrr)"), new String("b'aa'"), new String("😊😊")),
        new Bytes("1234ab"), new String("你好  world"), new String("ab/[]]]cd"), new String("()rrr)"), new String("b'aa'"), new String("😊😊"));


      result = instance.unlock(new Bytes("1234ab"), new String("你好  world"), new String("ab/[]]]cd"), new String("()rrr)"), new String("b'aa'"), new String("😊😊")).verify()
      expect(result.success, result.error).to.be.true
    });

    it('should succeeding when with empty bytes', () => {
      instance = new Test(new L(new Bytes(""), new String(""), new String(""), new String(""), new String(""), new String("")),
        new Bytes(""), new String(""), new String(""), new String(""), new String(""), new String(""));
      result = instance.unlock(new Bytes(""), new String(""), new String(""), new String(""), new String(""), new String("")).verify()
      expect(result.success, result.error).to.be.true
    });

    it('should succeeding when \n, \", \'', () => {

      const str = `aa " " " ' 

aa`;
      instance = new Test(new L(new Bytes(""), new String(str), new String(str), new String(str), new String(str), new String(str)),
        new Bytes(""), new String(str), new String(str), new String(str), new String(str), new String(str));
      result = instance.unlock(new Bytes(""), new String(str), new String(str), new String(str), new String(str), new String(str)).verify()
      expect(result.success, result.error).to.be.true
    });

    it('should fail when using wrong value', () => {
      result = instance.unlock(new Bytes("1234ab"), new String("你好world"), new String("abcd"), new String("ここんにちは"), new String("b'aa'"), new String("😊")).verify()
      expect(result.success, result.error).to.be.false
    });
  })


  describe('test stringbytes1.scrypt ', () => {

    let instance, result;

    const Logger = buildContractClass(loadDescription('stringbytes2_desc.json'));

    before(() => {
      instance = new Logger(new String("message:"));
    });

    it('should succeeding when call unlock', () => {


      let newLockingScript = instance.getNewStateScript({
        message: new String("message:this is a logger contract")
      })

      const tx = newTx(inputSatoshis);
      tx.addOutput(new bsv.Transaction.Output({
        script: newLockingScript,
        satoshis: outputAmount
      }))

      const preimage = getPreimage(tx, instance.lockingScript, inputSatoshis, 0, SigHash.SINGLE_FORKID)

      instance.txContext = {
        tx: tx,
        inputIndex,
        inputSatoshis
      }

      result = instance.log(new SigHashPreimage(toHex(preimage)), new String("this is a logger contract")).verify()
      expect(result.success, result.error).to.be.true
    });


  })
})

