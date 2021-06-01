import { assert, expect } from 'chai';
import { loadDescription, newTx } from './helper';
import {
  buildContractClass,
  AbstractContract,
  VerifyResult,
} from '../src/contract';
import { FunctionCall } from '../src/abi';
import { bsv, signTx, toHex } from '../src/utils';
import { Sig, PubKey, Ripemd160 } from '../src/scryptTypes';

const privateKey = bsv.PrivateKey.fromRandom('testnet');
const publicKey = privateKey.publicKey;
const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());
const inputSatoshis = 100000;
const tx = newTx(inputSatoshis);
const txContext = { inputSatoshis, tx };

const jsonDescr = loadDescription('p2pkh_desc.json');

describe('simple scrypt', () => {
  describe('new instance', () => {
    const Simple = buildContractClass(loadDescription('simple_desc.json'));

    let instance: any;
    let result: VerifyResult;

    beforeEach(() => {
      instance = new Simple();
      const asmVars = {
        'Simple.equalImpl.x': 'OP_11',
      };
      instance.replaceAsmVars(asmVars);
    });

    it('should be an instance of AbstractContract', () => {
      assert.instanceOf(instance, AbstractContract);
    });

    it('the returned object can be verified whether it could unlock the contract', () => {
      // can unlock contract if params are correct
      result = instance.main(2, 4).verify({ inputSatoshis, tx });
      assert.isTrue(result.success, result.error);
      result = instance.main(3, 3).verify({ inputSatoshis, tx });
      assert.isTrue(result.success, result.error);

      // can not unlock contract if any param is incorrect
      result = instance.main(2, 3).verify({ inputSatoshis, tx });
      assert.isFalse(result.success, result.error);
      result = instance.main(3, 4).verify({ inputSatoshis, tx });
      assert.isFalse(result.success, result.error);
    });
  });
});

describe('create instance from UTXO Hex', () => {
  const Simple = buildContractClass(loadDescription('simple_desc.json'));

  let instance: any;
  let result: VerifyResult;

  beforeEach(() => {
    const simple = new Simple();
    const asmVars = {
      'Simple.equalImpl.x': 'OP_11',
    };
    simple.replaceAsmVars(asmVars);

    //create instance from an exist script
    instance = Simple.fromHex(simple.lockingScript.toHex());
  });

  it('should be an instance of AbstractContract', () => {
    assert.instanceOf(instance, AbstractContract);
  });

  it('the returned object can be verified whether it could unlock the contract', () => {
    // can unlock contract if params are correct
    result = instance.main(2, 4).verify({ inputSatoshis, tx });
    assert.isTrue(result.success, result.error);
    result = instance.main(3, 3).verify({ inputSatoshis, tx });
    assert.isTrue(result.success, result.error);
    result = instance.equal(11).verify();
    assert.isTrue(result.success, result.error);

    // can not unlock contract if any param is incorrect
    result = instance.main(2, 3).verify({ inputSatoshis, tx });
    assert.isFalse(result.success, result.error);
    result = instance.main(3, 4).verify({ inputSatoshis, tx });
    assert.isFalse(result.success, result.error);
    result = instance.equal(12).verify();
    assert.isFalse(result.success, result.error);
  });
});

