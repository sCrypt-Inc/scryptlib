
import { assert, expect } from 'chai';
import { newTx, loadDescription} from './helper';
import { DebugLaunch} from '../src/abi';
import { buildContractClass, VerifyError, buildTypeClasses } from '../src/contract';
import { bsv, toHex, signTx, compileContract ,num2bin, getPreimage, uri2path} from '../src/utils';
import { Bytes, PubKey, Sig, Ripemd160, Bool, Struct, SigHashPreimage} from '../src/scryptTypes';
import { readFileSync } from 'fs';


const jsonDescr = loadDescription('mdarray_desc.json');
const MDArray = buildContractClass(jsonDescr);
const {ST1, AliasST1} = buildTypeClasses(jsonDescr);

describe('MDArray test', () => {

    describe('check MDArray', () => {
      let mdArray, result;
    
      before(() => {
        mdArray = new MDArray([ [
          [1, 2, 3, 4],
          [5, 6, 7, 8],
          [9, 10, 11, 12]
          ],
          [
          [13, 14, 15, 16],
          [17, 18, 19, 20],
          [21, 22, 23, 24]
          ] ]);
      });
    
      it('should success when call unlock', () => {
        result = mdArray.unlock([[3,1,2],[4,5,6]], [1,32]).verify()
        expect(result.success, result.error).to.be.true
      });


      it('should fail', () => {
        result = mdArray.unlock([[3,2,2],[4,5,6]], [1,32]).verify()
        expect(result.success, result.error).to.be.false
      });

      it('should throw', () => {
        expect(() => {
          mdArray.unlock([[3,2,2],[4,5,6, 1]], [1,32]).verify()
        }).to.throw('checkArray int[2][3] fail');
      });

      it('should success when call unlockST1', () => {
        result = mdArray.unlockST1([new ST1({
          x: false,
          y: new Bytes("68656c6c6f20776f726c6421")
        }), new ST1({
          y: new Bytes("68656c6c6f20776f726c6420"),
          x: true
        })]).verify()
        expect(result.success, result.error).to.be.true
      });

      it('should success when call unlockAliasST1', () => {
        result = mdArray.unlockAliasST1([new AliasST1({
          x: false,
          y: new Bytes("68656c6c6f20776f726c6421")
        }), new AliasST1({
          y: new Bytes("68656c6c6f20776f726c6420"),
          x: true
        })]).verify()
        expect(result.success, result.error).to.be.true
      });

    });
});