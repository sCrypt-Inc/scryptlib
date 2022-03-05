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


        function buildSendTx() {
            map.set(pkhReceiver, mintAmount - sendAmount);
            map.set(pkhReceiver1, sendAmount);
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
            const tx = buildSendTx();
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

    })

})
