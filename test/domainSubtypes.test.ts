import { loadDescription } from './helper';
import { assert, expect } from 'chai';
import { buildContractClass } from '../src/contract';
import { PubKeyHash } from '../src/scryptTypes';
import { compileContract } from '../src/utils';


describe('Subtypes of bytes', () => {

  describe('PubKeyHash', () => {

    it('should succeed P2PKH with PubKeyHash in constructor', () => {
      let jsondesc = loadDescription('p2pkh_desc_w_pubkeyhash_type.json');
      let P2PKH = buildContractClass(jsondesc);

      expect(
          function() {
              new P2PKH(new PubKeyHash('76a9145b7dd156678833353de8c3193aafcef7b6c5d03f88ac'));
          }
      ).to.not.throw();
    })

  })


})
