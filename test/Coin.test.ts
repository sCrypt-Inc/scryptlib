import { expect } from 'chai'
import { loadDescription, newTx } from './helper'
import { buildContractClass, buildTypeClasses } from '../src/contract'
import { PubKey, PubKeyHash } from '../src/scryptTypes'
import { bsv, toHex, getPreimage, findKeyIndex, toData, toHashedMap, signTx } from '../src/utils';
const inputIndex = 0;
const inputSatoshis = 100000;
const outputAmount = inputSatoshis

const privateKey = new bsv.PrivateKey.fromRandom('testnet')
const publicKey = new PubKey(toHex(privateKey.publicKey))
const pkh = new PubKeyHash(toHex(bsv.crypto.Hash.sha256ripemd160(privateKey.publicKey.toBuffer())))

const privateKeyReceiver = new bsv.PrivateKey.fromRandom('testnet')
const publicKeyReceiver = new PubKey(toHex(privateKeyReceiver.publicKey))
const pkhReceiver = new PubKeyHash(toHex(bsv.crypto.Hash.sha256ripemd160(privateKeyReceiver.publicKey.toBuffer())))

const privateKeyReceiver1 = new bsv.PrivateKey.fromRandom('testnet')
const publicKeyReceiver1 = new PubKey(toHex(privateKeyReceiver1.publicKey))
const pkhReceiver1 = new PubKeyHash(toHex(bsv.crypto.Hash.sha256ripemd160(privateKeyReceiver1.publicKey.toBuffer())))


describe('Coin.test', () => {
    describe('Coin.test', () => {
        let coin;

        let map = new Map<PubKeyHash, number>();

        const mintAmount = 10000;
        const sendAmount = 1000;

        before(() => {
            const jsonDescr = loadDescription('Coin_desc.json')
            const Coin = buildContractClass(jsonDescr)
            coin = new Coin(pkh)
        })

        function buildmintTx() {

            map.set(pkhReceiver, mintAmount);
            let newLockingScript = coin.getNewStateScript({
                balances: toHashedMap(map),
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


        function buildSendTx(r1, r1Amount, r2, r2Amount) {
            map.set(r1, r1Amount);
            map.set(r2, r2Amount);
            let newLockingScript = coin.getNewStateScript({
                balances: toHashedMap(map),
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

            const result = coin.mint(pkhReceiver, mintAmount, preimage, sig, publicKey, 0, findKeyIndex(map, pkhReceiver)).verify()
            expect(result.success, result.error).to.be.true;
            coin.balances = toHashedMap(map)
            coin.minter = pkh
        })


        it('test send', () => {
            const oldKeyIndex = findKeyIndex(map, pkhReceiver);
            const tx = buildSendTx(pkhReceiver, mintAmount - sendAmount, pkhReceiver1, sendAmount);
            const preimage = getPreimage(tx, coin.lockingScript, inputSatoshis);

            const sig = signTx(tx, privateKeyReceiver, coin.lockingScript, inputSatoshis);

            const result = coin.send(pkhReceiver1, sendAmount, preimage, sig,
                publicKeyReceiver,
                mintAmount,
                oldKeyIndex,
                0,
                findKeyIndex(map, pkhReceiver1)).verify()
            expect(result.success, result.error).to.be.true;
            coin.balances = toHashedMap(map)
        })

        it('test send: should succeeding when receiver more coin', () => {

            const oldKeyIndex = findKeyIndex(map, pkhReceiver);
            const tx = buildSendTx(pkhReceiver, mintAmount - sendAmount - sendAmount, pkhReceiver1, sendAmount + sendAmount);
            const preimage = getPreimage(tx, coin.lockingScript, inputSatoshis);

            const sig = signTx(tx, privateKeyReceiver, coin.lockingScript, inputSatoshis);

            const result = coin.send(pkhReceiver1, sendAmount, preimage, sig,
                publicKeyReceiver,
                mintAmount - sendAmount,
                oldKeyIndex,
                sendAmount,
                findKeyIndex(map, pkhReceiver1)).verify()
            expect(result.success, result.error).to.be.true;
            coin.balances = toHashedMap(map)
        })


        it('should fail when sender have not coin', () => {

            const privateKeyFake = new bsv.PrivateKey.fromRandom('testnet')
            const publicKeyFake = new PubKey(toHex(privateKeyFake.publicKey))
            const pkhFake = new PubKeyHash(toHex(bsv.crypto.Hash.sha256ripemd160(privateKeyFake.publicKey.toBuffer())))


            const fake_balances_msgSender = 10000;
            const balances_receiver = sendAmount * 2;

            const tx = buildSendTx(pkhFake, fake_balances_msgSender - sendAmount, pkhReceiver1, sendAmount * 3);
            const preimage = getPreimage(tx, coin.lockingScript, inputSatoshis);

            const sig = signTx(tx, privateKeyFake, coin.lockingScript, inputSatoshis);

            let result = coin.send(pkhReceiver1, sendAmount, preimage, sig,
                publicKeyFake,
                fake_balances_msgSender,
                0,
                balances_receiver,
                findKeyIndex(map, pkhReceiver1)).verify()
            expect(result.success, result.error).to.be.false;

            result = coin.send(pkhReceiver1, sendAmount, preimage, sig,
                publicKeyFake,
                fake_balances_msgSender,
                1,
                balances_receiver,
                findKeyIndex(map, pkhReceiver1)).verify()
            expect(result.success, result.error).to.be.false;

            result = coin.send(pkhReceiver1, sendAmount, preimage, sig,
                publicKeyFake,
                fake_balances_msgSender,
                2,
                balances_receiver,
                findKeyIndex(map, pkhReceiver1)).verify()
            expect(result.success, result.error).to.be.false;

            //must reset map to make  not affecting test below.
            map.set(pkhReceiver1, sendAmount * 2);
            map.delete(pkhFake);
        })

        it('should fail when sender send too much coin', () => {
            const sendAmount = 10000;
            const balances_receiver = 2000;
            const balances_sender = 8000;

            const oldKeyIndex = findKeyIndex(map, pkhReceiver);
            const tx = buildSendTx(pkhReceiver, balances_sender - sendAmount, pkhReceiver1, balances_receiver + sendAmount);
            const preimage = getPreimage(tx, coin.lockingScript, inputSatoshis);

            const sig = signTx(tx, privateKeyReceiver, coin.lockingScript, inputSatoshis);

            const result = coin.send(pkhReceiver1, sendAmount, preimage, sig,
                publicKeyReceiver,
                balances_sender,
                oldKeyIndex,
                balances_receiver,
                findKeyIndex(map, pkhReceiver1)).verify()
            expect(result.success, result.error).to.be.false;
            expect(result.error).to.contains("Coin.scrypt#51")
        })

    })

})
