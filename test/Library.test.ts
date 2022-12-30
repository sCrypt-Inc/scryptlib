
import { assert, expect } from 'chai';
import { newTx, loadArtifact } from './helper';
import { buildContractClass } from '../src/contract';
import { bsv, getPreimage } from '../src/utils';
import { Bytes, SigHashPreimage } from '../src';

const inputIndex = 0;
const inputSatoshis = 100000;
const outputAmount = inputSatoshis


describe('library as property or return or param', () => {

  describe('library as property', () => {

    describe('LibCompare test', () => {
      let instance, result;

      const Test = buildContractClass(loadArtifact('LibCompare.json'));
      before(() => {
        instance = new Test([1n, 1n, [1n, 1n, 1n], true, 2n, 2n]);
      });

      it('should succeeding when call unlock', () => {
        result = instance.unlock(1n, 1n, [1n, 1n, 1n], true, 2n, 2n).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(1n, 2n, [1n, 1n, 1n], true, 2n, 2n).verify()
        expect(result.success, result.error).to.be.false
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(1n, 1n, [1n, 1n, 1n], false, 2n, 2n).verify()
        expect(result.success, result.error).to.be.false
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(1n, 1n, [1n, 1n, 2n], true, 2n, 2n).verify()
        expect(result.success, result.error).to.be.false
      });

    });


    describe('LibAsProperty1 test', () => {
      let instance, result;

      const Test = buildContractClass(loadArtifact('LibAsProperty1.json'));
      before(() => {
        instance = new Test(1n, [1n, 2n]);
      });

      it('should succeeding when call unlock', () => {
        result = instance.unlock(2n).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(3n).verify()
        expect(result.success, result.error).to.be.false
      });

    });


    describe('LibAsProperty2 test', () => {
      let instance, result;

      const Test = buildContractClass(loadArtifact('LibAsProperty2.json'));
      before(() => {
        instance = new Test(1n, [1n]);
      });

      it('should succeeding when call unlock', () => {
        result = instance.unlock(0n).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(3n).verify()
        expect(result.success, result.error).to.be.false
      });

    });


    describe('LibAsProperty3 test', () => {
      let instance, result;

      const Test = buildContractClass(loadArtifact('LibAsProperty3.json'));
      before(() => {
        instance = new Test(1n, [[1n]]);
      });

      it('should succeeding when call unlock', () => {
        result = instance.unlock(0n).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(3n).verify()
        expect(result.success, result.error).to.be.false
      });

    });


    describe('LibAsProperty4 test', () => {
      let instance, result;
      const Test = buildContractClass(loadArtifact('LibAsProperty4.json'));

      before(() => {
        instance = new Test(1n, [1n, 1n]);
      });

      it('should succeeding when call unlock', () => {
        result = instance.unlock(1n).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(3n).verify()
        expect(result.success, result.error).to.be.false
      });

    });



    describe('LibAsProperty5 test', () => {
      let instance, result;
      const Test = buildContractClass(loadArtifact('LibAsProperty5.json'));
      before(() => {
        instance = new Test(1n, [[1n], [2n], [3n]]);
      });

      it('should succeeding when call unlock', () => {
        result = instance.unlock(5n).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(4n).verify()
        expect(result.success, result.error).to.be.false
      });

    });


    describe('LibAsProperty6 test', () => {
      let instance, result;
      const Test = buildContractClass(loadArtifact('LibAsProperty6.json'));
      before(() => {
        instance = new Test(1n, [[1n, 1n], [2n, 2n], [3n, 3n]]);
      });

      it('should succeeding when call unlock', () => {
        result = instance.unlock(11n).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should succeeding when call unlock', () => {
        result = instance.unlock(12n).verify()
        expect(result.success, result.error).to.be.false
      });

    });


    describe('LibAsProperty7 test', () => {
      let instance, result;
      const Test = buildContractClass(loadArtifact('LibAsProperty7.json'));
      before(() => {
        instance = new Test(1n, [{
          x: 1n,
          y: 1n
        }]);
      });

      it('should succeeding when call unlock', () => {
        result = instance.unlock(1n).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(2n).verify()
        expect(result.success, result.error).to.be.false
      });

    });



    describe('LibAsProperty7 test', () => {
      let instance, result;
      const Test = buildContractClass(loadArtifact('LibAsProperty8.json'));
      before(() => {
        instance = new Test(2n, [[{
          x: 1n,
          y: 1n
        }, {
          x: 2n,
          y: 2n
        }, {
          x: 3n,
          y: 3n
        }]]);
      });

      it('should succeeding when call unlock', () => {
        result = instance.unlock(10n).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(12n).verify()
        expect(result.success, result.error).to.be.false
      });

    });

    describe('Library with generic', () => {
      describe('LibGenericAsProperty1 test: can inferr all generic types from constructor', () => {
        let instance, result;
        const Test = buildContractClass(loadArtifact('LibGenericAsProperty1.json'));

        it('should succeeding when using int to new L', () => {
          instance = new Test(2n, [1n, 1n]);
          result = instance.unlock(2n).verify()
          expect(result.success, result.error).to.be.true
        });

        it('should fail when using int to new L', () => {
          instance = new Test(2n, [1n, 2n]);
          result = instance.unlock(2n).verify()
          expect(result.success, result.error).to.be.false
        });

        it('should throw when using int and bool to new L', () => {
          expect(() => new Test(2n, [1n, true])).to.throw('The type of y is wrong, expected int but got bool');
        });

        it('should throw when using bool to new L', () => {
          expect(() => new Test(2n, [true, true])).to.throw('The type of x is wrong, expected int but got bool');
        });

        it('should throw when using Bytes to new L', () => {
          expect(() => new Test(2n, [Bytes(""), Bytes("")])).to.throw('The type of x is wrong, expected int but got bytes');
        });
      });


      describe('LibGenericAsProperty2 test: can not inferr all generic types from constructor', () => {
        let instance, result;
        const Test = buildContractClass(loadArtifact('LibGenericAsProperty2.json'));
        it('should succeeding when using int to new L', () => {
          instance = new Test(2n, [1n, 1n]);
          result = instance.unlock(2n).verify()
          expect(result.success, result.error).to.be.true
        });

        it('should fail when using int to new L', () => {
          instance = new Test(2n, [1n, 1n]);
          result = instance.unlock(1n).verify()
          expect(result.success, result.error).to.be.false
        });

      });

      describe('LibGenericAsProperty3 test: can not inferr all generic types from constructor', () => {
        let instance, result;
        const Test = buildContractClass(loadArtifact('LibGenericAsProperty3.json'));

        it('should succeeding when using int to new L', () => {
          instance = new Test(2n, [1n, 1n], [Bytes("0101"), 1n]);
          result = instance.unlock(2n).verify()
          expect(result.success, result.error).to.be.true
        });

      });

      describe('LibGenericAsProperty4 test: can inferr all generic types in nested library', () => {
        let instance, result;
        const TestGenericLibray = buildContractClass(loadArtifact('LibGenericAsProperty4.json'));

        it('should succeeding', () => {
          instance = new TestGenericLibray([[{ a: 101n, b: Bytes("0f010f") }], 11n]);
          result = instance.unlock(11n).verify()
          expect(result.success, result.error).to.be.true
        });

        it('should fail ', () => {
          instance = new TestGenericLibray([[{ a: 101n, b: Bytes("0f010f") }], 11n]);
          result = instance.unlock(10n).verify()
          expect(result.success, result.error).to.be.false
        });

        it('should throw when wrong constructor args ', () => {
          expect(() => new TestGenericLibray([{ a: 101n, b: Bytes("0f010f") }], 11n))
            .to.throw(`wrong number of arguments for 'TestGenericLibray.constructor', expected 1 but got 2`);
        });

      });
    })
  })


  describe('Library as return type', () => {

    describe('LibAsReturn1 test', () => {
      let instance, result;

      const Test = buildContractClass(loadArtifact('LibAsReturn1.json'));
      before(() => {
        instance = new Test(1n);
      });

      it('should succeeding when call unlock', () => {
        result = instance.unlock(1n).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(2n).verify()
        expect(result.success, result.error).to.be.false
      });

    });


    describe('LibAsReturn2 test', () => {
      let instance, result;

      const Test = buildContractClass(loadArtifact('LibAsReturn2.json'));

      before(() => {
        instance = new Test(1n);
      });

      it('should succeeding when call unlock', () => {
        result = instance.unlock(0n).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(1n).verify()
        expect(result.success, result.error).to.be.false
      });

    });

    describe('LibAsReturn3 test', () => {
      let instance, result;

      const Test = buildContractClass(loadArtifact('LibAsReturn3.json'));

      before(() => {
        instance = new Test(1n);
      });

      it('should succeeding when call unlock', () => {
        result = instance.unlock(1n).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(2n).verify()
        expect(result.success, result.error).to.be.false
      });

      it('should succeeding when call unlock1', () => {
        result = instance.unlock2(4n).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should succeeding when call unlock', () => {
        result = instance.unlock2(2n).verify()
        expect(result.success, result.error).to.be.false
      });

    });

    describe('LibAsReturn4 test', () => {
      let instance, result;

      const Test = buildContractClass(loadArtifact('LibAsReturn4.json'));

      before(() => {
        instance = new Test(1n);
      });

      it('should succeeding when call unlock', () => {
        result = instance.unlock(1n).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should succeeding when call unlock', () => {
        result = instance.unlock(2n).verify()
        expect(result.success, result.error).to.be.true
      });

    });
  })

  describe('Library as function param', () => {
    describe('LibAsParam1 test', () => {
      const Test = buildContractClass(loadArtifact('LibAsParam1.json'));
      let instance, result;

      before(() => {
        instance = new Test(1n);
      });

      it('should succeeding when call unlock', () => {
        result = instance.unlock(2n).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(1n).verify()
        expect(result.success, result.error).to.be.false
      });

    });

    describe('LibAsParam2 test', () => {
      const Test = buildContractClass(loadArtifact('LibAsParam2.json'));
      let instance, result;

      before(() => {
        instance = new Test(1n, [2n]);
      });

      it('should succeeding when call unlock', () => {
        result = instance.unlock(1n).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(2n).verify()
        expect(result.success, result.error).to.be.false
      });

    });

    describe('LibAsParam3 test', () => {
      const Test = buildContractClass(loadArtifact('LibAsParam3.json'));
      let instance, result;

      before(() => {
        instance = new Test(1n, [1n, 1n]);
      });

      it('should succeeding when call unlock', () => {
        result = instance.unlock(1n).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock', () => {
        result = instance.unlock(2n).verify()
        expect(result.success, result.error).to.be.false
      });
    });
  })

  describe('Library as state property', () => {
    describe('LibAsState1 test', () => {
      let instance, result;
      const Test = buildContractClass(loadArtifact('LibAsState1.json'));
      let l = [1n, {
        x: 1n,
        c: true,
        aa: [1n, 1n, 1n]
      }];

      before(() => {
        instance = new Test(l);
      });

      it('should succeeding when call unlock', () => {

        let newLockingScript = instance.getNewStateScript({
          l: {
            x: 6n,
            st: {
              x: 1n,
              c: false,
              aa: [1n, 1n, 1n]
            }
          }
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

        result = instance.unlock(1n, SigHashPreimage(preimage)).verify()
        expect(result.success, result.error).to.be.true

      });

      it('should fail when call unlock with error state', () => {

        let newLockingScript = instance.getNewStateScript({
          l: {
            x: 5n,
            st: {
              x: 1n,
              c: false,
              aa: [1n, 1n, 1n]
            }
          }
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

        result = instance.unlock(1n, SigHashPreimage(preimage)).verify()
        expect(result.success, result.error).to.be.false
      });

      it('should fail when call unlock with error state', () => {

        let newLockingScript = instance.getNewStateScript({
          l: {
            x: 6n,
            st: {
              x: 1n,
              c: true,
              aa: [1n, 1n, 1n]
            }
          }
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

        result = instance.unlock(1n, SigHashPreimage(preimage)).verify()
        expect(result.success, result.error).to.be.false
      });

      it('should succeeding when only update one field', () => {

        let newLockingScript = instance.getNewStateScript({
          l: {
            x: 6n,
            st: {
              x: 1n,
              c: false,
              aa: [1n, 1n, 1n]
            }
          }
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

        result = instance.unlock(1n, SigHashPreimage(preimage)).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should fail when call unlock with error state', () => {

        let newLockingScript = instance.getNewStateScript({
          l: {
            x: 5n,
            st: {
              x: 1n,
              c: false,
              aa: [1n, 1n, 1n]
            }
          }
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

        result = instance.unlock(1n, SigHashPreimage(preimage)).verify()
        expect(result.success, result.error).to.be.false
      });
    });
  })
})

