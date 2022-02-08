
import { assert, expect } from 'chai';
import { newTx, loadDescription } from './helper';
import { buildContractClass, buildTypeClasses } from '../src/contract';
import { bsv, toHex, getPreimage, toHashedMap } from '../src/utils';
import { Bytes, SigHashPreimage } from '../src';

const inputIndex = 0;
const inputSatoshis = 100000;
const outputAmount = inputSatoshis


describe('library as property or return or param', () => {

  describe('library as property', () => {

    describe('LibCompare test', () => {
      let instance, result;

      const Test = buildContractClass(loadDescription('LibCompare_desc.json'));
      const { L } = buildTypeClasses(Test);
      before(() => {
        instance = new Test(new L(1, 1, [1, 1, 1], true, 2, 2));
      });

      it('should success when call unlock', () => {
        result = instance.unlock(1, 1, [1, 1, 1], true, 2, 2).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(1, 2, [1, 1, 1], true, 2, 2).verify()
        expect(result.success, result.error).to.be.false
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(1, 1, [1, 1, 1], false, 2, 2).verify()
        expect(result.success, result.error).to.be.false
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(1, 1, [1, 1, 2], true, 2, 2).verify()
        expect(result.success, result.error).to.be.false
      });

    });


    describe('LibAsProperty1 test', () => {
      let instance, result;

      const Test = buildContractClass(loadDescription('LibAsProperty1_desc.json'));
      const { L } = buildTypeClasses(Test);
      before(() => {
        instance = new Test(1, new L(1, 2));
      });

      it('should success when call unlock', () => {
        result = instance.unlock(2).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(3).verify()
        expect(result.success, result.error).to.be.false
      });

    });


    describe('LibAsProperty2 test', () => {
      let instance, result;

      const Test = buildContractClass(loadDescription('LibAsProperty2_desc.json'));
      const { L } = buildTypeClasses(Test);
      before(() => {
        instance = new Test(1, new L(1));
      });

      it('should success when call unlock', () => {
        result = instance.unlock(0).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(3).verify()
        expect(result.success, result.error).to.be.false
      });

    });


    describe('LibAsProperty3 test', () => {
      let instance, result;

      const Test = buildContractClass(loadDescription('LibAsProperty3_desc.json'));
      const { L, L1 } = buildTypeClasses(Test);
      before(() => {
        instance = new Test(1, new L1(new L(1)));
      });

      it('should success when call unlock', () => {
        result = instance.unlock(0).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(3).verify()
        expect(result.success, result.error).to.be.false
      });

    });


    describe('LibAsProperty4 test', () => {
      let instance, result;
      const Test = buildContractClass(loadDescription('LibAsProperty4_desc.json'));
      const { L, L1 } = buildTypeClasses(Test);

      before(() => {
        instance = new Test(1, new L1(1, 1));
      });

      it('should success when call unlock', () => {
        result = instance.unlock(1).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(3).verify()
        expect(result.success, result.error).to.be.false
      });

    });



    describe('LibAsProperty5 test', () => {
      let instance, result;
      const Test = buildContractClass(loadDescription('LibAsProperty5_desc.json'));
      const { L } = buildTypeClasses(Test);
      before(() => {
        instance = new Test(1, [new L(1), new L(2), new L(3)]);
      });

      it('should success when call unlock', () => {
        result = instance.unlock(5).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(4).verify()
        expect(result.success, result.error).to.be.false
      });

    });


    describe('LibAsProperty6 test', () => {
      let instance, result;
      const Test = buildContractClass(loadDescription('LibAsProperty6_desc.json'));
      const { L } = buildTypeClasses(Test);
      before(() => {
        instance = new Test(1, [new L(1, 1), new L(2, 2), new L(3, 3)]);
      });

      it('should success when call unlock', () => {
        result = instance.unlock(11).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should success when call unlock', () => {
        result = instance.unlock(12).verify()
        expect(result.success, result.error).to.be.false
      });

    });


    describe('LibAsProperty7 test', () => {
      let instance, result;
      const Test = buildContractClass(loadDescription('LibAsProperty7_desc.json'));
      const { L, ST } = buildTypeClasses(Test);
      before(() => {
        instance = new Test(1, new L(new ST({
          x: 1,
          y: 1
        })));
      });

      it('should success when call unlock', () => {
        result = instance.unlock(1).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(2).verify()
        expect(result.success, result.error).to.be.false
      });

    });



    describe('LibAsProperty7 test', () => {
      let instance, result;
      const Test = buildContractClass(loadDescription('LibAsProperty8_desc.json'));
      const { L, ST } = buildTypeClasses(Test);
      before(() => {
        instance = new Test(2, new L([new ST({
          x: 1,
          y: 1
        }), new ST({
          x: 2,
          y: 2
        }), new ST({
          x: 3,
          y: 3
        })]));
      });

      it('should success when call unlock', () => {
        result = instance.unlock(10).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(12).verify()
        expect(result.success, result.error).to.be.false
      });

    });

    describe('Library with generic', () => {
      describe('LibGenericAsProperty1 test: can inferr all generic types from constructor', () => {
        let instance, result;
        const Test = buildContractClass(loadDescription('LibGenericAsProperty1_desc.json'));
        const { L } = buildTypeClasses(Test);

        it('should success when using int to new L', () => {
          instance = new Test(2, new L(1, 1));
          result = instance.unlock(2).verify()
          expect(result.success, result.error).to.be.true
        });

        it('should fail when using int to new L', () => {
          instance = new Test(2, new L(1, 2));
          result = instance.unlock(2).verify()
          expect(result.success, result.error).to.be.false
        });

        it('should throw when using int and bool to new L', () => {
          expect(() => new L(1, true)).to.throw('The type of L is wrong, expected [T,T] but got [1,true]');
        });

        it('should throw when using bool to new L', () => {
          expect(() => new Test(2, new L(true, true))).to.throw('The type of l is wrong, expected L<int> but got L<bool>');
        });

        it('should throw when using Bytes to new L', () => {
          expect(() => new Test(2, new L(new Bytes(""), new Bytes("")))).to.throw('The type of l is wrong, expected L<int> but got L<bytes>');
        });
      });


      describe('LibGenericAsProperty2 test: can not inferr all generic types from constructor', () => {
        let instance, result;
        const Test = buildContractClass(loadDescription('LibGenericAsProperty2_desc.json'));
        const { L } = buildTypeClasses(Test);

        it('should success when using int to new L', () => {
          instance = new Test(2, new L(1, 1));
          result = instance.unlock(2).verify()
          expect(result.success, result.error).to.be.true
        });

        it('should fail when using int to new L', () => {
          instance = new Test(2, new L(1, 1));
          result = instance.unlock(1).verify()
          expect(result.success, result.error).to.be.false
        });

      });

      describe('LibGenericAsProperty3 test: can not inferr all generic types from constructor', () => {
        let instance, result;
        const Test = buildContractClass(loadDescription('LibGenericAsProperty3_desc.json'));
        const { L } = buildTypeClasses(Test);

        it('should success when using int to new L', () => {
          instance = new Test(2, new L(1, 1), new L(new Bytes("0101"), 1));
          result = instance.unlock(2).verify()
          expect(result.success, result.error).to.be.true
        });

        it('should throw when using int and bool to new L', () => {
          expect(() => new L(1, true)).to.throw('The type of L is wrong, expected [int,int] but got [1,true]');
        });

      });

      describe('LibGenericAsProperty4 test: can inferr all generic types in nested library', () => {
        let instance, result;
        const TestGenericLibray = buildContractClass(loadDescription('LibGenericAsProperty4_desc.json'));
        const { GenericLibray, GenericA, ST } = buildTypeClasses(TestGenericLibray);

        it('should success', () => {
          instance = new TestGenericLibray(new GenericLibray(new GenericA(new ST({ a: 101, b: new Bytes("0f010f") })), 11));
          result = instance.unlock(11).verify()
          expect(result.success, result.error).to.be.true
        });

        it('should fail ', () => {
          instance = new TestGenericLibray(new GenericLibray(new GenericA(new ST({ a: 101, b: new Bytes("0f010f") })), 11));
          result = instance.unlock(10).verify()
          expect(result.success, result.error).to.be.false
        });

        it('should throw when wrong constructor args ', () => {
          expect(() => new GenericLibray([new GenericA(new ST({ a: 101, b: new Bytes("0f010f") })), 11]))
            .to.throw(`can't construct libraryClass from <[{101,b'0f010f'}],11>, The type of GenericLibray is wrong, expected [GenericA<ST>,T] but got [[[{"a":101,"b":"b'0f010f'"}],11]]`);
        });

      });
    })
  })


  describe('Library as return type', () => {

    describe('LibAsReturn1 test', () => {
      let instance, result;

      const Test = buildContractClass(loadDescription('LibAsReturn1_desc.json'));
      const { L } = buildTypeClasses(Test);
      before(() => {
        instance = new Test(1);
      });

      it('should success when call unlock', () => {
        result = instance.unlock(1).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(2).verify()
        expect(result.success, result.error).to.be.false
      });

    });


    describe('LibAsReturn2 test', () => {
      let instance, result;

      const Test = buildContractClass(loadDescription('LibAsReturn2_desc.json'));
      const { L } = buildTypeClasses(Test);

      before(() => {
        instance = new Test(1);
      });

      it('should success when call unlock', () => {
        result = instance.unlock(0).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(1).verify()
        expect(result.success, result.error).to.be.false
      });

    });

    describe('LibAsReturn3 test', () => {
      let instance, result;

      const Test = buildContractClass(loadDescription('LibAsReturn3_desc.json'));
      const { L } = buildTypeClasses(Test);

      before(() => {
        instance = new Test(1);
      });

      it('should success when call unlock', () => {
        result = instance.unlock(1).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(2).verify()
        expect(result.success, result.error).to.be.false
      });

      it('should success when call unlock1', () => {
        result = instance.unlock2(4).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should success when call unlock', () => {
        result = instance.unlock2(2).verify()
        expect(result.success, result.error).to.be.false
      });

    });

    describe('LibAsReturn4 test', () => {
      let instance, result;

      const Test = buildContractClass(loadDescription('LibAsReturn4_desc.json'));
      const { L } = buildTypeClasses(Test);

      before(() => {
        instance = new Test(1);
      });

      it('should success when call unlock', () => {
        result = instance.unlock(1).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should success when call unlock', () => {
        result = instance.unlock(2).verify()
        expect(result.success, result.error).to.be.true
      });

    });
  })

  describe('Library as function param', () => {
    describe('LibAsParam1 test', () => {
      const Test = buildContractClass(loadDescription('LibAsParam1_desc.json'));
      const { L } = buildTypeClasses(Test);
      let instance, result;

      before(() => {
        instance = new Test(1);
      });

      it('should success when call unlock', () => {
        result = instance.unlock(2).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should success when call unlock', () => {
        result = instance.unlock(1).verify()
        expect(result.success, result.error).to.be.false
      });

    });
  })

  describe('Library as state property', () => {
    describe('LibAsState1 test', () => {
      let instance, result;
      const Test = buildContractClass(loadDescription('LibAsState1_desc.json'));
      const { L, ST } = buildTypeClasses(Test);
      let l = new L(1, new ST({
        x: 1,
        c: true,
        aa: [1, 1, 1]
      }));

      before(() => {
        instance = new Test(l);
      });

      it('should success when call unlock', () => {
        l.setProperties({
          x: 6,
          st: new ST({
            x: 1,
            c: false,
            aa: [1, 1, 1]
          })
        });

        let newLockingScript = instance.getNewStateScript({
          l: l
        })

        const tx = newTx(inputSatoshis);
        tx.addOutput(new bsv.Transaction.Output({
          script: newLockingScript,
          satoshis: outputAmount
        }))

        const preimage = getPreimage(tx, instance.lockingScript, inputSatoshis)

        instance.txContext = {
          tx: tx,
          inputIndex,
          inputSatoshis
        }

        result = instance.unlock(1, new SigHashPreimage(toHex(preimage))).verify()
        expect(result.success, result.error).to.be.true

      });

      it('should fail when call unlock with error state', () => {
        l.x = 5;
        let newLockingScript = instance.getNewStateScript({
          l: l
        })

        const tx = newTx(inputSatoshis);
        tx.addOutput(new bsv.Transaction.Output({
          script: newLockingScript,
          satoshis: outputAmount
        }))

        const preimage = getPreimage(tx, instance.lockingScript, inputSatoshis)

        instance.txContext = {
          tx: tx,
          inputIndex,
          inputSatoshis
        }

        result = instance.unlock(1, new SigHashPreimage(toHex(preimage))).verify()
        expect(result.success, result.error).to.be.false
      });

      it('should fail when call unlock with error state', () => {

        let newLockingScript = instance.getNewStateScript({
          l: l.setProperties({
            x: 6,
            st: new ST({
              x: 1,
              c: true,
              aa: [1, 1, 1]
            })
          })
        })

        const tx = newTx(inputSatoshis);
        tx.addOutput(new bsv.Transaction.Output({
          script: newLockingScript,
          satoshis: outputAmount
        }))

        const preimage = getPreimage(tx, instance.lockingScript, inputSatoshis)

        instance.txContext = {
          tx: tx,
          inputIndex,
          inputSatoshis
        }

        result = instance.unlock(1, new SigHashPreimage(toHex(preimage))).verify()
        expect(result.success, result.error).to.be.false
      });

      it('should success when only update one field', () => {
        l.st.c = false;
        let newLockingScript = instance.getNewStateScript({
          l: l
        })

        const tx = newTx(inputSatoshis);
        tx.addOutput(new bsv.Transaction.Output({
          script: newLockingScript,
          satoshis: outputAmount
        }))

        const preimage = getPreimage(tx, instance.lockingScript, inputSatoshis)

        instance.txContext = {
          tx: tx,
          inputIndex,
          inputSatoshis
        }

        result = instance.unlock(1, new SigHashPreimage(toHex(preimage))).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock with error state', () => {

        let newLockingScript = instance.getNewStateScript({
          l: l.setProperties({
            x: 5,
            st: new ST({
              x: 1,
              c: false,
              aa: [1, 1, 1]
            })
          })
        })

        const tx = newTx(inputSatoshis);
        tx.addOutput(new bsv.Transaction.Output({
          script: newLockingScript,
          satoshis: outputAmount
        }))

        const preimage = getPreimage(tx, instance.lockingScript, inputSatoshis)

        instance.txContext = {
          tx: tx,
          inputIndex,
          inputSatoshis
        }

        result = instance.unlock(1, new SigHashPreimage(toHex(preimage))).verify()
        expect(result.success, result.error).to.be.false
      });
    });
  })
})

