import { expect } from 'chai'
import { loadDescription, newTx } from './helper'
import { buildContractClass } from '../src/contract'
import { PubKey, PubKeyHash, SigHashPreimage, Sig } from '../src/scryptTypes'
import { bsv, getPreimage, signTx } from '../src/utils';
import { toHex } from '../src';
const inputIndex = 0;
const inputSatoshis = 100000;
const outputAmount = inputSatoshis

const privateKey = bsv.PrivateKey.fromRandom('testnet')
const publicKey = PubKey(toHex(privateKey.publicKey))
const pkh = PubKeyHash(toHex(bsv.crypto.Hash.sha256ripemd160(privateKey.publicKey.toBuffer())))

const privateKeyReceiver = bsv.PrivateKey.fromRandom('testnet')
const publicKeyReceiver = PubKey(toHex(privateKeyReceiver.publicKey))
const pkhReceiver = PubKeyHash(toHex(bsv.crypto.Hash.sha256ripemd160(privateKeyReceiver.publicKey.toBuffer())))

const privateKeyReceiver1 = bsv.PrivateKey.fromRandom('testnet')
const publicKeyReceiver1 = PubKey(toHex(privateKeyReceiver1.publicKey))
const pkhReceiver1 = PubKeyHash(toHex(bsv.crypto.Hash.sha256ripemd160(privateKeyReceiver1.publicKey.toBuffer())))


describe('Coin.test', () => {

    const jsonDescr = loadDescription('Coin.json')
    const Coin = buildContractClass(jsonDescr)

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
                balances: Coin.toHashedMap(map, "HashedMap<PubKeyHash, int>"),
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
                balances: Coin.toHashedMap(map, "HashedMap<PubKeyHash, int>"),
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

            const result = coin.mint({
                item: pkhReceiver,
                idx: Coin.findKeyIndex(map, pkhReceiver, "PubKeyHash")
            }, mintAmount, SigHashPreimage(preimage), Sig(sig), publicKey, 0n).verify()
            expect(result.success, result.error).to.be.true;
            coin.balances = Coin.toHashedMap(map, "HashedMap<PubKeyHash, int>")
            coin.minter = pkh
        })


        it('test send', () => {
            const oldKeyIndex = Coin.findKeyIndex(map, pkhReceiver, "PubKeyHash")
            const tx = buildSendTx(pkhReceiver, mintAmount - sendAmount, pkhReceiver1, sendAmount);
            const preimage = getPreimage(tx, coin.lockingScript, inputSatoshis);

            const sig = signTx(tx, privateKeyReceiver, coin.lockingScript, inputSatoshis);

            const result = coin.send({
                item: pkhReceiver1,
                idx: Coin.findKeyIndex(map, pkhReceiver1, "PubKeyHash")
            }, sendAmount, SigHashPreimage(preimage), Sig(sig),
                publicKeyReceiver,
                mintAmount,
                oldKeyIndex,
                0n).verify()
            expect(result.success, result.error).to.be.true;
            coin.balances = Coin.toHashedMap(map, "HashedMap<PubKeyHash, int>")
        })

        it('test send: should succeeding when receiver more coin', () => {

            const oldKeyIndex = Coin.findKeyIndex(map, pkhReceiver, "PubKeyHash")
            const tx = buildSendTx(pkhReceiver, mintAmount - sendAmount - sendAmount, pkhReceiver1, sendAmount + sendAmount);
            const preimage = getPreimage(tx, coin.lockingScript, inputSatoshis);

            const sig = signTx(tx, privateKeyReceiver, coin.lockingScript, inputSatoshis);

            const result = coin.send({
                item: pkhReceiver1,
                idx: Coin.findKeyIndex(map, pkhReceiver1, "PubKeyHash")
            }, sendAmount, SigHashPreimage(preimage), Sig(sig),
                publicKeyReceiver,
                mintAmount - sendAmount,
                oldKeyIndex,
                sendAmount).verify()
            expect(result.success, result.error).to.be.true;
            coin.balances = Coin.toHashedMap(map, "HashedMap<PubKeyHash, int>")
        })


        it('should fail when sender have not coin', () => {

            const privateKeyFake = bsv.PrivateKey.fromRandom('testnet')
            const publicKeyFake = PubKey(toHex(privateKeyFake.publicKey))
            const pkhFake = PubKeyHash(toHex(bsv.crypto.Hash.sha256ripemd160(privateKeyFake.publicKey.toBuffer())))


            const fake_balances_msgSender = 10000n;
            const balances_receiver = sendAmount * 2n;

            const tx = buildSendTx(pkhFake, fake_balances_msgSender - sendAmount, pkhReceiver1, sendAmount * 3n);
            const preimage = getPreimage(tx, coin.lockingScript, inputSatoshis);

            const sig = signTx(tx, privateKeyFake, coin.lockingScript, inputSatoshis);

            let result = coin.send({
                item: pkhReceiver1,
                idx: Coin.findKeyIndex(map, pkhReceiver1, "PubKeyHash")
            }, sendAmount, SigHashPreimage(preimage), Sig(sig),
                publicKeyFake,
                fake_balances_msgSender,
                0n,
                balances_receiver).verify()
            expect(result.success, result.error).to.be.false;

            result = coin.send({
                item: pkhReceiver1,
                idx: Coin.findKeyIndex(map, pkhReceiver1, "PubKeyHash")
            }, sendAmount, SigHashPreimage(preimage), Sig(sig),
                publicKeyFake,
                fake_balances_msgSender,
                1n,
                balances_receiver).verify()
            expect(result.success, result.error).to.be.false;

            result = coin.send({
                item: pkhReceiver1,
                idx: Coin.findKeyIndex(map, pkhReceiver1, "PubKeyHash")
            }, sendAmount, SigHashPreimage(preimage), Sig(sig),
                publicKeyFake,
                fake_balances_msgSender,
                2n,
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

            const oldKeyIndex = Coin.findKeyIndex(map, pkhReceiver, "PubKeyHash")
            const tx = buildSendTx(pkhReceiver, balances_sender - sendAmount, pkhReceiver1, balances_receiver + sendAmount);
            const preimage = getPreimage(tx, coin.lockingScript, inputSatoshis);

            const sig = signTx(tx, privateKeyReceiver, coin.lockingScript, inputSatoshis);

            const result = coin.send({
                item: pkhReceiver1,
                idx: Coin.findKeyIndex(map, pkhReceiver1, "PubKeyHash")
            }, sendAmount, SigHashPreimage(preimage), Sig(sig),
                publicKeyReceiver,
                balances_sender,
                oldKeyIndex,
                balances_receiver).verify()
            expect(result.success, result.error).to.be.false;
            expect(result.error).to.contains("Coin.scrypt#53")
        })

    })

})
