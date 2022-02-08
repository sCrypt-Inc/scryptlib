import { assert, expect } from 'chai';
import { newTx, loadDescription } from './helper';
import { DebugLaunch } from '../src/abi';
import { buildContractClass, VerifyError, buildTypeClasses } from '../src/contract';
import { bsv, toHex, signTx, num2bin, getPreimage, readLaunchJson } from '../src/utils';
import { Bytes, PubKey, Sig, Ripemd160, PubKeyHash, SigHashPreimage } from '../src/scryptTypes';

const privateKey = new bsv.PrivateKey.fromRandom('testnet');
const publicKey = privateKey.publicKey;
const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());
const inputSatoshis = 100000;

const inputIndex = 0;
const tx = newTx(inputSatoshis);

const jsonDescr = loadDescription('p2pkh_desc.json');
const DemoP2PKH = buildContractClass(jsonDescr);
const p2pkh = new DemoP2PKH(new PubKeyHash(toHex(pubKeyHash)));

const personDescr = loadDescription('person_desc.json');
const PersonContract = buildContractClass(personDescr);
const { Person } = buildTypeClasses(personDescr);
const outputAmount = 22222
const DataLen = 1
const dummyTxId = 'a477af6b2667c29670467e4e0728b685ee07b240235771862318e29ddbe58458'

let man = new Person({
  isMale: false,
  age: 33,
  addr: new Bytes("68656c6c6f20776f726c6421")
});

const person = new PersonContract(man, 18);


const mdDescr = loadDescription('mdarray_desc.json');
const MDArray = buildContractClass(mdDescr);
const { ST1, AliasST2, ST3 } = buildTypeClasses(mdDescr);