describe('buildContractClass and create instance from script', () => {
  const DemoP2PKH = buildContractClass(jsonDescr);
  const ASMDemoP2PKH = buildContractClass(jsonDescr, true);

  describe('instance from an exist script ', () => {
    let instance: any;
    let sig: any;
    let unlockingScriptASM: string;
    let result: VerifyResult;

    beforeEach(() => {
      const p2pkh = new DemoP2PKH(new Ripemd160(toHex(pubKeyHash)));
      //create instance from an exist script
      instance = ASMDemoP2PKH.fromHex(p2pkh.lockingScript.toHex());
      sig = signTx(
        tx,
        privateKey,
        instance.lockingScript.toASM(),
        inputSatoshis
      );
      unlockingScriptASM = [toHex(sig), toHex(publicKey)].join(' ');
    });

    it('static getAsmVars method', () => {
      let lockingScriptAsm = instance.lockingScript.toASM();
      let asmVars = ASMDemoP2PKH.getAsmVars(jsonDescr.asm, lockingScriptAsm);

      expect(asmVars).is.not.null;
      expect(asmVars).have.key('pubKeyHash');
      expect(asmVars['pubKeyHash']).is.eql(toHex(pubKeyHash));
    });

    it('should have an asm var', () => {
      expect(instance.asmVars).is.not.null;
      expect(instance.asmVars).have.key('pubKeyHash');
      expect(instance.asmVars['pubKeyHash']).is.eql(toHex(pubKeyHash));
    });

    it('should be an instance of AbstractContract', () => {
      assert.instanceOf(instance, AbstractContract);
    });

    describe('.codePart', () => {
      it('should return the partial locking script (the part before op_return) of the contract', () => {
        const lsBeforeAddDataLoad = instance.lockingScript;

        assert.equal(
          instance.codePart.toASM(),
          lsBeforeAddDataLoad.toASM() + ' OP_RETURN'
        ); // without op_return data, they should be the same

        instance.setDataPart('aa');
        const lsAfterAddDataLoad = instance.lockingScript; // locking script changed after adding op_return

        assert.equal(
          instance.codePart.toASM(),
          lsBeforeAddDataLoad.toASM() + ' OP_RETURN'
        );
        assert.equal(
          instance.codePart.toHex(),
          lsBeforeAddDataLoad.toHex() + '6a'
        );

        assert.equal(
          instance.codePart.toASM() + ' aa',
          lsAfterAddDataLoad.toASM()
        );
        assert.equal(
          instance.codePart.toHex() + '01aa',
          lsAfterAddDataLoad.toHex()
        );

        assert.equal(
          instance.codePart.toASM(),
          `OP_NOP 0 ${toHex(
            pubKeyHash
          )} 0 OP_PICK OP_2 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_NOP OP_1 OP_PICK OP_HASH160 OP_1 OP_PICK OP_EQUAL OP_VERIFY OP_2 OP_PICK OP_2 OP_PICK OP_CHECKSIG OP_NIP OP_NIP OP_NIP OP_RETURN`
        );
        assert.equal(
          instance.codePart.toHex(),
          `610014${toHex(
            pubKeyHash
          )}0079527a75517a75615179a95179876952795279ac7777776a`
        );
      });
    });

    describe('.dataPart', () => {
      describe('when dataPart is unset', () => {
        it('should return undefined', () => {
          assert.isUndefined(instance.dataPart);
        });
      });

      describe('when dataPart is to be set using setter', () => {
        it('should throw', () => {
          expect(() => {
            instance.dataPart = 'FF';
          }).to.throw(
            'Setter for dataPart is not available. Please use: setDataPart() instead'
          );
        });
      });

      describe('when dataPart is set', () => {
        it('should return the partial locking script (the part before op_return) of the contract', () => {
          instance.setDataPart('aa');
          assert.equal(instance.dataPart.toASM(), 'aa');
          assert.equal(instance.dataPart.toHex(), '01aa');
        });
      });
    });

    describe('.lockingScript', () => {
      it('should return the whole locking script of the contract', () => {
        // when op_return is non-existent
        assert.equal(
          instance.lockingScript.toASM() + ' OP_RETURN',
          instance.codePart.toASM()
        );
        assert.equal(
          instance.lockingScript.toHex() + '6a',
          instance.codePart.toHex()
        );

        // when op_return is exist
        instance.setDataPart('aa');
        assert.equal(
          instance.lockingScript.toASM(),
          instance.codePart.toASM() + ' ' + instance.dataPart.toASM()
        );
        assert.equal(
          instance.lockingScript.toHex(),
          instance.codePart.toHex() + instance.dataPart.toHex()
        );
      });
    });

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
      });

      it('should fail if param `unlockingScript` is incorrect', () => {
        result = instance.run_verify(unlockingScriptASM + '00', txContext);
        assert.isFalse(result.success, result.error);
      });

      it('should fail if param `txContext` is incorrect', () => {
        // emtpy txContext
        result = instance.run_verify(unlockingScriptASM);
        assert.isFalse(result.success, result.error);

        // incorrect inputSatoshis
        result = instance.run_verify(
          unlockingScriptASM,
          Object.assign({}, txContext, { inputSatoshis: inputSatoshis + 1 })
        );
        assert.isFalse(result.success, result.error);
      });
    });

    it("should have all public functions of the contract mapped to instance's methods", () => {
      assert.typeOf(instance.unlock, 'function');
    });

    describe('when the mapped-method being invoked', () => {
      it('should return FunctionCall type object which could be transformed to unlocking script', () => {
        const functionCall = instance.unlock(
          new Sig(toHex(sig)),
          new PubKey(toHex(publicKey))
        );
        assert.instanceOf(functionCall, FunctionCall);
        assert.equal(functionCall.toASM(), unlockingScriptASM);
        assert.equal(
          functionCall.toHex(),
          bsv.Script.fromASM(unlockingScriptASM).toHex()
        );
      });

      it('the returned object can be verified whether it could unlock the contract', () => {
        // can unlock contract if params are correct
        const validSig = toHex(sig);
        const validPubkey = toHex(publicKey);
        result = instance
          .unlock(new Sig(validSig), new PubKey(validPubkey))
          .verify({ inputSatoshis, tx });
        assert.isTrue(result.success, result.error);
        instance
          .unlock(new Sig(validSig), new PubKey(validPubkey))
          .verify({ inputSatoshis, tx });
        assert.isTrue(result.success, result.error);

        // can not unlock contract if any param is incorrect
        const invalidSig = validSig.replace('1', '0');
        const invalidPubKey = validPubkey.replace('0', '1');
        result = instance
          .unlock(new Sig(invalidSig), new PubKey(validPubkey))
          .verify({ inputSatoshis, tx });
        assert.isFalse(result.success, result.error);
        result = instance
          .unlock(new Sig(validSig), new PubKey(invalidPubKey))
          .verify({ inputSatoshis, tx });
        assert.isFalse(result.success, result.error);
      });
    });
  });
});
