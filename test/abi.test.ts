import { assert } from 'chai';
import { loadDescription, newTx } from './helper';
import { ABICoder, FunctionCall } from '../src/abi';
import { buildContractClass, VerifyResult } from '../src/contract';
import { bsv, toHex, signTx } from '../src/utils';
import { Bytes, PubKey, Sig, Ripemd160 } from '../src/scryptTypes';

const privateKey = new bsv.PrivateKey.fromRandom('testnet');
const publicKey = privateKey.publicKey;
const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());
const inputSatoshis = 100000;
const tx = newTx(inputSatoshis);

const jsonDescr = loadDescription('p2pkh.scrypt');
const DemoP2PKH = buildContractClass(jsonDescr);
const p2pkh = new DemoP2PKH(new Ripemd160(toHex(pubKeyHash)));

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


