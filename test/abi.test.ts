import { assert, expect } from 'chai';
import { loadDescription, newTx } from './helper';
import { ABICoder, FunctionCall } from '../src/abi';
import { buildContractClass, VerifyResult } from '../src/contract';
import { bsv, toHex, signTx } from '../src/utils';
import { Bytes, PubKey, Sig, Ripemd160, Bool, struct} from '../src/scryptTypes';

const privateKey = new bsv.PrivateKey.fromRandom('testnet');
const publicKey = privateKey.publicKey;
const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());
const inputSatoshis = 100000;
const tx = newTx(inputSatoshis);

const jsonDescr = loadDescription('p2pkh.scrypt');
const DemoP2PKH = buildContractClass(jsonDescr);
const p2pkh = new DemoP2PKH(new Ripemd160(toHex(pubKeyHash)));

const personDescr = loadDescription('person.scrypt');

const PersonContract = buildContractClass(personDescr);

const person = new PersonContract(new struct({
  isMale: false,
  age: 33,
  addr: new Bytes("68656c6c6f20776f726c6421")
}));


describe('FunctionCall', () => {

  let target: FunctionCall;
  let result: VerifyResult;

  describe('when it is the contract constructor', () => {

    before(() => {
      target = new FunctionCall('constructor', [new Ripemd160(toHex(pubKeyHash))], { contract: p2pkh, lockingScriptASM: p2pkh.lockingScript.toASM() });
    })

    describe('toHex() / toString()', () => {
      it('should return the locking script in hex', () => {
        assert.equal(target.toHex(), p2pkh.lockingScript.toHex());
      })
    })

    describe('toASM()', () => {
      it('should return the locking script in ASM', () => {
        assert.equal(target.toASM(), p2pkh.lockingScript.toASM());
      })
    })

    describe('verify()', () => {
      it('should fail', () => {
        result = target.verify({ inputSatoshis, tx });
        assert.isFalse(result.success);
        assert.equal(result.error, 'verification failed, missing unlockingScript');
      })
    })
  })

  describe('when it is a contract public function', () => {

    let sig: Sig;
    let pubkey: PubKey;

    before(() => {
      sig = new Sig(toHex(signTx(tx, privateKey, p2pkh.lockingScript.toASM(), inputSatoshis)));
      pubkey = new PubKey(toHex(publicKey));
      target = new FunctionCall('unlock', [sig, pubkey], { contract: p2pkh, unlockingScriptASM: [sig.toASM(), pubkey.toASM()].join(' ') });
    })

    describe('toHex() / toString()', () => {
      it('should return the unlocking script in hex', () => {
        assert.equal(target.toHex(), bsv.Script.fromASM(target.toASM()).toHex());
      })
    })

    describe('toASM()', () => {
      it('should return the unlocking script in ASM', () => {
        assert.equal(target.toASM(), [sig.toASM(), pubkey.toASM()].join(' '));
      })
    })

    describe('verify()', () => {
      it('should return true if params are appropriate', () => {
        // has no txContext in binding contract
        result = target.verify({ inputSatoshis, tx });
        assert.isTrue(result.success, result.error);

        // has txContext in binding contract
        p2pkh.txContext = { inputSatoshis, tx };
        result = target.verify();
        assert.isTrue(result.success, result.error);
        p2pkh.txContext = undefined;
      })

      it('should fail if param `inputSatoshis` is incorrect', () => {
        result = target.verify({ inputSatoshis: inputSatoshis + 1, tx });
        assert.isFalse(result.success, result.error);
        result = target.verify({ inputSatoshis: inputSatoshis - 1, tx });
        assert.isFalse(result.success, result.error);
      })

      it('should fail if param `txContext` is incorrect', () => {
        // missing txContext
        result = target.verify({ inputSatoshis });
        assert.isFalse(result.success, result.error);

        // incorrect txContext.tx
        tx.nLockTime = tx.nLockTime + 1;
        result = target.verify({ inputSatoshis, tx });
        assert.isFalse(result.success, result.error);
        tx.nLockTime = tx.nLockTime - 1;  //reset
      })
    })
  })


  describe('when constructor with struct', () => {

    before(() => {
      target = new FunctionCall('constructor', [new struct({
        isMale: false,
        age: 33,
        addr: new Bytes("68656c6c6f20776f726c6421")
      })], { contract: person, lockingScriptASM: person.lockingScript.toASM() });
    })

    describe('toHex() / toString()', () => {
      it('should return the locking script in hex', () => {
        assert.equal(target.toHex(), person.lockingScript.toHex());
      })
    })

    describe('toASM()', () => {
      it('should return the locking script in ASM', () => {
        assert.equal(target.toASM(), person.lockingScript.toASM());
      })
    })
  })



  describe('when it is a contract public function with struct', () => {

    
    it('should return true when age 13', () => {

      let result = person.main(new struct({
        isMale: false,
        age: 13,
        addr: new Bytes("68656c6c6f20776f726c6421")
      })).verify()

      assert.isTrue(result.success, result.error);
    })


    it('should return false when age 14', () => {

      let result = person.main(new struct({
        isMale: false,
        age: 14,
        addr: new Bytes("68656c6c6f20776f726c6421")
      })).verify()

      assert.isFalse(result.success, result.error);
    })

    it('should return false when isMale true', () => {

      let result = person.main(new struct({
        isMale: true,
        age: 14,
        addr: new Bytes("68656c6c6f20776f726c6421")
      })).verify()

      assert.isFalse(result.success, result.error);
    })

  })

  describe('struct prop check', () => {

    it('should throw miss isMale ', () => {


      expect(() => { person.main(new struct({
        age: 14,
        addr: new Bytes("68656c6c6f20776f726c6421")
      })) }).to.throw('struct Person should exists member isMale');
    })

    it('should throw miss addr ', () => {
      expect(() => { person.main(new struct({
        isMale: false,
        age: 13
      })) }).to.throw('struct Person should exists member addr');
    })

    it('should throw have invalid prop weight ', () => {
      expect(() => { person.main(new struct({
        weight: 100,
        isMale: false,
        age: 13,
        addr: new Bytes("68656c6c6f20776f726c6421")
      })) }).to.throw('weight is not a member of struct Person');
    })

  })

})

describe('ABICoder', () => {

  describe('encodeConstructorCall()', () => {
    describe('when contract has explict constructor', () => {
      it('should return FunctionCall object for contract constructor')
    })

    describe('when contract has no explict constructor', () => {
      it('should return FunctionCall object for contract constructor')
    })
  })

  describe('encodePubFunctionCall()', () => {
    it('should return FunctionCall object for contract public method')
  })
})


