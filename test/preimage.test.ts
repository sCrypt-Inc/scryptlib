import { expect } from 'chai';
import { loadDescription, newTx } from './helper';
import { buildContractClass } from '../src/contract';
import { bsv, toHex, getPreimage, compileContract } from '../src/utils';
import { SigHashPreimage, Ripemd160 } from '../src/scryptTypes';

const privateKey = bsv.PrivateKey.fromRandom('testnet');
const publicKey = privateKey.publicKey;
const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());
const inputSatoshis = 100000;
const tx = newTx(inputSatoshis);

const jsonDescr = loadDescription('p2pkh_desc.json');
const DemoP2PKH = buildContractClass(jsonDescr);
const p2pkh = new DemoP2PKH(new Ripemd160(toHex(pubKeyHash)));

describe('Preimage', () => {
  describe('check preimage parts', () => {
    let preimage: SigHashPreimage;

    before(() => {
      preimage = getPreimage(tx, p2pkh.lockingScript.toASM(), inputSatoshis, 0);
    });

    it('outpoint', () => {
      const outpoint = preimage.outpoint;
      expect(outpoint.hash).is.eq(
        'a477af6b2667c29670467e4e0728b685ee07b240235771862318e29ddbe58458'
      );
      expect(outpoint.index).is.eq(0);
      expect(outpoint.hex).is.eq(
        '5884e5db9de218238671572340b207ee85b628074e7e467096c267266baf77a400000000'
      );
    });

    it('scriptCode', () => {
      const scriptCode = preimage.scriptCode;
      const hex = p2pkh.lockingScript.toHex();
      expect(scriptCode).is.eq(hex);
    });
  });
});
