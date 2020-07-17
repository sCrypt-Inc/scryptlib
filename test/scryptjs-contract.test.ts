import { assert } from 'chai';
import { loadAbiJSON } from './helper';
import { getContractClass, AbstractContract } from '../src/scryptjs-contract';
import { ScriptedMethodCall } from '../src/scryptjs-abi';
import { deserialize } from '../src/scryptjs-utils';

const abiJSON = loadAbiJSON('p2pkh.scrypt');
const pubKeyHash = '2bc7163e0085b0bcd4e0efd1c537537053aa13f2';
const sig = '30440220729d3935d496e5a708a6a1d4c61dcdd1bebae6f0e0b63b9b9eb1b7616cdbbc2b02203b58cdde0133a6e90d921ecee6ecafca7000a13a3e38673810b4c6badd8d952041';
const pubKey = '03613fa845ad3fe1ef4fe9bbf0b50a1cb5219dd30a0c4e3e4e46fb218313af9220';
const txHex = '01000000015884e5db9de218238671572340b207ee85b628074e7e467096c267266baf77a40000000000ffffffff0000000000';
const tx = deserialize(txHex);

describe('getContractClass()', () => {

  it('should return a reflected contract class object', () => {
    const DemoP2PKH = getContractClass(abiJSON);
    assert.typeOf(DemoP2PKH, 'function');
    assert.deepEqual(DemoP2PKH.abi, abiJSON.abi);
    assert.deepEqual(DemoP2PKH.asm, abiJSON.asm);
  })

  describe('instance of the returned contract class', () => {

    let DemoP2PKH: any;
    let instance: any;

    before(() => {
      DemoP2PKH = getContractClass(abiJSON);
      instance = new DemoP2PKH(pubKeyHash);
    })

    it('should be an instance of AbstractContract', () => {
      assert.instanceOf(instance, AbstractContract);
    })

    describe('toHex()', () => {
      it('should return the locking script in hex of the contract', () => {
        assert.equal(instance.toHex(), '5101400100015101b101b2142bc7163e0085b0bcd4e0efd1c537537053aa13f25779a95179876958795879ac777777777777777777');
      })
    })

    describe('toASM()', () => {
      it('should return the locking script in ASM of the contract', () => {
        assert.equal(instance.toASM(), 'OP_1 40 00 51 b1 b2 2bc7163e0085b0bcd4e0efd1c537537053aa13f2 OP_7 OP_PICK OP_HASH160 OP_1 OP_PICK OP_EQUAL OP_VERIFY OP_8 OP_PICK OP_8 OP_PICK OP_CHECKSIG OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP');
      })
    })

    describe('verify()', () => {

      const unlockingScript = '30440220729d3935d496e5a708a6a1d4c61dcdd1bebae6f0e0b63b9b9eb1b7616cdbbc2b02203b58cdde0133a6e90d921ecee6ecafca7000a13a3e38673810b4c6badd8d952041 03613fa845ad3fe1ef4fe9bbf0b50a1cb5219dd30a0c4e3e4e46fb218313af9220';
      const inputSatoshis = 100000;
      const txContext = { hex: txHex };

      describe('when instance.txContext was unset', () => {
        it('should return true if all params are appropriate', () => {
          assert.isTrue(instance.verify(unlockingScript, inputSatoshis, txContext));
        })
      })

      describe('when instance.txContext was set', () => {
        it('should return true if other params (except txContext) is appropriate', () => {
          instance.txContext = txContext;
          assert.isTrue(instance.verify(unlockingScript, inputSatoshis));
        })
      })

      it('should return false if param `unlockingScript` is inappropriate', () => {
        assert.isFalse(instance.verify(unlockingScript + '00', inputSatoshis, txContext));
      })

      it('should return false if param `inputSatoshis` is inappropriate', () => {
        assert.isFalse(instance.verify(unlockingScript, inputSatoshis + 1, txContext));
      })

      it('should return false if param `txContext` is inappropriate', () => {
        assert.isFalse(instance.verify(unlockingScript, inputSatoshis + 1, undefined));
      })
    })

    it("should have all public functions of the contract mapped to instance's methods", () => {
      assert.typeOf(instance.unlock, 'function');
    })

    describe("when the mapped-method being invoked", () => {
      it("should return ScriptedMethodCall type object which could be transformed to locking script", () => {
        assert.instanceOf(instance.unlock(sig, pubKey), ScriptedMethodCall);
        assert.equal(instance.unlock(sig, pubKey).toASM(), '30440220729d3935d496e5a708a6a1d4c61dcdd1bebae6f0e0b63b9b9eb1b7616cdbbc2b02203b58cdde0133a6e90d921ecee6ecafca7000a13a3e38673810b4c6badd8d952041 03613fa845ad3fe1ef4fe9bbf0b50a1cb5219dd30a0c4e3e4e46fb218313af9220');
        assert.equal(instance.unlock(sig, pubKey).toHex(), '4730440220729d3935d496e5a708a6a1d4c61dcdd1bebae6f0e0b63b9b9eb1b7616cdbbc2b02203b58cdde0133a6e90d921ecee6ecafca7000a13a3e38673810b4c6badd8d9520412103613fa845ad3fe1ef4fe9bbf0b50a1cb5219dd30a0c4e3e4e46fb218313af9220');
        assert.isTrue(instance.unlock(sig, pubKey).verify(100000, { hex: txHex }))
        assert.isTrue(instance.unlock(sig, pubKey).verify(100000, { tx }))
      })
    })

  })

})
