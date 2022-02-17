
import { assert, expect } from 'chai';
import { newTx, loadDescription } from './helper';
import { buildContractClass, buildTypeClasses } from '../src/contract';
import { Bytes, Int } from '../src/scryptTypes';


const jsonDescr = loadDescription('mdarray_desc.json');
const MDArray = buildContractClass(jsonDescr);
const { ST1, AliasST2, ST3 } = buildTypeClasses(jsonDescr);

describe('MDArray test', () => {

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

    it('should succeeding when call unlock', () => {
      result = mdArray.unlock([[3, 1, 2], [4, 5, new Int(6)]], [1, 32]).verify()
      expect(result.success, result.error).to.be.true
    });


    it('should fail', () => {
      result = mdArray.unlock([[3, 2, 2], [4, 5, 6]], [1, 32]).verify()
      expect(result.success, result.error).to.be.false
    });

    it('should throw', () => {
      expect(() => {
        mdArray.unlock([[3, 2, 2], [4, 5, 6, 1]], [1, 32]).verify()
      }).to.throw('The type of P1 is wrong, should be int[2][3]');
    });

    it('should succeeding when call unlockST1', () => {
      result = mdArray.unlockST1([new ST1({
        x: false,
        y: new Bytes("68656c6c6f20776f726c6421"),
        i: 1
      }), new ST1({
        y: new Bytes("68656c6c6f20776f726c6420"),
        x: true,
        i: 2
      })]).verify()
      expect(result.success, result.error).to.be.true
    });

    it('should succeeding when call unlockAliasST1', () => {
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
          y: [4, 5, 6]
        })
      })]).verify()
      expect(result.success, result.error).to.be.true
    });


    it('should succeeding when call unlockMDArrayST1', () => {
      result = mdArray.unlockMDArrayST1([[[new ST1({
        x: false,
        y: new Bytes("aa"),
        i: 1
      }), new ST1({
        y: new Bytes("bb"),
        x: true,
        i: 2
      })], [new ST1({
        x: false,
        y: new Bytes("cc"),
        i: 3
      }), new ST1({
        y: new Bytes("dd"),
        x: true,
        i: 4
      })]], [[new ST1({
        x: false,
        y: new Bytes("ee"),
        i: 5
      }), new ST1({
        y: new Bytes("ff"),
        x: true,
        i: 6
      })], [new ST1({
        x: false,
        y: new Bytes("00"),
        i: 7
      }), new ST1({
        y: new Bytes("11"),
        x: true,
        i: 8
      })]]]).verify()
      expect(result.success, result.error).to.be.true
    });

  });
});