import { expect } from 'chai'
import { loadArtifact } from './helper'
import { buildContractClass } from '../src/contract'
import { bsv, Ripemd160, toHex, Sig, PubKey } from '../src'

describe('test.P2PKH with NOP', () => {

    const privateKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet);
    const publicKey = bsv.PublicKey.fromPrivateKey(privateKey);
    const publicKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());

    it('should unlock success', () => {

        const DemoP2PKH = buildContractClass(loadArtifact('p2pkh.json'))
        let p2pkh = new DemoP2PKH(Ripemd160(toHex(publicKeyHash)))
        let nopScript = bsv.Script.fromASM("OP_NOP");
        p2pkh.prependNOPScript(nopScript)

        const inputIndex = 0;
        expect(p2pkh.lockingScript.toASM().startsWith("OP_NOP")).to.true

        let callTx = new bsv.Transaction()
            .addDummyInput(p2pkh.lockingScript, 1000)
            .change(bsv.Transaction.DUMMY_PRIVATEKEY.toAddress())
            .setInputScript({
                inputIndex,
                privateKey
            }, (tx) => {
                return p2pkh.unlock(Sig(tx.getSignature(0) as string), PubKey(toHex(publicKey))).toScript();
            })
            .seal();


        // verify all tx inputs
        expect(callTx.verify()).to.be.true

        // just verify the contract inputs
        expect(callTx.verifyInputScript(0).success).to.true

    })


    it('should throw with inValid nopscript', () => {
        const DemoP2PKH = buildContractClass(loadArtifact('p2pkh.json'))
        let p2pkh = new DemoP2PKH(Ripemd160(toHex(publicKeyHash)))
        expect(() => {
            p2pkh.prependNOPScript(bsv.Script.fromASM("OP_1 OP_IF OP_1 OP_ENDIF"))
        }).to.throw(/NopScript should be a script that does not affect the Bitcoin virtual machine stack\./)


        expect(() => {
            p2pkh.prependNOPScript(bsv.Script.fromASM("OP_1 OP_RETURN"))
        }).to.throw(/NopScript should be a script that does not affect the Bitcoin virtual machine stack\./)
    })
})
