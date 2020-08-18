import { assert } from 'chai';
import { loadDescription, newTx } from './helper';
import { buildContractClass, AbstractContract, TxContext } from '../src/contract';
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

        assert.equal(instance.codePart.toASM(), lsBeforeAddDataLoad.toASM()); // without op_return data, they should be the same

        instance.dataLoad = 'aa';
        const lsAfterAddDataLoad = instance.lockingScript; // locking script changed after adding op_return

        assert.equal(instance.codePart.toASM(), lsBeforeAddDataLoad.toASM());
        assert.equal(instance.codePart.toHex(), lsBeforeAddDataLoad.toHex());

        assert.equal(instance.codePart.toASM() + ' OP_RETURN aa', lsAfterAddDataLoad.toASM());
        assert.equal(instance.codePart.toHex() + '6a01aa', lsAfterAddDataLoad.toHex());
        
        assert.equal(instance.codePart.toASM(), `OP_1 40 00 51 b1 b2 OP_NOP ${toHex(pubKeyHash)} 0 OP_1 OP_PICK OP_1 OP_ROLL OP_DROP OP_NOP OP_8 OP_PICK OP_HASH160 OP_1 OP_PICK OP_EQUAL OP_VERIFY OP_9 OP_PICK OP_9 OP_PICK OP_CHECKSIG OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP`);
        assert.equal(instance.codePart.toHex(), `5101400100015101b101b26114${toHex(pubKeyHash)}005179517a75615879a95179876959795979ac77777777777777777777`);
      })
    })

    describe('.dataPart', () => {
      describe('when dataLoad is unset', () => {
        it('should return undefined', () => {
          assert.isUndefined(instance.dataPart);
        })
      })

      describe('when dataLoad is set', () => {
        it('should return the partial locking script (the part before op_return) of the contract', () => {
          instance.dataLoad = 'aa';
          assert.equal(instance.dataPart.toASM(), 'aa');
          assert.equal(instance.dataPart.toHex(), '01aa');
        })
      })
    })

    describe('.lockingScript', () => {
      it('should return the whole locking script of the contract', () => {
        // when op_return is non-exist
        assert.equal(instance.lockingScript.toASM(), instance.codePart.toASM());
        assert.equal(instance.lockingScript.toHex(), instance.codePart.toHex());

        // when op_return is exist
        instance.dataLoad = 'aa';
        assert.equal(instance.lockingScript.toASM(), instance.codePart.toASM() + ' OP_RETURN ' + instance.dataPart.toASM());
        assert.equal(instance.lockingScript.toHex(), instance.codePart.toHex() + '6a' + instance.dataPart.toHex());
      })
    })

    describe('run_verify()', () => {
      it('should return true if all arguments are correct', () => {
        // use param txContext as the context
        assert.isTrue(instance.run_verify(unlockingScriptASM, txContext));

        // use instance.txContxt as the context
        instance.txContext = txContext;
        assert.isTrue(instance.run_verify(unlockingScriptASM));
        instance.txContext = undefined;
      })

      it('should throw error if param `unlockingScript` is incorrect', () => {
        assert.throws(() => { instance.run_verify(unlockingScriptASM + '00', txContext) });
      })

      it('should throw error if param `txContext` is incorrect', () => {
        // emtpy txContext
        assert.throws(() => { instance.run_verify(unlockingScriptASM) });

        // incorrect inputSatoshis
        assert.throws(() => { instance.run_verify(unlockingScriptASM, Object.assign({}, txContext, { inputSatoshis: inputSatoshis + 1 })) });
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
        assert.isTrue(instance.unlock(new Sig(validSig), new PubKey(validPubkey)).verify({ inputSatoshis, txHex: toHex(tx) }));
        assert.isTrue(instance.unlock(new Sig(validSig), new PubKey(validPubkey)).verify({ inputSatoshis, tx }));

        // can not unlock contract if any param is incorrect
        const invalidSig = validSig.replace('1', '0');
        const invalidPubKey = validPubkey.replace('0', '1');
        assert.throws(() => { instance.unlock(new Sig(invalidSig), new PubKey(validPubkey)).verify({ inputSatoshis, tx }) })
        assert.throws(() => { instance.unlock(new Sig(validSig), new PubKey(invalidPubKey)).verify({ inputSatoshis, tx }) })
      })

    })

  })

})
