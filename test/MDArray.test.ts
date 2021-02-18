
import { assert, expect } from 'chai';
import { newTx, loadDescription} from './helper';
import { DebugLaunch} from '../src/abi';
import { buildContractClass, VerifyError, buildTypeClasses } from '../src/contract';
import { bsv, toHex, signTx, compileContract ,num2bin, getPreimage, uri2path} from '../src/utils';
import { Bytes, PubKey, Sig, Ripemd160, Bool, Struct, SigHashPreimage} from '../src/scryptTypes';
import { readFileSync } from 'fs';


const jsonDescr = loadDescription('mdarray_desc.json');
const MDArray = buildContractClass(jsonDescr);


describe('MDArray test', () => {

    describe('check VerifyError ackermann.scrypt', () => {
      let mdArray, result;
    
      before(() => {
        mdArray = new MDArray();
      });


      console.log('aaaa', typeof [3,3])
    
      it('stop at ackermann.scrypt#38', () => {
        result = mdArray.unlock(15, 5).verify()
        expect(result.error).to.contains("ackermann.scrypt#38");
      });
    });

});