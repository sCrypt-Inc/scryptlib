import { assert, expect } from 'chai';
import { loadDescription, newTx } from './helper';
import { buildContractClass, AbstractContract, TxContext, VerifyResult } from '../src/contract';
import { FunctionCall } from '../src/abi';
import { bsv, signTx, toHex } from '../src/utils';
import { Sig, PubKey, Ripemd160 } from '../src/scryptTypes';

const privateKey = new bsv.PrivateKey.fromRandom('testnet');
const publicKey = privateKey.publicKey;
const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());
const inputSatoshis = 100000;
const tx = newTx(inputSatoshis);
const txContext = { inputSatoshis, tx };

const jsonDescr = loadDescription('p2pkh.scrypt');

describe('buildContractClass()', () => {

  const DemoP2PKH = buildContractClass(jsonDescr);

  it('should return a reflected contract class object', () => {
    assert.typeOf(DemoP2PKH, 'function');
    assert.deepEqual(DemoP2PKH.abi, jsonDescr.abi);
    assert.deepEqual(DemoP2PKH.asm, jsonDescr.asm);
  })

  describe('instance of the returned contract class', () => {

    let instance: any;
    let sig: any;
    let unlockingScriptASM: string;
    let result: VerifyResult;

    beforeEach(() => {
      instance = new DemoP2PKH(new Ripemd160(toHex(pubKeyHash)));
      sig = signTx(tx, privateKey, instance.lockingScript.toASM(), inputSatoshis);
      unlockingScriptASM = [toHex(sig), toHex(publicKey)].join(' ');
    })

    it('should be an instance of AbstractContract', () => {
      assert.instanceOf(instance, AbstractContract);
    })

    describe('.codePart', () => {
      it('should return the partial locking script (the part before op_return) of the contract', () => {
        const lsBeforeAddDataLoad = instance.lockingScript;

        assert.equal(instance.codePart.toASM(), lsBeforeAddDataLoad.toASM() + ' OP_RETURN'); // without op_return data, they should be the same

        instance.setDataPart('aa');
        const lsAfterAddDataLoad = instance.lockingScript; // locking script changed after adding op_return

        assert.equal(instance.codePart.toASM(), lsBeforeAddDataLoad.toASM() + ' OP_RETURN');
        assert.equal(instance.codePart.toHex(), lsBeforeAddDataLoad.toHex()+'6a');

        assert.equal(instance.codePart.toASM() + ' aa', lsAfterAddDataLoad.toASM());
        assert.equal(instance.codePart.toHex() + '01aa', lsAfterAddDataLoad.toHex());
        
        assert.equal(instance.codePart.toASM(), `OP_NOP ${toHex(pubKeyHash)} 0 OP_1 OP_PICK OP_1 OP_ROLL OP_DROP OP_NOP OP_2 OP_PICK OP_HASH160 OP_1 OP_PICK OP_EQUAL OP_VERIFY OP_3 OP_PICK OP_3 OP_PICK OP_CHECKSIG OP_NIP OP_NIP OP_NIP OP_NIP OP_RETURN`);
        assert.equal(instance.codePart.toHex(), `6114${toHex(pubKeyHash)}005179517a75615279a95179876953795379ac777777776a`);
      })
    })

    describe('.dataPart', () => {
      describe('when dataPart is unset', () => {
        it('should return undefined', () => {
          assert.isUndefined(instance.dataPart);
        })
      })

      describe('when dataPart is to be set using setter', () => {
        it('should throw', () => {
          expect(() => { instance.dataPart = 'FF' }).to.throw('Setter for dataPart is not available. Please use: setDataPart() instead');
        })
      })

      describe('when dataPart is set', () => {
        it('should return the partial locking script (the part before op_return) of the contract', () => {
          instance.setDataPart('aa');
          assert.equal(instance.dataPart.toASM(), 'aa');
          assert.equal(instance.dataPart.toHex(), '01aa');
        })
      })
    })

    describe('.lockingScript', () => {
      it('should return the whole locking script of the contract', () => {
        // when op_return is non-existent
        assert.equal(instance.lockingScript.toASM() + ' OP_RETURN', instance.codePart.toASM());
        assert.equal(instance.lockingScript.toHex() + '6a', instance.codePart.toHex());

        // when op_return is exist
        instance.setDataPart('aa');
        assert.equal(instance.lockingScript.toASM(), instance.codePart.toASM() + ' ' + instance.dataPart.toASM());
        assert.equal(instance.lockingScript.toHex(), instance.codePart.toHex() + instance.dataPart.toHex());
      })
    })

    describe('run_verify()', () => {
      it('should return true if all arguments are correct', () => {
        // use param txContext as the context
        result = instance.run_verify(unlockingScriptASM, txContext);
        assert.isTrue(result.success, result.error);

        // use instance.txContxt as the context
        instance.txContext = txContext;
        result = instance.run_verify(unlockingScriptASM);
        assert.isTrue(result.success, result.error);
        instance.txContext = undefined;
      })

      it('should fail if param `unlockingScript` is incorrect', () => {
        result = instance.run_verify(unlockingScriptASM + '00', txContext);
        assert.isFalse(result.success, result.error);
      })

      it('should fail if param `txContext` is incorrect', () => {
        // emtpy txContext
        result = instance.run_verify(unlockingScriptASM);
        assert.isFalse(result.success, result.error);

        // incorrect inputSatoshis
        result = instance.run_verify(unlockingScriptASM, Object.assign({}, txContext, { inputSatoshis: inputSatoshis + 1 }));
        assert.isFalse(result.success, result.error);
      })
    })

    it("should have all public functions of the contract mapped to instance's methods", () => {
      assert.typeOf(instance.unlock, 'function');
    })

    describe("when the mapped-method being invoked", () => {

      it("should return FunctionCall type object which could be transformed to unlocking script", () => {
        const functionCall = instance.unlock(new Sig(toHex(sig)), new PubKey(toHex(publicKey)));
        assert.instanceOf(functionCall, FunctionCall);
        assert.equal(functionCall.toASM(), unlockingScriptASM);
        assert.equal(functionCall.toHex(), bsv.Script.fromASM(unlockingScriptASM).toHex());
      })

      it('the returned object can be verified whether it could unlock the contract', () => {
        // can unlock contract if params are correct
        const validSig = toHex(sig);
        const validPubkey = toHex(publicKey);
        result = instance.unlock(new Sig(validSig), new PubKey(validPubkey)).verify({ inputSatoshis, tx });
        assert.isTrue(result.success, result.error);
        instance.unlock(new Sig(validSig), new PubKey(validPubkey)).verify({ inputSatoshis, tx })
        assert.isTrue(result.success, result.error);

        // can not unlock contract if any param is incorrect
        const invalidSig = validSig.replace('1', '0');
        const invalidPubKey = validPubkey.replace('0', '1');
        result = instance.unlock(new Sig(invalidSig), new PubKey(validPubkey)).verify({ inputSatoshis, tx })
        assert.isFalse(result.success, result.error);
        result = instance.unlock(new Sig(validSig), new PubKey(invalidPubKey)).verify({ inputSatoshis, tx })
        assert.isFalse(result.success, result.error);
      })

    })

  })

})
