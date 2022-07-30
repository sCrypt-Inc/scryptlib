import { assert, expect } from 'chai';
import { newTx, loadDescription } from './helper';
import { FunctionCall } from '../src/abi';
import { buildContractClass, buildTypeClasses, VerifyResult } from '../src/contract';
import { bsv, toHex, signTx } from '../src/utils';
import { Bytes, PubKey, Sig, Ripemd160, Sha256, Int } from '../src/scryptTypes';

const privateKey = new bsv.PrivateKey.fromRandom('testnet');
const publicKey = privateKey.publicKey;
const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());
const inputSatoshis = 100000;
const tx = newTx(inputSatoshis);

const jsonDescr = loadDescription('p2pkh_desc.json');
const DemoP2PKH = buildContractClass(jsonDescr);
const p2pkh = new DemoP2PKH(new Ripemd160(toHex(pubKeyHash)));

const personDescr = loadDescription('person_desc.json');
const PersonContract = buildContractClass(personDescr);

const { Person, Block } = buildTypeClasses(personDescr);

let man = new Person({
  isMale: false,
  age: 33,
  addr: new Bytes("68656c6c6f20776f726c6421")
});

let block = new Block({
  time: 33,
  header: new Bytes("68656c6c6f20776f726c6421"),
  hash: new Bytes("68656c6c6f20776f726c6421")
});

const person = new PersonContract(man, 18);

