import { assert } from 'chai';
import { loadABI, loadASM } from './helper';
import { getContractClass, AbstractContract } from '../src/scryptjs-contract';

const contractFile = 'p2pkh.scrypt';
const contractName = 'DemoP2PKH';
const asmTemplate = loadASM(contractFile);
const abi = loadABI(contractFile)[contractName];
const pubKeyHash = '2bc7163e0085b0bcd4e0efd1c537537053aa13f2';
const sig = '30440220729d3935d496e5a708a6a1d4c61dcdd1bebae6f0e0b63b9b9eb1b7616cdbbc2b02203b58cdde0133a6e90d921ecee6ecafca7000a13a3e38673810b4c6badd8d952041';
const pubKey = '03613fa845ad3fe1ef4fe9bbf0b50a1cb5219dd30a0c4e3e4e46fb218313af9220';

describe('getContractClass()', () => {

  it('should return a reflected contract class object', () => {
    const DemoP2PKH = getContractClass(abi, asmTemplate);
    assert.typeOf(DemoP2PKH, 'function');
    assert.deepEqual(DemoP2PKH.abi, abi);
    assert.deepEqual(DemoP2PKH.asmTemplate, asmTemplate);
  });

  describe('when using the returned class to instantiate contract', () => {

    let DemoP2PKH: any;

    before(() => {
      DemoP2PKH = getContractClass(abi, asmTemplate);
    });

    it("should have the contructor of the contract mapped to instance's constructor", () => {
      const instance = new DemoP2PKH(pubKeyHash);
      assert.isTrue(instance instanceof AbstractContract);
      assert.equal(instance.toASM(), 'OP_1 40 00 51 b1 b2 2bc7163e0085b0bcd4e0efd1c537537053aa13f2 OP_7 OP_PICK OP_HASH160 OP_OVER OP_EQUALVERIFY OP_8 OP_PICK OP_8 OP_PICK OP_CHECKSIG OP_TOALTSTACK OP_2DROP OP_2DROP OP_2DROP OP_2DROP OP_FROMALTSTACK OP_NIP');
      assert.equal(instance.toHex(), '5101400100015101b101b2142bc7163e0085b0bcd4e0efd1c537537053aa13f25779a9788858795879ac6b6d6d6d6d6c77');
    });

    it("should have all public functions of the contract mapped to instance's methods", () => {
      const instance = new DemoP2PKH(pubKeyHash);
      assert.equal(instance.unlock(sig, pubKey).toASM(), '30440220729d3935d496e5a708a6a1d4c61dcdd1bebae6f0e0b63b9b9eb1b7616cdbbc2b02203b58cdde0133a6e90d921ecee6ecafca7000a13a3e38673810b4c6badd8d952041 03613fa845ad3fe1ef4fe9bbf0b50a1cb5219dd30a0c4e3e4e46fb218313af9220');
      assert.equal(instance.unlock(sig, pubKey).toHex(), '4730440220729d3935d496e5a708a6a1d4c61dcdd1bebae6f0e0b63b9b9eb1b7616cdbbc2b02203b58cdde0133a6e90d921ecee6ecafca7000a13a3e38673810b4c6badd8d9520412103613fa845ad3fe1ef4fe9bbf0b50a1cb5219dd30a0c4e3e4e46fb218313af9220')
    });
  })

});
