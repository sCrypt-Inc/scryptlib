import { assert, expect } from 'chai';
import { newTx, loadArtifact } from './helper';
import { FunctionCall } from '../src/abi';
import { buildContractClass, VerifyResult } from '../src/contract';
import { bsv, signTx, toHex } from '../src/utils';
import { PubKey, Sig, Ripemd160, Sha256 } from '../src/scryptTypes';

const privateKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet);
const publicKey = privateKey.publicKey;
const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());
const inputSatoshis = 100000;
const tx = newTx(inputSatoshis);

const jsonArtifact = loadArtifact('p2pkh.json');
const DemoP2PKH = buildContractClass(jsonArtifact);
const p2pkh = new DemoP2PKH(Ripemd160(toHex(pubKeyHash)));

const personArtifact = loadArtifact('person.json');
const PersonContract = buildContractClass(personArtifact);


let man = {
  isMale: false,
  age: 33n,
  addr: "68656c6c6f20776f726c6421"
};

let block = {
  time: 33n,
  header: "68656c6c6f20776f726c6421",
  hash: "68656c6c6f20776f726c6421"
};

const person = new PersonContract(man, 18n);

describe('FunctionCall', () => {

  let target: FunctionCall;
  let result: VerifyResult;

  describe('when it is the contract constructor', () => {

    before(() => {
      target = new FunctionCall('constructor', {
        contract: p2pkh, lockingScript: p2pkh.lockingScript, args: [{
          name: 'pubKeyHash',
          type: 'Ripemd160',
          value: Ripemd160(toHex(pubKeyHash))
        }
        ]
      });
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
  })

  describe('when it is a contract public function', () => {

    let sig: Sig;
    let pubkey: PubKey;

    before(() => {
      sig = Sig(signTx(tx, privateKey, p2pkh.lockingScript, inputSatoshis));
      pubkey = PubKey(toHex(publicKey));
      target = new FunctionCall('unlock', {
        contract: p2pkh, unlockingScript: bsv.Script.fromASM([sig, pubkey].join(' ')), args: [{
          name: 'sig',
          type: 'Sig',
          value: sig
        }, {
          name: 'pubkey',
          type: 'PubKey',
          value: pubkey
        }]
      });
    })

    describe('toHex() / toString()', () => {
      it('should return the unlocking script in hex', () => {
        assert.equal(target.toHex(), bsv.Script.fromASM(target.toASM()).toHex());
      })
    })

    describe('check abiParams', () => {
      it('abiParams should be correct', () => {
        expect(target.args).to.deep.include.members([{
          name: 'sig',
          type: 'Sig',
          value: sig
        }, {
          name: 'pubkey',
          type: 'PubKey',
          value: pubkey
        }])
      })
    })

    describe('toASM()', () => {
      it('should return the unlocking script in ASM', () => {
        assert.equal(target.toASM(), [sig, pubkey].join(' '));
      })
    })

    describe('verify()', () => {
      it('should return true if params are appropriate', () => {
        // has no txContext in binding contract
        result = target.verify({ inputSatoshis, tx, inputIndex: 0 });
        assert.isTrue(result.success, result.error);

        // has txContext in binding contract
        p2pkh.txContext = { inputSatoshis, tx, inputIndex: 0 };
        result = target.verify();
        assert.isTrue(result.success, result.error);
        p2pkh.txContext = undefined;
      })

      it('should fail if param `inputSatoshis` is incorrect', () => {
        result = target.verify({ inputSatoshis: inputSatoshis + 1, tx, inputIndex: 0 });
        assert.isFalse(result.success, result.error);
        result = target.verify({ inputSatoshis: inputSatoshis - 1, tx, inputIndex: 0 });
        assert.isFalse(result.success, result.error);
      })

      it('should fail if param `txContext` is incorrect', () => {
        // missing txContext
        expect(() => {
          target.verify()
        }).to.throw('should provide txContext.tx when verify')

        // incorrect txContext.tx
        tx.nLockTime = tx.nLockTime + 1;
        result = target.verify({ inputSatoshis, tx, inputIndex: 0 });
        assert.isFalse(result.success, result.error);
        tx.nLockTime = tx.nLockTime - 1;  //reset
      })
    })
  })


  describe('when constructor with struct', () => {

    before(() => {
      target = new FunctionCall('constructor', {
        contract: person, lockingScript: person.lockingScript, args: [{
          name: 'some',
          type: 'Person',
          value: {
            isMale: false,
            age: 33n,
            addr: "68656c6c6f20776f726c6421"
          }
        }]
      });
    })

    describe('toHex() / toString()', () => {
      it('should return the locking script in hex', () => {
        assert.equal(target.toHex(), person.lockingScript.toHex());
      })
    })

    describe('toASM()', () => {
      it('should return the locking script in ASM', () => {
        assert.equal(target.toASM(), person.lockingScript.toASM());
      })
    })
  })



  describe('when it is a contract public function with struct', () => {


    it('should return true when age 10', () => {

      let result = person.main(man, 10n, false).verify()

      assert.isTrue(result.success, result.error);
    })


    it('should return false when age 36', () => {

      let result = person.main(man, 36n, false).verify()

      assert.isFalse(result.success, result.error);
    })

    it('should return false when isMale true', () => {

      let result = person.main(man, 18n, true).verify()

      assert.isFalse(result.success, result.error);
    })

  })

  describe('struct member check', () => {

    it('should throw with wrong members', () => {
      expect(() => {
        person.main({
          age: 14n,
          addr: "68656c6c6f20776f726c6421"
        }, 18n, true)
      }).to.throw('The type of p is wrong, expected Person but missing member [isMale]');
    })

    it('should throw with wrong members', () => {
      expect(() => {
        person.main({
          isMale: false,
          age: 13n
        }, 18n, true)
      }).to.throw('The type of p is wrong, expected Person but missing member [addr]');
    })

    it('should throw with wrong members', () => {
      expect(() => {
        person.main({
          weight: 100n,
          isMale: false,
          age: 13n,
          addr: "68656c6c6f20776f726c6421"
        }, 18n, true)
      }).to.throw('The type of p is wrong, expected Person but redundant member [weight] appears');
    })

    it('should throw with wrong members type', () => {
      expect(() => {
        person.main({
          isMale: 11n,
          age: 14n,
          addr: "68656c6c6f20776f726c6421"
        }, 18n, true)
      }).to.throw('The type of isMale is wrong, expected bool but got int');
    })

  })


  describe('struct type check', () => {

    it('should throw with wrong struct type', () => {
      expect(() => { person.main(block, 18, true) }).to.throw('The type of p is wrong, expected Person but missing member [addr]');
    })

    it('should throw with wrong struct type', () => {
      expect(() => { new PersonContract(block, 18n) }).to.throw('The type of some is wrong, expected Person but missing member [addr]');
    })
  })

})

describe('ABICoder', () => {

  describe('encodeConstructorCall()', () => {
    describe('when contract has explict constructor', () => {
      it('encodeConstructorCall RegExp replace error fix issue #86', () => {

        const DemoCoinToss = buildContractClass(loadArtifact('cointoss.json'));
        let demoCoinToss = new DemoCoinToss(
          PubKey("034e1f55a9eeec718a19741a04005a87c90de32be5356eb3711905aaf2c9cee281"),
          PubKey("039671758bb8190eaf4c5b03a424c27012aaee0bc9ee1ce19d711b201159cf9fc2"),
          Sha256("bfdd565761a74bd95110da480a45e3b408a43aff335473134ef3074637ecbae1"),
          Sha256("d806b80dd9e76ef5d6be50b6e5c8a54a79fa05d3055f452e5d91e4792f790e0b"),
          555n
        );

        expect(demoCoinToss.lockingScript.toASM()).to.be.contain('034e1f55a9eeec718a19741a04005a87c90de32be5356eb3711905aaf2c9cee281 039671758bb8190eaf4c5b03a424c27012aaee0bc9ee1ce19d711b201159cf9fc2 bfdd565761a74bd95110da480a45e3b408a43aff335473134ef3074637ecbae1 d806b80dd9e76ef5d6be50b6e5c8a54a79fa05d3055f452e5d91e4792f790e0b 2b02')

      })


      it('encodeConstructorCall RegExp replace error fix issue #86', () => {

        const MultiSig = buildContractClass(loadArtifact('multiSig.json'));
        let multiSig = new MultiSig([Ripemd160("2f87fe26049415441f024eb134ce54bbafd78e96"), Ripemd160("9e0ad5f79a7a91cce4f36ebeb6c0d392001683e9"), Ripemd160("58ddca9a92ebf90edf505a172fcef1197b376f5d")]);

        expect(multiSig.lockingScript.toASM()).to.be.contain('2f87fe26049415441f024eb134ce54bbafd78e96 9e0ad5f79a7a91cce4f36ebeb6c0d392001683e9 58ddca9a92ebf90edf505a172fcef1197b376f5d')

      })

    })

    describe('when contract has no explict constructor', () => {
      it('should return FunctionCall object for contract constructor')
    })
  })

  describe('encodePubFunctionCall()', () => {
    it('should return FunctionCall object for contract public method')
  })
})




describe('string as bigInt', () => {



  describe('test DemoCoinToss', () => {

    const DemoCoinToss = buildContractClass(loadArtifact('cointoss.json'));
    it('test lockingScript', () => {

      let demoCoinToss = new DemoCoinToss(
        PubKey("034e1f55a9eeec718a19741a04005a87c90de32be5356eb3711905aaf2c9cee281"),
        PubKey("039671758bb8190eaf4c5b03a424c27012aaee0bc9ee1ce19d711b201159cf9fc2"),
        Sha256("bfdd565761a74bd95110da480a45e3b408a43aff335473134ef3074637ecbae1"),
        Sha256("d806b80dd9e76ef5d6be50b6e5c8a54a79fa05d3055f452e5d91e4792f790e0b"),
        555555555555555555555555555555555555555555555555n
      );

      expect(demoCoinToss.lockingScript.toASM()).to.be.contain('034e1f55a9eeec718a19741a04005a87c90de32be5356eb3711905aaf2c9cee281 039671758bb8190eaf4c5b03a424c27012aaee0bc9ee1ce19d711b201159cf9fc2 bfdd565761a74bd95110da480a45e3b408a43aff335473134ef3074637ecbae1 d806b80dd9e76ef5d6be50b6e5c8a54a79fa05d3055f452e5d91e4792f790e0b e3388ee3388e402a180d5bc55a1a09cf02f94f61')

    })

    describe('test Demo', () => {
      const Demo = buildContractClass(loadArtifact('demo.json'));
      it('test demo', () => {


        function expectDemo(demo) {
          let result = demo.add(200000000000000000000000000000000000000000000001n).verify()

          expect(result.success).to.be.true;

          result = demo.add(0x23084F676940B7915149BD08B30D000000000001n).verify()

          expect(result.success).to.be.true;


          result = demo.add(200000000000000000000000000000000000000000000001n).verify()

          expect(result.success).to.be.true;


          result = demo.add(200000000000000000000000000000000000000000000002n).verify()

          expect(result.success).to.be.false;


        }

        expectDemo(new Demo(
          100000000000000000000000000000000000000000000000n,
          100000000000000000000000000000000000000000000001n
        ))


        expectDemo(new Demo(
          100000000000000000000000000000000000000000000000n,
          100000000000000000000000000000000000000000000001n
        ))

      })

    })



    describe('test MDArray', () => {

      const jsonArtifact = loadArtifact('mdarray.json');
      const MDArray = buildContractClass(jsonArtifact);


      it('test lockingScript', () => {
        let mdArray = new MDArray([[
          [1n, 2n, 3n, 4n],
          [5n, 6n, 7n, 8n],
          [999999999999999999999999999999n, 10n, 11n, 12n]
        ],
        [
          [13n, 14n, 15n, 16n],
          [17n, 18n, 19n, 20n],
          [21n, 22n, 23n, 11111111111111111111111111111111111n]
        ]]);


        let mdArrayBigInt = new MDArray([[
          [1n, 2n, 3n, 4n],
          [5n, 6n, 7n, 8n],
          [999999999999999999999999999999n, 10n, 11n, 12n]
        ],
        [
          [13n, 14n, 15n, 16n],
          [17n, 18n, 19n, 20n],
          [21n, 22n, 23n, 11111111111111111111111111111111111n]
        ]]);


        expect(mdArray.lockingScript.toASM()).to.be.equal(mdArrayBigInt.lockingScript.toASM());
      })


      it('test unlockX', () => {
        let mdArray = new MDArray([[
          [1n, 2n, 3n, 4n],
          [5n, 6n, 7n, 8n],
          [999999999999999999999999999999n, 10n, 11n, 12n]
        ],
        [
          [13n, 14n, 15n, 16n],
          [17n, 18n, 19n, 20n],
          [21n, 22n, 23n, 11111111111111111111111111111111111n]
        ]]);



        let result = mdArray.unlockX([[
          [1n, 2n, 3n, 4n],
          [5n, 6n, 7n, 8n],
          [999999999999999999999999999999n, 10n, 11n, 12n]
        ],
        [
          [13n, 14n, 15n, 16n],
          [17n, 18n, 19n, 20n],
          [21n, 22n, 23n, 11111111111111111111111111111111111n]
        ]]).verify()


        expect(result.success).to.be.true;


        result = mdArray.unlockX([[
          [1n, 2n, 3n, 4n],
          [5n, 6n, 7n, 8n],
          [999999999999999999999999999999n, 10n, 11n, 12n]
        ],
        [
          [13n, 14n, 15n, 16n],
          [17n, 18n, 19n, 20n],
          [21n, 22n, 23n, 11111111111111111111111111111111111n]
        ]]).verify()
        expect(result.success).to.be.true;



        result = mdArray.unlockX([[
          [1n, 2n, 3n, 4n],
          [5n, 6n, 7n, 8n],
          [999999999999999999999999999998n, 10n, 11n, 12n]
        ],
        [
          [13n, 14n, 15n, 16n],
          [17n, 18n, 19n, 20n],
          [21n, 22n, 23n, 11111111111111111111111111111111111n]
        ]]).verify()
        expect(result.success).to.be.false;


        result = mdArray.unlockX([[
          [1n, 2n, 3n, 4n],
          [5n, 6n, 7n, 8n],
          [999999999999999999999999999999n, 10n, 11n, 12n]
        ],
        [
          [13n, 14n, 15n, 16n],
          [17n, 18n, 19n, 20n],
          [21n, 22n, 23n, 11111111111111111111111111111111110n]
        ]]).verify()
        expect(result.success).to.be.false;


      })




    })



    describe('test person.scrypt', () => {

      it('test lockingScript', () => {

        let person1 = ({
          isMale: false,
          age: 33333333333333333333333333333333333n,
          addr: "68656c6c6f20776f726c6421"
        });

        let person2 = ({
          isMale: false,
          age: 33333333333333333333333333333333333n,
          addr: "68656c6c6f20776f726c6421"
        });

        let main = new PersonContract(person1, 33333333333333333333333333333333333n);

        let mainBigIntStr = new PersonContract(person2, 33333333333333333333333333333333333n);

        expect(main.lockingScript.toASM()).to.be.equal(mainBigIntStr.lockingScript.toASM());
      })


      it('test equal', () => {

        let person1 = ({
          isMale: false,
          age: 33333333333333333333333333333333333n,
          addr: "68656c6c6f20776f726c6421"
        });

        let person2 = ({
          isMale: false,
          age: 33333333333333333333333333333333333n,
          addr: "68656c6c6f20776f726c6421"
        });

        let main = new PersonContract(person1, 33333333333333333333333333333333333n);


        let result = main.equal(person2).verify()
        expect(result.success).to.be.true;

        result = main.equal(person1).verify()
        expect(result.success).to.be.true;

        result = main.equal(({
          isMale: false,
          age: 33333333333333333333333333333333334n,
          addr: "68656c6c6f20776f726c6421"
        })).verify()
        expect(result.success).to.be.false;

      })


    })



    describe('test encodePubFunctionCallFromHex', () => {



      it('test encodePubFunctionCallFromHex: PersonContract.equal', () => {

        let person1 = ({
          isMale: false,
          age: 33333333333333333333333333333333333n,
          addr: "68656c6c6f20776f726c6421"
        });

        let person2 = ({
          isMale: false,
          age: 33333333333333333333333333333333333n,
          addr: "68656c6c6f20776f726c6421"
        });

        let main = new PersonContract(person1, 33333333333333333333333333333333333n);


        let funCall = main.equal(person2) as FunctionCall;

        let mainClone = PersonContract.fromHex(main.lockingScript.toHex());


        const funCallClone = PersonContract.abiCoder.encodePubFunctionCallFromHex(mainClone, funCall.unlockingScript?.toHex() || '');
        expect(funCallClone.methodName).to.equal('equal');

        main = new PersonContract(person1, 33333333333333333333333333333333333n);

        const result = funCallClone.verify()
        expect(result.success).to.be.true;

        assert.equal(funCallClone.unlockingScript?.toHex(), funCall.unlockingScript?.toHex())


        let funCallWrongArgs = main.equal(({
          isMale: false,
          age: 33333333333333333333333333333333334n,
          addr: "68656c6c6f20776f726c6421"
        })) as FunctionCall;


        const funCallCloneWrong = PersonContract.abiCoder.encodePubFunctionCallFromHex(mainClone, funCallWrongArgs.unlockingScript?.toHex() || '');
        expect(funCallCloneWrong.methodName).to.equal('equal');
        const result1 = funCallCloneWrong.verify()
        expect(result1.success).to.be.false;

      })



      it('test encodePubFunctionCallFromHex: DemoP2PKH.unlock', () => {

        const sig = signTx(tx, privateKey, p2pkh.lockingScript, inputSatoshis);
        const pubkey = PubKey(toHex(publicKey));

        let result = p2pkh.unlock(Sig(sig), pubkey).verify({ inputSatoshis, tx })

        expect(result.success).to.be.true;

        let funCall = p2pkh.unlock(Sig(sig), pubkey) as FunctionCall;

        let p2pkhClone = DemoP2PKH.fromHex(p2pkh.lockingScript.toHex());

        const funCallClone = DemoP2PKH.abiCoder.encodePubFunctionCallFromHex(p2pkhClone, funCall.unlockingScript?.toHex() || '');

        expect(funCallClone.methodName).to.equal('unlock');


        result = funCallClone.verify({ inputSatoshis, tx, inputIndex: 0 })

        expect(result.success).to.be.true;

        result = p2pkhClone.unlock(Sig(sig), pubkey).verify({ inputSatoshis, tx })

        expect(result.success).to.be.true;

      })

    })

  })

})



