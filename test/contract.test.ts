import { assert, expect } from 'chai';
import { newTx, loadArtifact } from './helper';
import { buildContractClass, AbstractContract, TxContext, VerifyResult } from '../src/contract';
import { FunctionCall } from '../src/abi';
import { bsv, signTx } from '../src/utils';
import { Sig, PubKey, Ripemd160 } from '../src/scryptTypes';
import { toHex } from '../src';

const privateKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet);
const publicKey = privateKey.toPublicKey();
const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());
const inputSatoshis = 100000;
const tx = newTx(inputSatoshis);
const txContext: TxContext = { inputSatoshis, tx, inputIndex: 0 };

const jsonArtifact = loadArtifact('p2pkh.json');

const cointossArtifact = loadArtifact('cointoss.json');

describe('check explicit  constructor()', () => {

  const DemoP2PKH = buildContractClass(jsonArtifact);

  it('should throw when wrong number of arguments: constructor function', () => {

    expect(() => {
      new DemoP2PKH();
    }).to.throws(/wrong number of arguments for \'DemoP2PKH\.constructor\', expected 1 but got 0/);
  })


  it('should throw when wrong type of arguments', () => {

    expect(() => {
      new DemoP2PKH(1n);
    }).to.throws(/The type of pubKeyHash is wrong, expected Ripemd160 but got int/);
  })

  it('should throw when wrong number of arguments: public function', () => {

    expect(() => {
      let demo = new DemoP2PKH(Ripemd160('00'));
      demo.unlock(1).verify();
    }).to.throws(/wrong number of arguments for \'DemoP2PKH\.unlock\', expected 2 but got 1/);
  })
})


describe('check implicit   constructor()', () => {

  const Cointoss = buildContractClass(cointossArtifact);

  it('should throw when wrong number of arguments', () => {

    expect(() => {
      new Cointoss();
    }).to.throws(/wrong number of arguments for \'CoinToss\.constructor\', expected 5 but got 0/);
  })


  it('should throw when wrong type of arguments', () => {

    expect(() => {
      new Cointoss(1n, 1n, 1n, 1n, 1n);
    }).to.throws(/The type of alice is wrong, expected PubKey but got int/);
  })
})

describe('buildContractClass()', () => {

  const DemoP2PKH = buildContractClass(jsonArtifact);

  it('should return a reflected contract class object', () => {
    assert.typeOf(DemoP2PKH, 'function');
    assert.deepEqual(DemoP2PKH.abi, jsonArtifact.abi);
    assert.deepEqual(DemoP2PKH.hex, jsonArtifact.hex);
  })

  describe('instance of the returned contract class', () => {

    let instance: AbstractContract;
    let unlockingScriptASM: string;
    let result: VerifyResult;
    let sig: string;

    beforeEach(() => {
      instance = new DemoP2PKH(Ripemd160(toHex(pubKeyHash)));
      sig = signTx(tx, privateKey, instance.lockingScript, inputSatoshis);
      unlockingScriptASM = [sig, toHex(publicKey)].join(' ');
    })

    it("test arguments", () => {
      expect(instance.ctorArgs()).to.deep.include.members([{
        name: "pubKeyHash",
        type: "Ripemd160",
        value: Ripemd160(toHex(pubKeyHash))
      }]);
      expect(instance.arguments('unlock')).to.deep.equal([]);
    })

    it('static getAsmVars method', () => {
      let asmVars = DemoP2PKH.getAsmVars(instance.lockingScript.toHex())

      expect(asmVars).is.empty;
    })

    it('should have an asm var', () => {
      expect(instance.asmVars).is.empty;
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
        assert.equal(instance.codePart.toHex(), lsBeforeAddDataLoad.toHex() + '6a');

        assert.equal(instance.codePart.toASM() + ' aa', lsAfterAddDataLoad.toASM());
        assert.equal(instance.codePart.toHex() + '01aa', lsAfterAddDataLoad.toHex());

        assert.equal(instance.codePart.toASM(), `0 ${toHex(pubKeyHash)} OP_NOP 0 OP_PICK OP_2 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_NOP OP_1 OP_PICK OP_HASH160 OP_1 OP_PICK OP_EQUAL OP_VERIFY OP_2 OP_PICK OP_2 OP_PICK OP_CHECKSIG OP_NIP OP_NIP OP_NIP OP_RETURN`);
        assert.equal(instance.codePart.toHex(), `0014${toHex(pubKeyHash)}610079527a75517a75615179a95179876952795279ac7777776a`);
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
          expect(() => { instance.dataPart = bsv.Script.fromHex('FF') }).to.throw('Setter for dataPart is not available. Please use: setDataPart() instead');
        })
      })

      describe('when dataPart is set', () => {
        it('should return the partial locking script (the part before op_return) of the contract', () => {
          instance.setDataPart('aa');
          assert.equal(instance.dataPart?.toASM(), 'aa');
          assert.equal(instance.dataPart?.toHex(), '01aa');
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
        assert.equal(instance.lockingScript.toASM(), instance.codePart.toASM() + ' ' + instance.dataPart?.toASM());
        assert.equal(instance.lockingScript.toHex(), instance.codePart.toHex() + instance.dataPart?.toHex());
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

        expect(() => {
          instance.run_verify(unlockingScriptASM);
        }).to.throw(/should provide txContext.tx when verify/)

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
        const functionCall = instance.unlock(Sig(sig), PubKey(toHex(publicKey)));
        assert.instanceOf(functionCall, FunctionCall);
        assert.equal(functionCall.toASM(), unlockingScriptASM);
        assert.equal(functionCall.toHex(), bsv.Script.fromASM(unlockingScriptASM).toHex());
      })

      it('the returned object can be verified whether it could unlock the contract', () => {
        // can unlock contract if params are correct
        const validPubkey = toHex(publicKey);
        result = instance.unlock(Sig(sig), PubKey(validPubkey)).verify({ inputSatoshis, tx });
        assert.isTrue(result.success, result.error);

        expect(instance.arguments('unlock')).to.deep.equal([
          {
            name: 'sig',
            type: 'Sig',
            value: Sig(sig)
          },
          {
            name: 'pubKey',
            type: 'PubKey',
            value: PubKey(validPubkey)
          }
        ]);

        instance.unlock(Sig(sig), PubKey(validPubkey)).verify({ inputSatoshis, tx })
        assert.isTrue(result.success, result.error);

        // can not unlock contract if any param is incorrect
        const invalidSig = sig.replace('1', '0');
        const invalidPubKey = validPubkey.replace('0', '1');
        result = instance.unlock(Sig(invalidSig), PubKey(validPubkey)).verify({ inputSatoshis, tx })

        // arguments should be corresponding to the lastest call
        expect(instance.arguments('unlock')).to.deep.equal([
          {
            name: 'sig',
            type: 'Sig',
            value: Sig(invalidSig)
          },
          {
            name: 'pubKey',
            type: 'PubKey',
            value: PubKey(validPubkey)
          }
        ]);

        assert.isFalse(result.success, result.error);
        result = instance.unlock(Sig(sig), PubKey(invalidPubKey)).verify({ inputSatoshis, tx })
        assert.isFalse(result.success, result.error);
      })

    })

  })

})
