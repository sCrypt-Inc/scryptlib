import { assert } from 'chai';
import { loadDescription, newTx } from './helper';
import { ABICoder, FunctionCall } from '../src/abi';
import { buildContractClass, VerificationError } from '../src/contract';
import { bsv, toHex, signTx } from '../src/utils';
import { Bytes, PubKey, Sig, Ripemd160 } from '../src/scryptTypes';

const privateKey = new bsv.PrivateKey.fromRandom('testnet');
const publicKey = privateKey.publicKey;
const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());
const inputSatoshis = 100000;
const tx = newTx(inputSatoshis);
const txHex = toHex(tx);

const jsonDescr = loadDescription('p2pkh.scrypt');
const DemoP2PKH = buildContractClass(jsonDescr);
const p2pkh = new DemoP2PKH(new Ripemd160(toHex(pubKeyHash)));

describe('FunctionCall', () => {

  let target: FunctionCall;

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
      it('should throw exception', () => {
        assert.throws(() => { target.verify({ inputSatoshis, txHex }); }, 'verification failed, missing unlockingScript');
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
        assert.isTrue(target.verify({ inputSatoshis, txHex }));

        // has txContext in binding contract
        p2pkh.txContext = { inputSatoshis, txHex };
        assert.isTrue(target.verify());
        p2pkh.txContext = undefined;
      })

      it('should throw error if param `inputSatoshis` is inappropriate', () => {
        assert.throws(() => { target.verify({ inputSatoshis: inputSatoshis + 1, txHex }) }, VerificationError);
        assert.throws(() => { target.verify({ inputSatoshis: inputSatoshis - 1, txHex }) }, VerificationError);
      })

      it('should throw error if param `txContext` is inappropriate', () => {
        // missing txContext
        assert.throws(() => { target.verify({ inputSatoshis }) }, VerificationError);

        // inappropriate txContext.txHex
        assert.throws(() => { target.verify({ inputSatoshis, txHex: txHex.slice(0, txHex.length - 1) + '1' }) }, VerificationError);
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


