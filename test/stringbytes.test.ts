
import { assert, expect } from 'chai';
import { newTx, loadDescription } from './helper';
import { buildContractClass, buildTypeClasses } from '../src/contract';
import { bsv, toHex, getPreimage, toHashedMap } from '../src/utils';
import { Bytes, SigHash, SigHashPreimage } from '../src';
import { UTF8Bytes } from '../src/scryptTypes';
const inputIndex = 0;
const inputSatoshis = 100000;

const outputAmount = inputSatoshis


describe('stringbytes.test', () => {

  describe('test stringbytes.scrypt ', () => {

    let instance, result;

    const Test = buildContractClass(loadDescription('stringbytes_desc.json'));
    before(() => {
      instance = new Test();
    });

    it('should success when call unlock', () => {
      result = instance.unlock(new Bytes("1234ab"), new UTF8Bytes("你好world"), new UTF8Bytes("abcd"), new UTF8Bytes("こんにちは"), new UTF8Bytes("b'aa'"), new UTF8Bytes("😊")).verify()
      expect(result.success, result.error).to.be.true
    });

    it('should fail when using wrong value', () => {
      result = instance.unlock(new Bytes("1234ab"), new UTF8Bytes("你好world"), new UTF8Bytes("abcd"), new UTF8Bytes("ここんにちは"), new UTF8Bytes("b'aa'"), new UTF8Bytes("😊")).verify()
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
      instance = new Test(new L(new Bytes("1234ab"), new UTF8Bytes("你好world"), new UTF8Bytes("abcd"), new UTF8Bytes("こんにちは"), new UTF8Bytes("b'aa'"), new UTF8Bytes("😊")),
        new Bytes("1234ab"), new UTF8Bytes("你好world"), new UTF8Bytes("abcd"), new UTF8Bytes("こんにちは"), new UTF8Bytes("b'aa'"), new UTF8Bytes("😊"));
    });

    it('should success when call unlock', () => {
      result = instance.unlock(new Bytes("1234ab"), new UTF8Bytes("你好world"), new UTF8Bytes("abcd"), new UTF8Bytes("こんにちは"), new UTF8Bytes("b'aa'"), new UTF8Bytes("😊")).verify()
      expect(result.success, result.error).to.be.true
    });

    it('should success when with empty space', () => {

      instance = new Test(new L(new Bytes("1234ab"), new UTF8Bytes("你好  world"), new UTF8Bytes("ab/[]]]cd"), new UTF8Bytes("()rrr)"), new UTF8Bytes("b'aa'"), new UTF8Bytes("😊😊")),
        new Bytes("1234ab"), new UTF8Bytes("你好  world"), new UTF8Bytes("ab/[]]]cd"), new UTF8Bytes("()rrr)"), new UTF8Bytes("b'aa'"), new UTF8Bytes("😊😊"));


      result = instance.unlock(new Bytes("1234ab"), new UTF8Bytes("你好  world"), new UTF8Bytes("ab/[]]]cd"), new UTF8Bytes("()rrr)"), new UTF8Bytes("b'aa'"), new UTF8Bytes("😊😊")).verify()
      expect(result.success, result.error).to.be.true
    });

    it('should fail when using wrong value', () => {
      result = instance.unlock(new Bytes("1234ab"), new UTF8Bytes("你好world"), new UTF8Bytes("abcd"), new UTF8Bytes("ここんにちは"), new UTF8Bytes("b'aa'"), new UTF8Bytes("😊")).verify()
      expect(result.success, result.error).to.be.false
    });
  })


  describe('test stringbytes1.scrypt ', () => {

    let instance, result;

    const Logger = buildContractClass(loadDescription('stringbytes2_desc.json'));

    before(() => {
      instance = new Logger(new UTF8Bytes("message:"));
    });

    it('should success when call unlock', () => {


      let newLockingScript = instance.getNewStateScript({
        message: new UTF8Bytes("message:this is a logger contract")
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

      result = instance.log(new SigHashPreimage(toHex(preimage)), new UTF8Bytes("this is a logger contract")).verify()
      expect(result.success, result.error).to.be.true
    });


  })
})