describe('VerifyError', () => {

  describe('check VerifyError ackermann.scrypt', () => {
    let ackermann, result;

    before(() => {
      const Ackermann = buildContractClass(loadDescription('ackermann_desc.json'));
      ackermann = new Ackermann(2, 1);
    });

    it('stop at ackermann.scrypt#38', () => {
      result = ackermann.unlock(15).verify()
      expect(result.error).to.contains("ackermann.scrypt#38");
    });
  });


  describe('check VerifyError when no sourceMap', () => {
    let p2pkh, result;

    before(() => {
      const privateKey = new bsv.PrivateKey.fromRandom('testnet');
      const publicKey = privateKey.publicKey;
      const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());
      const jsonDescr = loadDescription('p2pkh_desc_without_sourceMap.json');
      const DemoP2PKH = buildContractClass(jsonDescr);
      p2pkh = new DemoP2PKH(new Ripemd160(toHex(pubKeyHash)));
    });

    it('need generate DemoP2PKH-launch.json', () => {
      let sig: Sig = signTx(tx, privateKey, p2pkh.lockingScript, inputSatoshis);
      let pubkey: PubKey = new PubKey(toHex(publicKey));
      result = p2pkh.unlock(sig, pubkey).verify({ inputSatoshis, tx });
      expect(result.error).to.equal("VerifyError: SCRIPT_ERR_VERIFY");
    });
  });


  describe('check VerifyError tokenUtxo.scrypt', () => {
    let token, lockingScriptCodePart, result

    const privateKey1 = new bsv.PrivateKey.fromWIF('cMwKrDrzN5YPRHvPAAn9SfbQcXvARzpdtuufFQZZTBvBaqDETPhP')
    const publicKey1 = bsv.PublicKey.fromPrivateKey(privateKey1)
    const pkh1 = bsv.crypto.Hash.sha256ripemd160(publicKey1.toBuffer())
    const privateKey2 = new bsv.PrivateKey.fromRandom('testnet')
    const publicKey2 = bsv.PublicKey.fromPrivateKey(privateKey2)
    const privateKey3 = new bsv.PrivateKey.fromRandom('testnet')
    const publicKey3 = bsv.PublicKey.fromPrivateKey(privateKey3)

    before(() => {
      const Token = buildContractClass(loadDescription('tokenUtxo_desc.json'))
      token = new Token()

      // code part
      lockingScriptCodePart = token.codePart.toASM()
    });


    const testSplit = (privKey, balance0, balance1, balanceInput0 = balance0, balanceInput1 = balance1, inputlockingScriptASM = undefined, inputAmount = 0) => {
      let tx = new bsv.Transaction()

      tx.addInput(new bsv.Transaction.Input({
        prevTxId: dummyTxId,
        outputIndex: 0,
        script: ''
      }), bsv.Script.fromASM(token.lockingScript.toASM()), inputSatoshis)

      const newLockingScript0 = [lockingScriptCodePart, toHex(publicKey2) + num2bin(0, DataLen) + num2bin(balance0, DataLen)].join(' ') + " "
      tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript0),
        satoshis: outputAmount
      }))

      if (balance1 > 0) {
        const newLockingScript1 = [lockingScriptCodePart, toHex(publicKey3) + num2bin(0, DataLen) + num2bin(balance1, DataLen)].join(' ')
        tx.addOutput(new bsv.Transaction.Output({
          script: bsv.Script.fromASM(newLockingScript1),
          satoshis: outputAmount
        }))
      }

      token.txContext = { tx: tx, inputIndex: 0, inputSatoshis }

      const preimage = getPreimage(tx, inputlockingScriptASM ? bsv.Script.fromASM(inputlockingScriptASM) : token.lockingScript, inputAmount ? inputAmount : inputSatoshis)
      const sig = signTx(tx, privKey, token.lockingScript, inputSatoshis)
      return token.split(
        sig,
        new PubKey(toHex(publicKey2)),
        balanceInput0,
        outputAmount,
        new PubKey(toHex(publicKey3)),
        balanceInput1,
        outputAmount,
        new SigHashPreimage(toHex(preimage))
      )
    }

    it('stop tokenUtxo.scrypt#43', () => {

      // split 100 tokens
      token.setDataPart(toHex(publicKey1) + num2bin(10, DataLen) + num2bin(90, DataLen))

      result = testSplit(privateKey1, 60, 40).verify()
      expect(result.error).to.contains("fails at OP_RETURN");
      expect(result.error).to.contains("tokenUtxo.scrypt#43");
      const launch = readLaunchJson(result.error);
      expect(launch).not.undefined;
      expect(launch.configurations[0].program).to.contains("tokenUtxo.scrypt");
    });


    it('stop tokenUtxo.scrypt#14 => require(Tx.checkPreimage(txPreimage))', () => {

      // split 100 tokens
      token.setDataPart(toHex(publicKey1) + num2bin(10, DataLen) + num2bin(90, DataLen))

      result = testSplit(privateKey1, 60, 40, 60, 40, token.lockingScript.toASM() + "00", 111111).verify()

      expect(result.error).to.contains("fails at OP_CHECKSIG");
      expect(result.error).to.contains("tokenUtxo.scrypt#14");

      const launch = readLaunchJson(result.error);
      expect(launch).not.undefined;
      expect(launch.configurations[0].program).to.contains("tokenUtxo.scrypt");
    });

    //TODO: add exit(true| false) test

  });


  describe('check VerifyError', () => {


    it('stop at person.scrypt#26', () => {

      let result = person.main(man, 44, false).verify()

      expect(result.error).to.contains("person.scrypt#28");
      expect(result.error).to.contains("Main-launch.json");
      expect(result.error).to.contains("fails at OP_VERIFY");
    })

    it('stop at person.scrypt#25', () => {

      let result = person.main(man, 10, true).verify()

      expect(result.error).to.contains("person.scrypt#27");
      expect(result.error).to.contains("Main-launch.json");
      expect(result.error).to.contains("fails at OP_VERIFY");

    })


    it('stop at p2pkh.scrypt#10', () => {

      let sig = signTx(tx, bsv.PrivateKey.fromRandom('testnet'), p2pkh.lockingScript, inputSatoshis);
      let pubkey = new PubKey(toHex(publicKey));

      p2pkh.txContext = { inputSatoshis, tx };
      let result = p2pkh.unlock(sig, pubkey).verify();

      expect(result.error).to.contains("p2pkh.scrypt#10");
      expect(result.error).to.contains("DemoP2PKH-launch.json");
      expect(result.error).to.contains("fails at OP_CHECKSIG");
    })

  })


  describe('check asmArgs', () => {
    let asm, result;

    before(() => {
      const ASM = buildContractClass(loadDescription('asm_desc.json'));
      asm = new ASM();
    });

    it('it should success when replace correctly ', () => {

      asm.replaceAsmVars({
        'ASM.equalImpl.x': 'OP_5'
      })

      assert.deepEqual(asm.lockingScript.toASM(), "0 OP_PICK OP_NOP OP_5 ab12 OP_SIZE OP_NIP OP_MUL OP_1 OP_MUL OP_5 OP_SUB OP_EQUAL OP_NOP OP_NIP")

      result = asm.equal(5).verify()
      expect(result.success, result.error).to.be.true;
    });


    it('it should error when replace incorrectly ', () => {

      asm.replaceAsmVars({
        'ASM.equalImpl.x': 'OP_5'
      })

      result = asm.equal(15).verify()
      expect(result.success, result.error).to.be.false;

      const launch = readLaunchJson(result.error);

      assert.deepEqual(launch.configurations[0].asmArgs, {
        'ASM.equalImpl.x': 'OP_5'
      }
      )
    });

  });



  describe('check MDArray', () => {
    let mdArray, result;

    before(() => {
      mdArray = new MDArray([[
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12]
      ],
      [
        [13, 14, 15, 16],
        [17, 18, 19, 20],
        [21, 22, 23, 24]
      ]]);
    });

    it('LaunchJson should be right with Multidimensional Arrays ', () => {
      result = mdArray.unlock([[3, 1, 2], [4, 5, 5]], [1, 32]).verify()
      expect(result.success, result.error).to.be.false;

      const launch = readLaunchJson(result.error);
      expect(result.error).to.contains("mdarray.scrypt#40");
      assert.deepEqual(launch.configurations[0].pubFuncArgs, [[[3, 1, 2], [4, 5, 5]], [1, 32]])
    });

    it('LaunchJson should be right with mixed struct', () => {

      result = mdArray.unlockAliasST2([new AliasST2({
        x: false,
        y: new Bytes("68656c6c6f20776f726c6421"),
        st2: new ST3({
          x: false,
          y: [1, 2, 3]
        })
      }), new AliasST2({
        y: new Bytes("68656c6c6f20776f726c6420"),
        x: true,
        st2: new ST3({
          x: true,
          y: [4, 5, 1]
        })
      })]).verify()

      expect(result.success, result.error).to.be.false;

      const launch = readLaunchJson(result.error);
      expect(result.error).to.contains("mdarray.scrypt#90");

      assert.deepEqual(launch.configurations[0].pubFuncArgs as object, [
        [
          {
            "x": false,
            "y": "b'68656c6c6f20776f726c6421'",
            "st2": {
              "x": false,
              "y": [
                1,
                2,
                3
              ]
            }
          },
          {
            "x": true,
            "y": "b'68656c6c6f20776f726c6420'",
            "st2": {
              "x": true,
              "y": [
                4,
                5,
                1
              ]
            }
          }
        ]
      ])


      assert.deepEqual(launch.configurations[0].constructorArgs as object, [
        [
          [
            [
              1,
              2,
              3,
              4
            ],
            [
              5,
              6,
              7,
              8
            ],
            [
              9,
              10,
              11,
              12
            ]
          ],
          [
            [
              13,
              14,
              15,
              16
            ],
            [
              17,
              18,
              19,
              20
            ],
            [
              21,
              22,
              23,
              24
            ]
          ]
        ]
      ])

    });

  })



  describe('check genLaunchJson opreturn', () => {

    const inputSatoshis = 1000000
    const outputAmount = 222222


    let counter, result;

    before(() => {

    });

    it('it should contain opReturn', () => {
      const Counter = buildContractClass(loadDescription('counter_desc.json'));
      counter = new Counter();

      const tx = newTx(inputSatoshis)
      counter.setDataPart('')
      const newLockingScript = [counter.codePart.toASM(), num2bin(1, DataLen)].join(' ')

      tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript),
        satoshis: outputAmount
      }))

      const preimage = getPreimage(tx, counter.lockingScript, inputSatoshis)

      const result = counter.increment(new SigHashPreimage(toHex(preimage)), outputAmount).verify({
        tx,
        inputIndex: 0,
        inputSatoshis
      })

      const launch = readLaunchJson(result.error);

      expect(launch.configurations[0].txContext).to.deep.equal(
        {
          hex: '01000000015884e5db9de218238671572340b207ee85b628074e7e467096c267266baf77a40000000000ffffffff010e64030000000000fdde045101402097dfd76851bf465e8f715593b217714858bbe9570ff3bd5e33840a34e20ff0262102ba79df5f8ae7604a9830f03c7933028186aede0675a16f025dc4f8be8eec0382201008ce7480da41702918d1ec8e6849ba32b4d65b1e40dc669c31a1e6306b266c567961007954795479210ac407f0e4bd44bfc207355a778b046225a7068fc59ee7eda43ad905aadbffc800206c266b30e6a1319c66dc401e5bd6b432ba49688eecd118297041da8074ce081056795b795b7985615679aa0079610079517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e01007e81517a75615779567956795679567961537956795479577995939521414136d08c5ed2bf3ba048afe6dcaebafeffffffffffffffffffffffffffffff00517951796151795179970079009f63007952799367007968517a75517a75517a7561527a75517a517951795296a0630079527994527a75517a6853798277527982775379012080517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e01205279947f7754537993527993013051797e527e54797e58797e527e53797e52797e57797e0079517a75517a75517a75517a75517a75517a75517a75517a75517a75517a75517a75517a75517a756100795779ac517a75517a75517a75517a75517a75517a75517a75517a75517a7561517a756169567961007901687f776100005279517f75007f77007901fd87635379537f75517f7761007901007e81517a7561537a75527a527a5379535479937f75537f77527a75517a67007901fe87635379557f75517f7761007901007e81517a7561537a75527a527a5379555479937f75557f77527a75517a67007901ff87635379597f75517f7761007901007e81517a7561537a75527a527a5379595479937f75597f77527a75517a675379517f75007f7761007901007e81517a7561537a75527a527a5379515479937f75517f77527a75517a6868685179517a75517a75517a75517a7561517a7561007982775179517951947f77815279527951947f755179519351807e00795a7961007958805279610079827700517902fd009f63517951615179517951938000795179827751947f75007f77517a75517a75517a7561517a75675179030000019f6301fd527952615179517951938000795179827751947f75007f77517a75517a75517a75617e517a756751790500000000019f6301fe527954615179517951938000795179827751947f75007f77517a75517a75517a75617e517a75675179090000000000000000019f6301ff527958615179517951938000795179827751947f75007f77517a75517a75517a75617e517a7568686868007953797e517a75517a75517a75617e517a75517a75610079aa5c7961007982775179517958947f7551790128947f77517a75517a7561877777777777777777777777776a010100000000',
          inputIndex: 0,
          inputSatoshis: 1000000,
          opReturn: ''
        }
      )
    });


    it('it should not contains opReturn', () => {
      const Counter = buildContractClass(loadDescription('counter_desc.json'));
      counter = new Counter();

      const tx = newTx(inputSatoshis)
      const newLockingScript = [counter.codePart.toASM(), num2bin(1, DataLen)].join(' ')

      tx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromASM(newLockingScript),
        satoshis: outputAmount
      }))

      const preimage = getPreimage(tx, counter.lockingScript, inputSatoshis)

      const result = counter.increment(new SigHashPreimage(toHex(preimage)), outputAmount).verify({
        tx,
        inputIndex: 0,
        inputSatoshis
      })

      const launch = readLaunchJson(result.error);

      expect(launch.configurations[0].txContext).to.deep.equal(
        {
          hex: '01000000015884e5db9de218238671572340b207ee85b628074e7e467096c267266baf77a40000000000ffffffff010e64030000000000fdde045101402097dfd76851bf465e8f715593b217714858bbe9570ff3bd5e33840a34e20ff0262102ba79df5f8ae7604a9830f03c7933028186aede0675a16f025dc4f8be8eec0382201008ce7480da41702918d1ec8e6849ba32b4d65b1e40dc669c31a1e6306b266c567961007954795479210ac407f0e4bd44bfc207355a778b046225a7068fc59ee7eda43ad905aadbffc800206c266b30e6a1319c66dc401e5bd6b432ba49688eecd118297041da8074ce081056795b795b7985615679aa0079610079517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e01007e81517a75615779567956795679567961537956795479577995939521414136d08c5ed2bf3ba048afe6dcaebafeffffffffffffffffffffffffffffff00517951796151795179970079009f63007952799367007968517a75517a75517a7561527a75517a517951795296a0630079527994527a75517a6853798277527982775379012080517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f517f7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e7c7e01205279947f7754537993527993013051797e527e54797e58797e527e53797e52797e57797e0079517a75517a75517a75517a75517a75517a75517a75517a75517a75517a75517a75517a75517a756100795779ac517a75517a75517a75517a75517a75517a75517a75517a75517a7561517a756169567961007901687f776100005279517f75007f77007901fd87635379537f75517f7761007901007e81517a7561537a75527a527a5379535479937f75537f77527a75517a67007901fe87635379557f75517f7761007901007e81517a7561537a75527a527a5379555479937f75557f77527a75517a67007901ff87635379597f75517f7761007901007e81517a7561537a75527a527a5379595479937f75597f77527a75517a675379517f75007f7761007901007e81517a7561537a75527a527a5379515479937f75517f77527a75517a6868685179517a75517a75517a75517a7561517a7561007982775179517951947f77815279527951947f755179519351807e00795a7961007958805279610079827700517902fd009f63517951615179517951938000795179827751947f75007f77517a75517a75517a7561517a75675179030000019f6301fd527952615179517951938000795179827751947f75007f77517a75517a75517a75617e517a756751790500000000019f6301fe527954615179517951938000795179827751947f75007f77517a75517a75517a75617e517a75675179090000000000000000019f6301ff527958615179517951938000795179827751947f75007f77517a75517a75517a75617e517a7568686868007953797e517a75517a75517a75617e517a75517a75610079aa5c7961007982775179517958947f7551790128947f77517a75517a7561877777777777777777777777776a010100000000',
          inputIndex: 0,
          inputSatoshis: 1000000
        }
      )
    });


    it('should stop at statecounter.scrypt#24', () => {

      const StateCounter = buildContractClass(loadDescription('statecounter_desc.json'));
      let counter = new StateCounter(0, true);

      let newLockingScript = counter.getNewStateScript({
        counter: 1,
        done: false
      })

      const tx = newTx(inputSatoshis);
      tx.addOutput(new bsv.Transaction.Output({
        script: newLockingScript,
        satoshis: outputAmount
      }))

      const preimage = getPreimage(tx, counter.lockingScript, inputSatoshis)

      counter.txContext = {
        tx: tx,
        inputIndex,
        inputSatoshis
      }

      const result = counter.increment(new SigHashPreimage(toHex(preimage)), outputAmount).verify()
      expect(result.error).to.contains("fails at OP_RETURN");
      expect(result.error).to.contains("statecounter.scrypt#24");
      const launch = readLaunchJson(result.error);
      expect(launch).not.undefined;
      expect(launch.configurations[0].program).to.contains("statecounter.scrypt");

    });


  });




})