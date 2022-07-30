import { assert, expect } from 'chai'
import { loadDescription, newTx } from './helper'
import {
  buildContractClass,
  buildTypeClasses,
  AbstractContract,
  VerifyResult
} from '../src/contract'
import { bsv, signTx, toHex, toLiteral } from '../src/utils'
import { Ripemd160, Bytes, Int, ScryptType } from '../src/scryptTypes'

const privateKey = new bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
const inputSatoshis = 100000
const tx = newTx(inputSatoshis)
const txContext = { inputSatoshis, tx }

const jsonDescr = loadDescription('p2pkh_desc.json')

describe('simple scrypt', () => {
  describe('new instance', () => {
    const Simple = buildContractClass(loadDescription('simple_desc.json'))

    let instance: any
    let result: VerifyResult

    beforeEach(() => {
      instance = new Simple()
      const asmVars = {
        'Simple.equalImpl.x': 'OP_11'
      }
      instance.replaceAsmVars(asmVars)
    })

    it('should be an instance of AbstractContract', () => {
      assert.instanceOf(instance, AbstractContract)
    })

    it('the returned object can be verified whether it could unlock the contract', () => {
      // can unlock contract if params are correct
      result = instance.main(2, 4).verify({ inputSatoshis, tx })
      assert.isTrue(result.success, result.error)
      result = instance.main(3, 3).verify({ inputSatoshis, tx })
      assert.isTrue(result.success, result.error)

      // can not unlock contract if any param is incorrect
      result = instance.main(2, 3).verify({ inputSatoshis, tx })
      assert.isFalse(result.success, result.error)
      result = instance.main(3, 4).verify({ inputSatoshis, tx })
      assert.isFalse(result.success, result.error)
    })
  })
})

describe('create instance from UTXO Hex', () => {
  const Simple = buildContractClass(loadDescription('simple_desc.json'))

  let instance: any
  let result: VerifyResult

  beforeEach(() => {
    const simple = new Simple()
    const asmVars = {
      'Simple.equalImpl.x': 'OP_11'
    }
    simple.replaceAsmVars(asmVars)

    //create instance from an exist script
    instance = Simple.fromHex(simple.lockingScript.toHex())
  })

  it('should be an instance of AbstractContract', () => {
    assert.instanceOf(instance, AbstractContract)
  })


  it('should throw when the raw script cannot match the ASM template of contract Simple', () => {
    const simple = new Simple()
    const asmVars = {
      'Simple.equalImpl.x': 'OP_11'
    }
    simple.replaceAsmVars(asmVars)
    expect(() => {
      const asm = [simple.lockingScript.toASM(), '11'].join(' ');
      Simple.fromHex(new bsv.Script.fromASM(asm).toHex())
    }).to.be.throw(/the raw script cannot match the ASM template of contract Simple/);


    expect(() => {
      Simple.fromHex(simple.lockingScript.toHex().substr(1))
    }).to.be.throw(/the raw script cannot match the ASM template of contract Simple/);


    simple.setDataPart("00 11");

    // should not throw
    instance = Simple.fromHex(simple.lockingScript.toHex())
    assert.instanceOf(instance, AbstractContract)

  })

  it('the returned object can be verified whether it could unlock the contract', () => {
    // can unlock contract if params are correct
    result = instance.main(2, 4).verify({ inputSatoshis, tx })
    assert.isTrue(result.success, result.error)
    result = instance.main(3, 3).verify({ inputSatoshis, tx })
    assert.isTrue(result.success, result.error)
    result = instance.equal(11).verify()
    assert.isTrue(result.success, result.error)

    // can not unlock contract if any param is incorrect
    result = instance.main(2, 3).verify({ inputSatoshis, tx })
    assert.isFalse(result.success, result.error)
    result = instance.main(3, 4).verify({ inputSatoshis, tx })
    assert.isFalse(result.success, result.error)
    result = instance.equal(12).verify()
    assert.isFalse(result.success, result.error)
  })
})

