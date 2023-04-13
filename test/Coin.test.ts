import { expect } from 'chai'
import { loadArtifact, newTx } from './helper'
import { buildContractClass } from '../src/contract'
import { PubKey, PubKeyHash, SigHashPreimage, Sig, getSortedItem } from '../src/scryptTypes'
import { bsv, getPreimage, signTx } from '../src/utils';
import { toHex } from '../src';
const inputIndex = 0;
const inputSatoshis = 100000;
const outputAmount = inputSatoshis

const privateKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
const publicKey = PubKey(toHex(privateKey.publicKey))
const pkh = PubKeyHash(toHex(bsv.crypto.Hash.sha256ripemd160(privateKey.publicKey.toBuffer())))

const privateKeyReceiver = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
const publicKeyReceiver = PubKey(toHex(privateKeyReceiver.publicKey))
const pkhReceiver = PubKeyHash(toHex(bsv.crypto.Hash.sha256ripemd160(privateKeyReceiver.publicKey.toBuffer())))

const privateKeyReceiver1 = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
const publicKeyReceiver1 = PubKey(toHex(privateKeyReceiver1.publicKey))
const pkhReceiver1 = PubKeyHash(toHex(bsv.crypto.Hash.sha256ripemd160(privateKeyReceiver1.publicKey.toBuffer())))


describe('Coin.test', () => {

    const jsonArtifact = loadArtifact('Coin.json')
    const Coin = buildContractClass(jsonArtifact)

    describe('Coin.test', () => {
        let coin;

        let map = new Map<PubKeyHash, bigint>();

        const mintAmount = 10000n;
        const sendAmount = 1000n;

        before(() => {

            coin = new Coin(pkh)
        })

        function buildmintTx() {

            map.set(pkhReceiver, mintAmount);
            let newLockingScript = coin.getNewStateScript({
                balances: map,
                minter: pkh
            });

            const tx = newTx(inputSatoshis);
            tx.addOutput(new bsv.Transaction.Output({
                script: newLockingScript,
                satoshis: outputAmount
            }))

            coin.txContext = {
                tx: tx,
                inputIndex,
                inputSatoshis
            }

            return tx;
        }


        function buildSendTx(r1: PubKeyHash, r1Amount: bigint, r2: PubKeyHash, r2Amount: bigint) {
            map.set(r1, r1Amount);
            map.set(r2, r2Amount);
            let newLockingScript = coin.getNewStateScript({
                balances: map,
                minter: pkh
            });

            const tx = newTx(inputSatoshis);
            tx.addOutput(new bsv.Transaction.Output({
                script: newLockingScript,
                satoshis: outputAmount
            }))

            coin.txContext = {
                tx: tx,
                inputIndex,
                inputSatoshis
            }

            return tx;
        }


        it('test mint', () => {
            const tx = buildmintTx();
            const preimage = getPreimage(tx, coin.lockingScript, inputSatoshis);

            const sig = signTx(tx, privateKey, coin.lockingScript, inputSatoshis);

            const result = coin.mint(getSortedItem(map, pkhReceiver), mintAmount, SigHashPreimage(preimage), Sig(sig), publicKey, 0n).verify()
            expect(result.success, result.error).to.be.true;
            coin.balances = map
            coin.minter = pkh
        })


        it('test send', () => {
            const key_sender = getSortedItem(map, pkhReceiver);
            const tx = buildSendTx(pkhReceiver, mintAmount - sendAmount, pkhReceiver1, sendAmount);
            const preimage = getPreimage(tx, coin.lockingScript, inputSatoshis);

            const sig = signTx(tx, privateKeyReceiver, coin.lockingScript, inputSatoshis);

            const result = coin.send(getSortedItem(map, pkhReceiver1), key_sender, sendAmount, SigHashPreimage(preimage), Sig(sig),
                publicKeyReceiver,
                mintAmount,
                0n).verify()
            expect(result.success, result.error).to.be.true;
            coin.balances = map
        })

        it('test send: should succeeding when receiver more coin', () => {
            const tx = buildSendTx(pkhReceiver, mintAmount - sendAmount - sendAmount, pkhReceiver1, sendAmount + sendAmount);
            const preimage = getPreimage(tx, coin.lockingScript, inputSatoshis);

            const sig = signTx(tx, privateKeyReceiver, coin.lockingScript, inputSatoshis);

            const result = coin.send(getSortedItem(map, pkhReceiver1), getSortedItem(map, pkhReceiver), sendAmount, SigHashPreimage(preimage), Sig(sig),
                publicKeyReceiver,
                mintAmount - sendAmount,
                sendAmount).verify()
            expect(result.success, result.error).to.be.true;
            coin.balances = map
        })


        it('should fail when sender have not coin', () => {

            const privateKeyFake = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
            const publicKeyFake = PubKey(toHex(privateKeyFake.publicKey))
            const pkhFake = PubKeyHash(toHex(bsv.crypto.Hash.sha256ripemd160(privateKeyFake.publicKey.toBuffer())))


            const fake_balances_msgSender = 10000n;
            const balances_receiver = sendAmount * 2n;

            const tx = buildSendTx(pkhFake, fake_balances_msgSender - sendAmount, pkhReceiver1, sendAmount * 3n);
            const preimage = getPreimage(tx, coin.lockingScript, inputSatoshis);

            const sig = signTx(tx, privateKeyFake, coin.lockingScript, inputSatoshis);

            let result = coin.send(getSortedItem(map, pkhReceiver1), getSortedItem(map, pkhFake), sendAmount, SigHashPreimage(preimage), Sig(sig),
                publicKeyFake,
                fake_balances_msgSender,
                balances_receiver).verify()
            expect(result.success, result.error).to.be.false;


            //must reset map to make  not affecting test below.
            map.set(pkhReceiver1, sendAmount * 2n);
            map.delete(pkhFake);
        })

        it('should fail when sender send too much coin', () => {
            const sendAmount = 10000n;
            const balances_receiver = 2000n;
            const balances_sender = 8000n;
            const key_sender = getSortedItem(map, pkhReceiver);
            const tx = buildSendTx(pkhReceiver, balances_sender - sendAmount, pkhReceiver1, balances_receiver + sendAmount);
            const preimage = getPreimage(tx, coin.lockingScript, inputSatoshis);

            const sig = signTx(tx, privateKeyReceiver, coin.lockingScript, inputSatoshis);

            const result = coin.send(getSortedItem(map, pkhReceiver1), key_sender, sendAmount, SigHashPreimage(preimage), Sig(sig),
                publicKeyReceiver,
                balances_sender,
                balances_receiver).verify()
            expect(result.success, result.error).to.be.false;
            expect(result.error).to.contains("Coin.scrypt#51")
        })

    })

})
