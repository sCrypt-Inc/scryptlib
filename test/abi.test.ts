import { assert } from 'chai';
import { loadAbiJSON } from './helper';
import { ABICoder, ScriptedMethodCall } from '../src/abi';
import { getContractClass } from '../src/contract';

const contractFile1 = 'p2pkh.scrypt';
const abiJson1 = loadAbiJSON(contractFile1);
const abi1 = abiJson1.abi;
const asm1 = abiJson1.asm;
const DemoP2PKH = getContractClass(abiJson1);


const contractFile2 = 'ackermann.scrypt';
const abiJson2 = loadAbiJSON(contractFile2);
const abi2 = abiJson2.abi;
const asm2 = abiJson2.asm;
const Ackermann = getContractClass(abiJson2);

before(() => {

})

describe('ScriptedMethodCall', () => {

  let target: ScriptedMethodCall;

  describe('when it is the contract constructor', () => {
    describe('toHex() / toString()', () => {
      it('should return the locking script in hex')
    })

    describe('toASM()', () => {
      it('should return the locking script in ASM')
    })

    describe('verify()', () => {
      it('should throw exception')
    })
  })

  describe('when it is a contract public function', () => {

    const pubKeyHash = '2bc7163e0085b0bcd4e0efd1c537537053aa13f2';
    const sig = '30440220729d3935d496e5a708a6a1d4c61dcdd1bebae6f0e0b63b9b9eb1b7616cdbbc2b02203b58cdde0133a6e90d921ecee6ecafca7000a13a3e38673810b4c6badd8d952041';
    const pubKey = '03613fa845ad3fe1ef4fe9bbf0b50a1cb5219dd30a0c4e3e4e46fb218313af9220';
    const txHex = '01000000015884e5db9de218238671572340b207ee85b628074e7e467096c267266baf77a40000000000ffffffff0000000000';
    const inputSatoshis = 100000;
    const p2pkh = new DemoP2PKH(pubKeyHash);

    target = new ScriptedMethodCall('unlock', [sig, pubKey], { contract: p2pkh, unlockingScript: [sig, pubKey].join(' ') });

    describe('toHex() / toString()', () => {
      it('should return the unlocking script in hex', () => {
        assert.equal(target.toHex(), '4730440220729d3935d496e5a708a6a1d4c61dcdd1bebae6f0e0b63b9b9eb1b7616cdbbc2b02203b58cdde0133a6e90d921ecee6ecafca7000a13a3e38673810b4c6badd8d9520412103613fa845ad3fe1ef4fe9bbf0b50a1cb5219dd30a0c4e3e4e46fb218313af9220');
      })
    })

    describe('toASM()', () => {
      it('should return the unlocking script in ASM', () => {
        assert.equal(target.toASM(), '30440220729d3935d496e5a708a6a1d4c61dcdd1bebae6f0e0b63b9b9eb1b7616cdbbc2b02203b58cdde0133a6e90d921ecee6ecafca7000a13a3e38673810b4c6badd8d952041 03613fa845ad3fe1ef4fe9bbf0b50a1cb5219dd30a0c4e3e4e46fb218313af9220');
      })
    })

    describe('verify()', () => {
      it('should return true if params are appropriate', () => {
        // has no txContext in binding contract
        assert.isTrue(target.verify(inputSatoshis, { hex: txHex }));

        // has txContext in binding contract
        p2pkh.txContext = { hex: txHex };
        assert.isTrue(target.verify(inputSatoshis));
        p2pkh.txContext = undefined;
      })

      it('should return false if param `inputSatoshis` is inappropriate', () => {
        assert.isFalse(target.verify(inputSatoshis + 1, { hex: txHex }));
        assert.isFalse(target.verify(inputSatoshis - 1, { hex: txHex }));
      })

      it('should return false if param `txContext` is inappropriate', () => {
        assert.isFalse(target.verify(inputSatoshis));
        assert.isFalse(target.verify(inputSatoshis, { hex: txHex.slice(0, txHex.length - 1) + '1'}));
      })
    })
  })
})

describe('ABICoder', () => {

  describe('encodeConstructor()', () => {
    describe('when contract has explict constructor', () => {
      it('should return ScriptedMethodCall object for contract constructor')
    })

    describe('when contract has no explict constructor', () => {
      it('should return ScriptedMethodCall object for contract constructor')
    })
  })

  describe('encodeFunctionCall()', () => {
    it('should return ScriptedMethodCall object for contract public method')
  })
})


