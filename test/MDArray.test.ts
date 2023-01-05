
import { assert, expect } from 'chai';
import { newTx, loadArtifact } from './helper';
import { buildContractClass } from '../src/contract';
import { Bytes, Int } from '../src/scryptTypes';


const jsonArtifact = loadArtifact('mdarray.json');
const MDArray = buildContractClass(jsonArtifact);

describe('MDArray test', () => {

  describe('check MDArray', () => {
    let mdArray, result;

    before(() => {
      mdArray = new MDArray([[
        [1n, 2n, 3n, 4n],
        [5n, 6n, 7n, 8n],
        [9n, 10n, 11n, 12n]
      ],
      [
        [13n, 14n, 15n, 16n],
        [17n, 18n, 19n, 20n],
        [21n, 22n, 23n, 24n]
      ]]);
    });

    it('should succeeding when call unlock', () => {
      result = mdArray.unlock([[3n, 1n, 2n], [4n, 5n, Int(6)]], [1n, 32n]).verify()
      expect(result.success, result.error).to.be.true
    });


    it('should fail', () => {
      result = mdArray.unlock([[3n, 2n, 2n], [4n, 5n, 6n]], [1n, 32n]).verify()
      expect(result.success, result.error).to.be.false
    });

    it('should throw', () => {
      expect(() => {
        mdArray.unlock([[3n, 2n, 2n], [4n, 5n, 6n, 1n]], [1n, 32n]).verify()
      }).to.throw('The type of P1 is wrong, expected a array with length = 3 but got a array with length = 4');
    });

    it('should succeeding when call unlockST1', () => {
      result = mdArray.unlockST1([{
        x: false,
        y: "68656c6c6f20776f726c6421",
        i: 1n
      }, {
        y: Bytes("68656c6c6f20776f726c6420"),
        x: true,
        i: 2n
      }]).verify()
      expect(result.success, result.error).to.be.true
    });

    it('should succeeding when call unlockAliasST1', () => {
      result = mdArray.unlockAliasST2([{
        x: false,
        y: Bytes("68656c6c6f20776f726c6421"),
        st2: {
          x: false,
          y: [1n, 2n, 3n]
        }
      }, {
        y: Bytes("68656c6c6f20776f726c6420"),
        x: true,
        st2: {
          x: true,
          y: [4n, 5n, 6n]
        }
      }]).verify()
      expect(result.success, result.error).to.be.true
    });


    it('should succeeding when call unlockMDArrayST1', () => {
      result = mdArray.unlockMDArrayST1([[[{
        x: false,
        y: Bytes("aa"),
        i: 1n
      }, {
        y: Bytes("bb"),
        x: true,
        i: 2n
      }], [{
        x: false,
        y: Bytes("cc"),
        i: 3n
      }, {
        y: Bytes("dd"),
        x: true,
        i: 4n
      }]], [[{
        x: false,
        y: Bytes("ee"),
        i: 5n
      }, {
        y: Bytes("ff"),
        x: true,
        i: 6n
      }], [{
        x: false,
        y: Bytes("00"),
        i: 7n
      }, {
        y: Bytes("11"),
        x: true,
        i: 8n
      }]]]).verify()
      expect(result.success, result.error).to.be.true
    });

  });
});