describe('FunctionCall', () => {

  let target: FunctionCall;
  let result: VerifyResult;

  describe('when it is the contract constructor', () => {

    before(() => {
      target = new FunctionCall('constructor', {
        contract: p2pkh, lockingScript: p2pkh.lockingScript, args: [{
          name: 'pubKeyHash',
          type: 'Ripemd160',
          value: new Ripemd160(toHex(pubKeyHash))
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
      sig = signTx(tx, privateKey, p2pkh.lockingScript, inputSatoshis);
      pubkey = new PubKey(toHex(publicKey));
      target = new FunctionCall('unlock', {
        contract: p2pkh, unlockingScript: bsv.Script.fromASM([sig.toASM(), pubkey.toASM()].join(' ')), args: [{
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
        assert.equal(target.toASM(), [sig.toASM(), pubkey.toASM()].join(' '));
      })
    })

    describe('verify()', () => {
      it('should return true if params are appropriate', () => {
        // has no txContext in binding contract
        result = target.verify({ inputSatoshis, tx });
        assert.isTrue(result.success, result.error);

        // has txContext in binding contract
        p2pkh.txContext = { inputSatoshis, tx };
        result = target.verify();
        assert.isTrue(result.success, result.error);
        p2pkh.txContext = undefined;
      })

      it('should fail if param `inputSatoshis` is incorrect', () => {
        result = target.verify({ inputSatoshis: inputSatoshis + 1, tx });
        assert.isFalse(result.success, result.error);
        result = target.verify({ inputSatoshis: inputSatoshis - 1, tx });
        assert.isFalse(result.success, result.error);
      })

      it('should fail if param `txContext` is incorrect', () => {
        // missing txContext
        expect(() => {
          target.verify({ inputSatoshis })
        }).to.throw('should provide txContext.tx when verify')

        // incorrect txContext.tx
        tx.nLockTime = tx.nLockTime + 1;
        result = target.verify({ inputSatoshis, tx });
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
          value: new Person({
            isMale: false,
            age: 33,
            addr: new Bytes("68656c6c6f20776f726c6421")
          })

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

      let result = person.main(man, 10, false).verify()

      assert.isTrue(result.success, result.error);
    })


    it('should return false when age 36', () => {

      let result = person.main(man, 36, false).verify()

      assert.isFalse(result.success, result.error);
    })

    it('should return false when isMale true', () => {

      let result = person.main(man, 18, true).verify()

      assert.isFalse(result.success, result.error);
    })

  })

  describe('struct member check', () => {

    it('should throw with wrong members', () => {
      expect(() => {
        person.main(new Person({
          age: 14,
          addr: new Bytes("68656c6c6f20776f726c6421")
        }), 18, true)
      }).to.throw('argument of type struct Person missing member isMale');
    })

    it('should throw with wrong members', () => {
      expect(() => {
        person.main(new Person({
          isMale: false,
          age: 13
        }), 18, true)
      }).to.throw('argument of type struct Person missing member addr');
    })

    it('should throw with wrong members', () => {
      expect(() => {
        person.main(new Person({
          weight: 100,
          isMale: false,
          age: 13,
          addr: new Bytes("68656c6c6f20776f726c6421")
        }), 18, true)
      }).to.throw('weight is not a member of struct Person');
    })

    it('should throw with wrong members type', () => {
      expect(() => {
        person.main(new Person({
          isMale: 11,
          age: 14,
          addr: new Bytes("68656c6c6f20776f726c6421")
        }), 18, true)
      }).to.throw('Member isMale of struct Person is of wrong type, expected bool but got int');
    })

  })


  describe('struct type check', () => {

    it('should throw with wrong struct type', () => {
      expect(() => { person.main(block, 18, true) }).to.throw('The type of p is wrong, expected Person but got Block');
    })

    it('should throw with wrong struct type', () => {
      expect(() => { new PersonContract(block, 18) }).to.throw('The type of some is wrong, expected Person but got Block');
    })
  })

})

describe('ABICoder', () => {

  describe('encodeConstructorCall()', () => {
    describe('when contract has explict constructor', () => {
      it('encodeConstructorCall RegExp replace error fix issue #86', () => {

        const DemoCoinToss = buildContractClass(loadDescription('cointoss_desc.json'));
        let demoCoinToss = new DemoCoinToss(
          new PubKey("034e1f55a9eeec718a19741a04005a87c90de32be5356eb3711905aaf2c9cee281"),
          new PubKey("039671758bb8190eaf4c5b03a424c27012aaee0bc9ee1ce19d711b201159cf9fc2"),
          new Sha256("bfdd565761a74bd95110da480a45e3b408a43aff335473134ef3074637ecbae1"),
          new Sha256("d806b80dd9e76ef5d6be50b6e5c8a54a79fa05d3055f452e5d91e4792f790e0b"),
          555
        );

        expect(demoCoinToss.lockingScript.toASM()).to.be.contain('034e1f55a9eeec718a19741a04005a87c90de32be5356eb3711905aaf2c9cee281 039671758bb8190eaf4c5b03a424c27012aaee0bc9ee1ce19d711b201159cf9fc2 bfdd565761a74bd95110da480a45e3b408a43aff335473134ef3074637ecbae1 d806b80dd9e76ef5d6be50b6e5c8a54a79fa05d3055f452e5d91e4792f790e0b 2b02')

      })


      it('encodeConstructorCall RegExp replace error fix issue #86', () => {

        const MultiSig = buildContractClass(loadDescription('multiSig_desc.json'));
        let multiSig = new MultiSig([new Ripemd160("2f87fe26049415441f024eb134ce54bbafd78e96"), new Ripemd160("9e0ad5f79a7a91cce4f36ebeb6c0d392001683e9"), new Ripemd160("58ddca9a92ebf90edf505a172fcef1197b376f5d")]);

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

    const DemoCoinToss = buildContractClass(loadDescription('cointoss_desc.json'));
    it('test lockingScript', () => {

      let demoCoinToss = new DemoCoinToss(
        new PubKey("034e1f55a9eeec718a19741a04005a87c90de32be5356eb3711905aaf2c9cee281"),
        new PubKey("039671758bb8190eaf4c5b03a424c27012aaee0bc9ee1ce19d711b201159cf9fc2"),
        new Sha256("bfdd565761a74bd95110da480a45e3b408a43aff335473134ef3074637ecbae1"),
        new Sha256("d806b80dd9e76ef5d6be50b6e5c8a54a79fa05d3055f452e5d91e4792f790e0b"),
        "555555555555555555555555555555555555555555555555"
      );

      expect(demoCoinToss.lockingScript.toASM()).to.be.contain('034e1f55a9eeec718a19741a04005a87c90de32be5356eb3711905aaf2c9cee281 039671758bb8190eaf4c5b03a424c27012aaee0bc9ee1ce19d711b201159cf9fc2 bfdd565761a74bd95110da480a45e3b408a43aff335473134ef3074637ecbae1 d806b80dd9e76ef5d6be50b6e5c8a54a79fa05d3055f452e5d91e4792f790e0b e3388ee3388e402a180d5bc55a1a09cf02f94f61')

    })

    describe('test Demo', () => {
      const Demo = buildContractClass(loadDescription('demo_desc.json'));
      it('test demo', () => {


        function expectDemo(demo) {
          let result = demo.add("200000000000000000000000000000000000000000000001").verify()

          expect(result.success).to.be.true;

          result = demo.add("0x23084F676940B7915149BD08B30D000000000001").verify()

          expect(result.success).to.be.true;


          result = demo.add(200000000000000000000000000000000000000000000001n).verify()

          expect(result.success).to.be.true;

          result = demo.add(new Int(200000000000000000000000000000000000000000000001n)).verify()

          expect(result.success).to.be.true;


          result = demo.add(new Int("200000000000000000000000000000000000000000000001")).verify()

          expect(result.success).to.be.true;


          result = demo.add("200000000000000000000000000000000000000000000002").verify()

          expect(result.success).to.be.false;


          result = demo.add(200000000000000000000000000000000000000000000002n).verify()

          expect(result.success).to.be.false;

          result = demo.add(new Int(200000000000000000000000000000000000000000000002n)).verify()

          expect(result.success).to.be.false;

          result = demo.add(new Int("200000000000000000000000000000000000000000000002")).verify()

          expect(result.success).to.be.false;
        }

        expectDemo(new Demo(
          new Int("100000000000000000000000000000000000000000000000"),
          new Int(100000000000000000000000000000000000000000000001n)
        ))


        expectDemo(new Demo(
          "100000000000000000000000000000000000000000000000",
          100000000000000000000000000000000000000000000001n
        ))

      })


      it('constract with string bigint', () => {


        let demo = new Demo(
          new Int("100000000000000000000000000000000000000000000000"),
          new Int("-100000000000000000000000000000000000000000000001")
        );

        let result = demo.add(-1).verify()

        expect(result.success).to.be.true;

        result = demo.add(0).verify()

        expect(result.success).to.be.false;

      })

      it('should throw  with string not in hex or decimal', () => {


        expect(() => {
          let demo = new Demo(
            new Int("fasdfeeeeyjtuykjtukj"),
            33
          );

        }).to.be.throw('can\'t construct Int from <fasdfeeeeyjtuykjtukj>, Only supports integers, should use integer number, bigint, hex string or decimal string');


        expect(() => {
          let demo = new Demo(
            "fasdfeeeeyjtuykjtukj",
            33
          );

        }).to.be.throw('can\'t construct Int from <fasdfeeeeyjtuykjtukj>, Only supports integers, should use integer number, bigint, hex string or decimal string');

        expect(() => {
          let demo = new Demo(1, 1);

          demo.add("fasdfeeeeyjtuykjtukj").verify()



        }).to.be.throw('can\'t construct Int from <fasdfeeeeyjtuykjtukj>, Only supports integers, should use integer number, bigint, hex string or decimal string');

        expect(() => {
          new Int("fasdfeeeeyjtuykjtukj")
        }).to.be.throw('can\'t construct Int from <fasdfeeeeyjtuykjtukj>, Only supports integers, should use integer number, bigint, hex string or decimal string');

        expect(() => {
          new Int("afe3")
        }).to.be.throw('can\'t construct Int from <afe3>, Only supports integers, should use integer number, bigint, hex string or decimal string');


        expect(() => {
          new Int(1.3)
        }).to.be.throw('can\'t construct Int from <1.3>, Only supports integers, should use integer number, bigint, hex string or decimal string');

        expect(() => {
          new Int(1.401e30)
        }).to.be.throw('can\'t construct Int from <1.401e+30>, <1.401e+30> is not safe integer, should use bigint, hex string or decimal string');

        expect(new Int(1.401e10).toLiteral()).to.be.equal('14010000000');

        expect(new Int(Number.MAX_SAFE_INTEGER).toLiteral()).to.be.equal('9007199254740991');

        expect(new Int(Number.MIN_SAFE_INTEGER).toLiteral()).to.be.equal('-9007199254740991');


        expect(() => {
          new Int(Number.MIN_SAFE_INTEGER - 1)
        }).to.be.throw('can\'t construct Int from <-9007199254740992>, <-9007199254740992> is not safe integer, should use bigint, hex string or decimal string');


        expect(() => {
          new Int(Number.MAX_SAFE_INTEGER + 1)
        }).to.be.throw('can\'t construct Int from <9007199254740992>, <9007199254740992> is not safe integer, should use bigint, hex string or decimal string');

        expect(() => {
          new Int(1.401e-30)
        }).to.be.throw('can\'t construct Int from <1.401e-30>, Only supports integers, should use integer number, bigint, hex string or decimal string');

      })

    })



    describe('test MDArray', () => {

      const jsonDescr = loadDescription('mdarray_desc.json');
      const MDArray = buildContractClass(jsonDescr);


      it('test lockingScript', () => {
        let mdArray = new MDArray([[
          [1, 2, 3, 4],
          [5, 6, 7, 8],
          [999999999999999999999999999999n, 10, 11, 12]
        ],
        [
          [13, 14, 15, 16],
          [17, 18, 19, 20],
          [21, 22, 23, 11111111111111111111111111111111111n]
        ]]);


        let mdArrayBigInt = new MDArray([[
          [1, 2, 3, 4],
          [5, 6, 7, 8],
          ["999999999999999999999999999999", 10, 11, 12]
        ],
        [
          [13, 14, 15, 16],
          [17, 18, 19, 20],
          [21, 22, 23, "11111111111111111111111111111111111"]
        ]]);


        expect(mdArray.lockingScript.toASM()).to.be.equal(mdArrayBigInt.lockingScript.toASM());
      })


      it('test unlockX', () => {
        let mdArray = new MDArray([[
          [1, 2, 3, 4],
          [5, 6, 7, 8],
          [999999999999999999999999999999n, 10, 11, 12]
        ],
        [
          [13, 14, 15, 16],
          [17, 18, 19, 20],
          [21, 22, 23, 11111111111111111111111111111111111n]
        ]]);



        let result = mdArray.unlockX([[
          [1, 2, 3, 4],
          [5, 6, 7, 8],
          ["999999999999999999999999999999", 10, 11, 12]
        ],
        [
          [13, 14, 15, 16],
          [17, 18, 19, 20],
          [21, 22, 23, "11111111111111111111111111111111111"]
        ]]).verify()


        expect(result.success).to.be.true;


        result = mdArray.unlockX([[
          [1, 2, 3, 4],
          [5, 6, 7, 8],
          [999999999999999999999999999999n, 10, 11, 12]
        ],
        [
          [13, 14, 15, 16],
          [17, 18, 19, 20],
          [21, 22, 23, 11111111111111111111111111111111111n]
        ]]).verify()
        expect(result.success).to.be.true;



        result = mdArray.unlockX([[
          [1, 2, 3, 4],
          [5, 6, 7, 8],
          [999999999999999999999999999998n, 10, 11, 12]
        ],
        [
          [13, 14, 15, 16],
          [17, 18, 19, 20],
          [21, 22, 23, 11111111111111111111111111111111111n]
        ]]).verify()
        expect(result.success).to.be.false;


        result = mdArray.unlockX([[
          [1, 2, 3, 4],
          [5, 6, 7, 8],
          ["999999999999999999999999999999", 10, 11, 12]
        ],
        [
          [13, 14, 15, 16],
          [17, 18, 19, 20],
          [21, 22, 23, "11111111111111111111111111111111110"]
        ]]).verify()
        expect(result.success).to.be.false;


      })


      expect(() => {
        new MDArray([[
          [1, 2, 3, 4],
          [5, 6, 7, 8],
          ["999999999999999999999999999999", 10, 11, 12]
        ],
        [
          [13, 14, 15, 16],
          [17, 18, 19, 20],
          [21, 22, 23, "1111111111111111h1111111111111111111"]
        ]]);
      }).to.be.throw('can\'t construct Int from <1111111111111111h1111111111111111111>, Only supports integers, should use integer number, bigint, hex string or decimal string');

    })



    describe('test person.scrypt', () => {

      it('test lockingScript', () => {

        let person1 = new Person({
          isMale: false,
          age: 33333333333333333333333333333333333n,
          addr: new Bytes("68656c6c6f20776f726c6421")
        });

        let person2 = new Person({
          isMale: false,
          age: "33333333333333333333333333333333333",
          addr: new Bytes("68656c6c6f20776f726c6421")
        });

        let main = new PersonContract(person1, 33333333333333333333333333333333333n);

        let mainBigIntStr = new PersonContract(person2, "33333333333333333333333333333333333");

        expect(main.lockingScript.toASM()).to.be.equal(mainBigIntStr.lockingScript.toASM());
      })


      it('test equal', () => {

        let person1 = new Person({
          isMale: false,
          age: 33333333333333333333333333333333333n,
          addr: new Bytes("68656c6c6f20776f726c6421")
        });

        let person2 = new Person({
          isMale: false,
          age: "33333333333333333333333333333333333",
          addr: new Bytes("68656c6c6f20776f726c6421")
        });

        let main = new PersonContract(person1, 33333333333333333333333333333333333n);


        let result = main.equal(person2).verify()
        expect(result.success).to.be.true;

        result = main.equal(person1).verify()
        expect(result.success).to.be.true;

        result = main.equal(new Person({
          isMale: false,
          age: "33333333333333333333333333333333334",
          addr: new Bytes("68656c6c6f20776f726c6421")
        })).verify()
        expect(result.success).to.be.false;

      })


    })



    describe('test encodePubFunctionCallFromHex', () => {



      it('test encodePubFunctionCallFromHex: PersonContract.equal', () => {

        let person1 = new Person({
          isMale: false,
          age: 33333333333333333333333333333333333n,
          addr: new Bytes("68656c6c6f20776f726c6421")
        });

        let person2 = new Person({
          isMale: false,
          age: "33333333333333333333333333333333333",
          addr: new Bytes("68656c6c6f20776f726c6421")
        });

        let main = new PersonContract(person1, 33333333333333333333333333333333333n);


        let funCall = main.equal(person2) as FunctionCall;

        let mainClone = PersonContract.fromHex(main.lockingScript.toHex());


        const funCallClone = PersonContract.abiCoder.encodePubFunctionCallFromHex(mainClone, 'equal', funCall.unlockingScript.toHex());


        main = new PersonContract(person1, 33333333333333333333333333333333333n);

        const result = funCallClone.verify()
        expect(result.success).to.be.true;

        assert.equal(funCallClone.unlockingScript.toHex(), funCall.unlockingScript.toHex())


        let funCallWrongArgs = main.equal(new Person({
          isMale: false,
          age: "33333333333333333333333333333333334",
          addr: new Bytes("68656c6c6f20776f726c6421")
        })) as FunctionCall;


        const funCallCloneWrong = PersonContract.abiCoder.encodePubFunctionCallFromHex(mainClone, 'equal', funCallWrongArgs.unlockingScript.toHex());

        const result1 = funCallCloneWrong.verify()
        expect(result1.success).to.be.false;

      })



      it('test encodePubFunctionCallFromHex: DemoP2PKH.unlock', () => {

        const sig = signTx(tx, privateKey, p2pkh.lockingScript, inputSatoshis);
        const pubkey = new PubKey(toHex(publicKey));

        let result = p2pkh.unlock(sig, pubkey).verify({ inputSatoshis, tx })

        expect(result.success).to.be.true;

        let funCall = p2pkh.unlock(sig, pubkey) as FunctionCall;

        let p2pkhClone = DemoP2PKH.fromHex(p2pkh.lockingScript.toHex());

        const funCallClone = DemoP2PKH.abiCoder.encodePubFunctionCallFromHex(p2pkhClone, 'unlock', funCall.unlockingScript.toHex());

        result = funCallClone.verify({ inputSatoshis, tx })

        expect(result.success).to.be.true;

        result = p2pkhClone.unlock(sig, pubkey).verify({ inputSatoshis, tx })

        expect(result.success).to.be.true;

      })

    })

  })

})



