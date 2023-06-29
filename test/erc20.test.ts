
import { assert, expect } from 'chai';
import { newTx, loadArtifact } from './helper';
import { buildContractClass } from '../src/contract';
import { bsv, getPreimage, signTx } from '../src/utils';
import { PubKey, toHex } from '../src';
import { Sig, SignatureHashType, SigHashPreimage } from '../src/scryptTypes';

const inputIndex = 0;
const inputSatoshis = 100000;
const outputAmount = inputSatoshis


const privateKeyMinter = bsv.PrivateKey.fromRandom(bsv.Networks.testnet);
const publicKeyMinter = privateKeyMinter.publicKey;
const publicKeyHashMinter = bsv.crypto.Hash.sha256ripemd160(publicKeyMinter.toBuffer());

const privateKeyReceiver = bsv.PrivateKey.fromRandom(bsv.Networks.testnet);
const publicKeyReceiver = privateKeyReceiver.publicKey;
const publicKeyHashReceiver = bsv.crypto.Hash.sha256ripemd160(privateKeyReceiver.toBuffer());


const minter = PubKey(toHex(publicKeyMinter));
const receiver = PubKey(toHex(publicKeyReceiver));

describe('Test sCrypt contract erc20 In Javascript', () => {
  let coin, preimage, result, map: Map<PubKey, bigint>
  const Coin = buildContractClass(loadArtifact('erc20.json'))
  before(() => {
    map = new Map<PubKey, bigint>();
    coin = new Coin(PubKey(toHex(publicKeyMinter)), [0n, map])
  });

  const FIRST_MINT = 1000000000n;
  it('should succeed when mint coin', () => {

    map.set(minter, FIRST_MINT)

    let newLockingScript = coin.getNewStateScript({
      liberc20: {
        _totalSupply: FIRST_MINT,
        balances: map
      }
    })


    const tx = newTx(inputSatoshis);
    tx.addOutput(new bsv.Transaction.Output({
      script: newLockingScript,
      satoshis: outputAmount
    }))


    preimage = getPreimage(tx, coin.lockingScript, inputSatoshis, 0, SignatureHashType.SINGLE)

    const sigMinter = signTx(tx, privateKeyMinter, coin.lockingScript, inputSatoshis, 0, SignatureHashType.SINGLE);

    // set txContext for verification
    coin.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }

    const keyIndex = Coin.findKeyIndex(map, minter, "PubKey");

    result = coin.mint({
      item: minter,
      idx: keyIndex
    }, Sig(sigMinter), 0n, FIRST_MINT, SigHashPreimage(preimage)).verify()
    expect(result.success, result.error).to.be.true

    coin.liberc20 = {
      _totalSupply: FIRST_MINT,
      balances: map
    };
  });



  it('should succeed when transferFrom coin: 1000000 from Minter to Receiver ', () => {
    const amount = 1000000n;

    const sender = minter;

    const senderKeyIndex = Coin.findKeyIndex(map, minter, "PubKey");
    const senderBalance = FIRST_MINT;

    map.set(receiver, amount)
    map.set(sender, FIRST_MINT - amount)

    let newLockingScript = coin.getNewStateScript({
      liberc20: {
        _totalSupply: FIRST_MINT,
        balances: map
      }
    })


    const tx = newTx(inputSatoshis);
    tx.addOutput(new bsv.Transaction.Output({
      script: newLockingScript,
      satoshis: outputAmount
    }))


    preimage = getPreimage(tx, coin.lockingScript, inputSatoshis, 0, SignatureHashType.SINGLE)

    const senderSig = signTx(tx, privateKeyMinter, coin.lockingScript, inputSatoshis, 0, SignatureHashType.SINGLE);

    // set txContext for verification
    coin.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }

    const receiverKeyIndex = Coin.findKeyIndex(map, receiver, "PubKey");
    const receiverBalance = 0n;

    result = coin.transferFrom({
      item: sender,
      idx: senderKeyIndex
    }, {
      item: receiver,
      idx: receiverKeyIndex
    }, amount, Sig(senderSig), senderBalance, receiverBalance, SigHashPreimage(preimage)).verify()
    expect(result.success, result.error).to.be.true

    coin.liberc20 = {
      _totalSupply: FIRST_MINT,
      balances: map
    };

  });



  it('should succeed when transferFrom coin: 50 from Receiver to Minter ', () => {

    const senderPubKey = receiver;
    const senderPrivateKey = privateKeyReceiver;
    const receiverPubKey = minter;

    const amount = 50n;

    const senderKeyIndex = Coin.findKeyIndex(map, senderPubKey, "PubKey");
    const senderBalance = 1000000n;

    map.set(senderPubKey, senderBalance - amount)
    map.set(receiverPubKey, FIRST_MINT - 1000000n + amount)


    let newLockingScript = coin.getNewStateScript({
      liberc20: {
        _totalSupply: FIRST_MINT,
        balances: map
      }
    })


    const tx = newTx(inputSatoshis);
    tx.addOutput(new bsv.Transaction.Output({
      script: newLockingScript,
      satoshis: outputAmount
    }))


    preimage = getPreimage(tx, coin.lockingScript, inputSatoshis, 0, SignatureHashType.SINGLE)

    const senderSig = signTx(tx, senderPrivateKey, coin.lockingScript, inputSatoshis, 0, SignatureHashType.SINGLE);

    // set txContext for verification
    coin.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }

    const receiverKeyIndex = Coin.findKeyIndex(map, receiverPubKey, "PubKey");
    const receiverBalance = FIRST_MINT - 1000000n;

    result = coin.transferFrom({
      item: senderPubKey,
      idx: senderKeyIndex
    }, {
      item: receiverPubKey,
      idx: receiverKeyIndex
    }, amount, Sig(senderSig), senderBalance, receiverBalance, SigHashPreimage(preimage)).verify()
    expect(result.success, result.error).to.be.true
  });


});