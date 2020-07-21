import { assert } from 'chai';
import { loadAbiJSON, newTx } from './helper';
import { getContractClass, AbstractContract, TxContext } from '../src/contract';
import { FunctionCall } from '../src/abi';
import { bsv, signTx, toHex } from '../src/utils';

const privateKey = new bsv.PrivateKey.fromRandom('testnet');
const publicKey = privateKey.publicKey;
const inputSatoshis = 100000;
const tx = newTx(inputSatoshis);

const abiJSON = loadAbiJSON('p2pkh.scrypt');

describe('getContractClass()', () => {

  it('should return a reflected contract class object', () => {
    const DemoP2PKH = getContractClass(abiJSON);
    assert.typeOf(DemoP2PKH, 'function');
    assert.deepEqual(DemoP2PKH.interfaces, abiJSON.interfaces);
    assert.deepEqual(DemoP2PKH.asm, abiJSON.asm);
  })

  describe('instance of the returned contract class', () => {

    let DemoP2PKH: any;
    let instance: any;
    let pubKeyHash: any;
    let sig: any;
    let txContext: TxContext;
    let unlockingScript: string;

    before(() => {
      pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());

      DemoP2PKH = getContractClass(abiJSON);
      instance = new DemoP2PKH(toHex(pubKeyHash));

      sig = signTx(tx, privateKey, instance.lockingScript, inputSatoshis);
      txContext = { inputSatoshis, tx };

      unlockingScript = [toHex(sig), toHex(publicKey)].join(' ');
    })

    it('should be an instance of AbstractContract', () => {
      assert.instanceOf(instance, AbstractContract);
    })

    describe('toHex()', () => {
      it('should return the locking script of the contract in hex', () => {
        assert.equal(instance.toHex(), `5101400100015101b101b214${toHex(pubKeyHash)}5779a95179876958795879ac777777777777777777`);
      })
    })

    describe('toASM()', () => {
      it('should return the locking script of the contract in ASM', () => {
        assert.equal(instance.toASM(), instance.lockingScript);
        assert.equal(instance.toASM(), `OP_1 40 00 51 b1 b2 ${toHex(pubKeyHash)} OP_7 OP_PICK OP_HASH160 OP_1 OP_PICK OP_EQUAL OP_VERIFY OP_8 OP_PICK OP_8 OP_PICK OP_CHECKSIG OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP`);
      })
    })

    describe('verify()', () => {
      it('should return true if all arguments are correct', () => {
        // use param txContext as the context
        assert.isTrue(instance.verify(unlockingScript, txContext));

        // use instance.txContxt as the context
        instance.txContext = txContext;
        assert.isTrue(instance.verify(unlockingScript));
        instance.txContext = undefined;
      })

      it('should return false if param `unlockingScript` is incorrect', () => {
        assert.isFalse(instance.verify(unlockingScript + '00', txContext));
      })

      it('should return false if param `txContext` is incorrect', () => {
        // emtpy txContext
        assert.isFalse(instance.verify(unlockingScript));

        // incorrect inputSatoshis
        assert.isFalse(instance.verify(unlockingScript, Object.assign({}, txContext, { inputSatoshis: inputSatoshis + 1 })));
      })
    })

    it("should have all public functions of the contract mapped to instance's methods", () => {
      assert.typeOf(instance.unlock, 'function');
    })

    describe("when the mapped-method being invoked", () => {

      it("should return FunctionCall type object which could be transformed to unlocking script", () => {
        const functionCall = instance.unlock(toHex(sig), toHex(publicKey));
        assert.instanceOf(functionCall, FunctionCall);
        assert.equal(functionCall.toASM(), unlockingScript);
        assert.equal(functionCall.toHex(), bsv.Script.fromASM(unlockingScript).toHex());
      })

      it('the returned object can be verified whether it could unlock the contract', () => {
        // can unlock contract if params are correct
        const validSig = toHex(sig);
        const validPubkey = toHex(publicKey);
        assert.isTrue(instance.unlock(validSig, validPubkey).verify({ inputSatoshis, hex: toHex(tx) }));
        assert.isTrue(instance.unlock(validSig, validPubkey).verify({ inputSatoshis, tx }));

        // can not unlock contract if any param is incorrect
        const invalidSig = validSig.replace('1', '0');
        const invalidPubKey = validPubkey.replace('0', '1');
        assert.isFalse(instance.unlock(invalidSig, validPubkey).verify({ inputSatoshis, tx }));
        assert.isFalse(instance.unlock(validSig, invalidPubKey).verify({ inputSatoshis, tx }));
      })

    })

  })

})
