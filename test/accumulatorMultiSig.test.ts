import { expect } from 'chai';
import { buildContractClass, PubKey, Ripemd160, Sig, signTx, toHex } from '../src';
import { loadArtifact, newTx } from './helper';
import { PrivateKey, Transaction } from '@bsv/sdk';

const inputSatoshis = 10000;
const inputIndex = 0;
describe('Test SmartContract `AccumulatorMultiSig`', () => {

    const privateKey1 = PrivateKey.fromRandom();
    const publicKey1 = privateKey1.toPublicKey();
    const publicKeyHash1 = publicKey1.toHash('hex');


    const privateKey2 = PrivateKey.fromRandom();
    const publicKey2 = privateKey2.toPublicKey()
    const publicKeyHash2 = publicKey2.toHash('hex')


    const privateKey3 = PrivateKey.fromRandom();
    const publicKey3 = privateKey3.toPublicKey()
    const publicKeyHash3 = publicKey3.toHash('hex')


    const privateKeyWrong = PrivateKey.fromRandom();
    const publicKeyWrong = privateKeyWrong.toPublicKey()


    let accumulatorMultiSig, result

    before(() => {
        const AccumulatorMultiSig = buildContractClass(loadArtifact('accumulatorMultiSig.json'))
        accumulatorMultiSig = new AccumulatorMultiSig(2n,
            [Ripemd160(toHex(publicKeyHash1)), Ripemd160(toHex(publicKeyHash2)), Ripemd160(toHex(publicKeyHash3))]);

    });
    it('should successfully with all three right.', () => {


        const tx = newTx(inputSatoshis);

        const sig1 = signTx(tx, privateKey1, accumulatorMultiSig.lockingScript, inputSatoshis);

        const sig2 = signTx(tx, privateKey2, accumulatorMultiSig.lockingScript, inputSatoshis);

        const sig3 = signTx(tx, privateKey3, accumulatorMultiSig.lockingScript, inputSatoshis);

        const context = { tx, inputIndex, inputSatoshis }
        accumulatorMultiSig.txContext = context;
        let result = accumulatorMultiSig.main([PubKey(toHex(publicKey1)), PubKey(toHex(publicKey2)), PubKey(toHex(publicKey3))],
            [Sig(sig1), Sig(sig2), Sig(sig3)], [true, true, true]).verify();

        expect(result.success, result.error).to.eq(true);

    })

    // it('should successfully with all two right.', () => {


    //     const callTx = new Transaction().addInput(accumulatorMultiSig.lockingScript, inputSatoshis)
    //         .dummyChange()
    //         .setInputScript({
    //             inputIndex,
    //             privateKey: [privateKey1, privateKey2, privateKey3]
    //         }, (tx: bsv.Transaction) => {
    //             const sigs = tx.getSignature(inputIndex);
    //             return accumulatorMultiSig.main([PubKey(toHex(publicKey1)), PubKey(toHex(publicKey2)), PubKey(toHex(publicKey3))],
    //                 [Sig(sigs[0]), Sig(sigs[1]), Sig(sigs[2])], [true, true, true]).toScript();
    //         })

    //         .seal()

    //     // verify all tx inputs
    //     expect(callTx.verify()).to.be.true

    //     // just verify the contract inputs
    //     expect(callTx.verifyInputScript(0).success).to.true

    // })

    // it('should fail with only one right.', () => {


    //     const callTx = new Transaction()
    //         .addDummyInput(accumulatorMultiSig.lockingScript, inputSatoshis)
    //         .dummyChange()
    //         .setInputScript({
    //             inputIndex,
    //             privateKey: [privateKey1, privateKeyWrong, privateKeyWrong]
    //         }, (tx: bsv.Transaction) => {
    //             const sigs = tx.getSignature(inputIndex);
    //             return accumulatorMultiSig.main([PubKey(toHex(publicKey1)), PubKey(toHex(publicKey2)), PubKey(toHex(publicKey3))],
    //                 [Sig(sigs[0]), Sig(sigs[1]), Sig(sigs[2])], [true, false, false]).toScript();
    //         })
    //         .seal()

    //     // verify all tx inputs
    //     expect(callTx.verify()).to.be.eq('transaction input 0 VerifyError: SCRIPT_ERR_EVAL_FALSE_IN_STACK')

    //     // just verify the contract inputs
    //     expect(callTx.verifyInputScript(0).success).to.false

    // })


})