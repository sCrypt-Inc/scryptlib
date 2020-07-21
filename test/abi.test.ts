import { assert } from 'chai';
import { loadAbiJSON, newTx } from './helper';
import { ABICoder, FunctionCall } from '../src/abi';
import { getContractClass } from '../src/contract';
import { bsv, toHex, signTx } from '../src/utils';

const privateKey = new bsv.PrivateKey.fromRandom('testnet');
const publicKey = privateKey.publicKey;
const inputSatoshis = 100000;
const tx = newTx(inputSatoshis);
const txHex = toHex(tx);

const abiJSON = loadAbiJSON('p2pkh.scrypt');
const DemoP2PKH = getContractClass(abiJSON);
const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());
const p2pkh = new DemoP2PKH(toHex(pubKeyHash));

describe('FunctionCall', () => {

  let target: FunctionCall;

  describe('when it is the contract constructor', () => {

    before(() => {
      target = new FunctionCall('constructor', [toHex(pubKeyHash)], { contract: p2pkh, lockingScript: p2pkh.lockingScript });
    })

    describe('toHex() / toString()', () => {
      it('should return the locking script in hex', () => {
        assert.equal(target.toHex(), bsv.Script.fromASM(p2pkh.lockingScript).toHex());
      })
    })

    describe('toASM()', () => {
      it('should return the locking script in ASM', () => {
        assert.equal(target.toASM(), p2pkh.lockingScript);
      })
    })

    describe('verify()', () => {
      it('should throw exception', () => {
        assert.throws(() => { target.verify({ inputSatoshis, hex: txHex }); }, 'verification failed, missing unlockingScript');
      })
    })
  })

  describe('when it is a contract public function', () => {

    let sig: any;

    before(() => {
      sig = signTx(tx, privateKey, p2pkh.lockingScript, inputSatoshis);
      target = new FunctionCall('unlock', [toHex(sig), toHex(publicKey)], { contract: p2pkh, unlockingScript: [toHex(sig), toHex(publicKey)].join(' ') });
    })

    describe('toHex() / toString()', () => {
      it('should return the unlocking script in hex', () => {
        assert.equal(target.toHex(), bsv.Script.fromASM(target.toASM()).toHex());
      })
    })

    describe('toASM()', () => {
      it('should return the unlocking script in ASM', () => {
        assert.equal(target.toASM(), [toHex(sig), toHex(publicKey)].join(' '));
      })
    })

    describe('verify()', () => {
      it('should return true if params are appropriate', () => {
        // has no txContext in binding contract
        assert.isTrue(target.verify({ inputSatoshis, hex: txHex }));

        // has txContext in binding contract
        p2pkh.txContext = { inputSatoshis, hex: txHex };
        assert.isTrue(target.verify());
        p2pkh.txContext = undefined;
      })

      it('should return false if param `inputSatoshis` is inappropriate', () => {
        assert.isFalse(target.verify({ inputSatoshis: inputSatoshis + 1, hex: txHex }));
        assert.isFalse(target.verify({ inputSatoshis: inputSatoshis - 1, hex: txHex }));
      })

      it('should return false if param `txContext` is inappropriate', () => {
        // missing txContext
        assert.isFalse(target.verify({ inputSatoshis }));

        // inappropriate txContext.hex
        assert.isFalse(target.verify({ inputSatoshis, hex: txHex.slice(0, txHex.length - 1) + '1' }));
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