describe('buildContractClass and create instance from script', () => {
  const DemoP2PKH = buildContractClass(jsonDescr)

  describe('instance from an exist script ', () => {
    let instance: any
    let sig: any
    let unlockingScriptASM: string
    let result: VerifyResult

    beforeEach(() => {
      const p2pkh = new DemoP2PKH(new Ripemd160(toHex(pubKeyHash)))
      //create instance from an exist script
      instance = DemoP2PKH.fromHex(p2pkh.lockingScript.toHex())
      sig = signTx(
        tx,
        privateKey,
        instance.lockingScript,
        inputSatoshis
      )
      unlockingScriptASM = [toHex(sig), toHex(publicKey)].join(' ')
    })

    it('static getAsmVars method', () => {
      let lockingScriptHex = instance.lockingScript.toHex()
      let asmVars = DemoP2PKH.getAsmVars(lockingScriptHex)

      expect(asmVars).is.empty
    })

    it('should have an asm var', () => {
      expect(instance.asmVars).empty
    })

    it('should be an instance of AbstractContract', () => {
      assert.instanceOf(instance, AbstractContract)
    })

    describe('.codePart', () => {
      it('should return the partial locking script (the part before op_return) of the contract', () => {
        const lsBeforeAddDataLoad = instance.lockingScript

        assert.equal(
          instance.codePart.toASM(),
          lsBeforeAddDataLoad.toASM() + ' OP_RETURN'
        ) // without op_return data, they should be the same

        instance.setDataPart('aa')
        const lsAfterAddDataLoad = instance.lockingScript // locking script changed after adding op_return

        assert.equal(
          instance.codePart.toASM(),
          lsBeforeAddDataLoad.toASM() + ' OP_RETURN'
        )
        assert.equal(
          instance.codePart.toHex(),
          lsBeforeAddDataLoad.toHex() + '6a'
        )

        assert.equal(
          instance.codePart.toASM() + ' aa',
          lsAfterAddDataLoad.toASM()
        )
        assert.equal(
          instance.codePart.toHex() + '01aa',
          lsAfterAddDataLoad.toHex()
        )

        assert.equal(
          instance.codePart.toASM(),
          `0 ${toHex(
            pubKeyHash
          )} OP_NOP 0 OP_PICK OP_2 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_NOP OP_1 OP_PICK OP_HASH160 OP_1 OP_PICK OP_EQUAL OP_VERIFY OP_2 OP_PICK OP_2 OP_PICK OP_CHECKSIG OP_NIP OP_NIP OP_NIP OP_RETURN`
        )
        assert.equal(
          instance.codePart.toHex(),
          `0014${toHex(
            pubKeyHash
          )}610079527a75517a75615179a95179876952795279ac7777776a`
        )
      })
    })

    describe('.dataPart', () => {
      describe('when dataPart is unset', () => {
        it('should return undefined', () => {
          assert.isUndefined(instance.dataPart)
        })
      })

      describe('when dataPart is to be set using setter', () => {
        it('should throw', () => {
          expect(() => {
            instance.dataPart = 'FF'
          }).to.throw(
            'Setter for dataPart is not available. Please use: setDataPart() instead'
          )
        })
      })

      describe('when dataPart is set', () => {
        it('should return the partial locking script (the part before op_return) of the contract', () => {
          instance.setDataPart('aa')
          assert.equal(instance.dataPart.toASM(), 'aa')
          assert.equal(instance.dataPart.toHex(), '01aa')
        })
      })
    })

    describe('.lockingScript', () => {
      it('should return the whole locking script of the contract', () => {
        // when op_return is non-existent
        assert.equal(
          instance.lockingScript.toASM() + ' OP_RETURN',
          instance.codePart.toASM()
        )
        assert.equal(
          instance.lockingScript.toHex() + '6a',
          instance.codePart.toHex()
        )

        // when op_return is exist
        instance.setDataPart('aa')
        assert.equal(
          instance.lockingScript.toASM(),
          instance.codePart.toASM() + ' ' + instance.dataPart.toASM()
        )
        assert.equal(
          instance.lockingScript.toHex(),
          instance.codePart.toHex() + instance.dataPart.toHex()
        )
      })
    })





    describe('constructorArgs', () => {

      describe('when build a contract which have Implicit constructor from asm', () => {

        const ConstructorArgsContract = buildContractClass(loadDescription('constructorArgs_desc.json'));
        const { ST2, ST3 } = ConstructorArgsContract.types;

        it('should get right constructor args', () => {

          let args = [2, new Int(BigInt(11111111111111111111n)), false, new Bytes('1234567890'),
            new ST2({
              x: false,
              y: new Bytes('12345678901100'),
              st3: new ST3({
                x: true,
                y: [23, 10, 25555555555555555555555555555n]
              })
            }),
            [
              [new ST2({
                x: false,
                y: new Bytes('123456789011'),
                st3: new ST3({
                  x: true,
                  y: [0, 1, 22222222222222222222222222222n]
                })
              }), new ST2({
                x: false,
                y: new Bytes('123456789011'),
                st3: new ST3({
                  x: true,
                  y: [2, 16, 22222222222222222222222222222n]
                })
              })],
              [new ST2({
                x: false,
                y: new Bytes('123456789011'),
                st3: new ST3({
                  x: true,
                  y: [2, 16, 22222222222222222222222222222n]
                })
              }),
              new ST2({
                x: false,
                y: new Bytes('12345678901100'),
                st3: new ST3({
                  x: true,
                  y: [23, 17, 25555555555555555555555555555n]
                })
              })]
            ],
            [[[1, 25555555555555555555555555555n]]]
          ];

          let contract = new ConstructorArgsContract(...args);

          let result = contract.unlock(...args).verify();

          assert.isTrue(result.success, result.error)

          let newContract = ConstructorArgsContract.fromASM(contract.lockingScript.toASM());

          assert.deepEqual(toLiteral(newContract.ctorArgs().map(i => i.value)),
            `[2,11111111111111111111,false,b'1234567890',{false,b'12345678901100',{true,[23,10,25555555555555555555555555555]}},[[{false,b'123456789011',{true,[0,1,22222222222222222222222222222]}},{false,b'123456789011',{true,[2,16,22222222222222222222222222222]}}],[{false,b'123456789011',{true,[2,16,22222222222222222222222222222]}},{false,b'12345678901100',{true,[23,17,25555555555555555555555555555]}}]],[[[1,25555555555555555555555555555]]]]`
          )
        })
      })

    })


    describe('when build a contract which have explicit constructor from asm', () => {

      const ConstructorArgsContract = buildContractClass(loadDescription('constructorArgsExplicit_desc.json'));
      const { ST2, ST3 } = ConstructorArgsContract.types;


      it('should get right constructor args', () => {

        let args = [2, new Int(BigInt(11111111111111111111n)), false, new Bytes('1234567890'),
          new ST2({
            x: false,
            y: new Bytes('12345678901100'),
            st3: new ST3({
              x: true,
              y: [23, 10, 25555555555555555555555555555n]
            })
          }),
          [
            [new ST2({
              x: false,
              y: new Bytes('123456789011'),
              st3: new ST3({
                x: true,
                y: [0, 1, 22222222222222222222222222222n]
              })
            }), new ST2({
              x: false,
              y: new Bytes('123456789011'),
              st3: new ST3({
                x: true,
                y: [2, 16, 22222222222222222222222222222n]
              })
            })],
            [new ST2({
              x: false,
              y: new Bytes('123456789011'),
              st3: new ST3({
                x: true,
                y: [2, 16, 22222222222222222222222222222n]
              })
            }),
            new ST2({
              x: false,
              y: new Bytes('12345678901100'),
              st3: new ST3({
                x: true,
                y: [23, 17, 25555555555555555555555555555n]
              })
            })]
          ],
          [[[1, 25555555555555555555555555555n]]]
        ];

        let contract = new ConstructorArgsContract(...args);

        let result = contract.unlock(...args).verify();

        assert.isTrue(result.success)

        let newContract = ConstructorArgsContract.fromASM(contract.lockingScript.toASM());
        assert.deepEqual(toLiteral(newContract.ctorArgs().map(i => i.value)),
          `[2,11111111111111111111,false,b'1234567890',{false,b'12345678901100',{true,[23,10,25555555555555555555555555555]}},[[{false,b'123456789011',{true,[0,1,22222222222222222222222222222]}},{false,b'123456789011',{true,[2,16,22222222222222222222222222222]}}],[{false,b'123456789011',{true,[2,16,22222222222222222222222222222]}},{false,b'12345678901100',{true,[23,17,25555555555555555555555555555]}}]],[[[1,25555555555555555555555555555]]]]`
        )
      })
    })
  })



  describe('when build a contract which have library param in constructor from asm', () => {

    const Test = buildContractClass(loadDescription('LibAsState1_desc.json'));
    const { L, ST } = buildTypeClasses(Test);


    it('should get right constructor args', () => {

      let l = new L(1, new ST({
        x: 1,
        c: true,
        aa: [1, 1, 1]
      }));
      let instance = new Test(l);

      let newContract = Test.fromHex(instance.lockingScript.toHex());

      assert.deepEqual(toLiteral(newContract.ctorArgs().map(i => i.value)), `[[1,{1,true,[1,1,1]}]]`)

    })
  })

})
