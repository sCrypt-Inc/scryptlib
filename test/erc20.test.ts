
import { assert, expect } from 'chai';
import { newTx, loadDescription } from './helper';
import { buildContractClass, buildTypeClasses } from '../src/contract';
import { bsv, toHex, getPreimage, toHashedMap, signTx } from '../src/utils';
import { PubKey, findKeyIndex, SigHash } from '../src';

const inputIndex = 0;
const inputSatoshis = 100000;
const outputAmount = inputSatoshis

const tx = newTx(inputSatoshis);

const privateKeyMinter = new bsv.PrivateKey.fromRandom('testnet');
const publicKeyMinter = privateKeyMinter.publicKey;
const publicKeyHashMinter = bsv.crypto.Hash.sha256ripemd160(publicKeyMinter.toBuffer());

const privateKeyReceiver = new bsv.PrivateKey.fromRandom('testnet');
const publicKeyReceiver = privateKeyReceiver.publicKey;
const publicKeyHashReceiver = bsv.crypto.Hash.sha256ripemd160(privateKeyReceiver.toBuffer());


const receiver = new PubKey(toHex(publicKeyReceiver));
const sender = new PubKey(toHex(publicKeyMinter));

describe('Test sCrypt contract erc20 In Javascript', () => {
  let coin, preimage, result, map, erc20
  const Coin = buildContractClass(loadDescription('erc20_desc.json'))
  const { ERC20 } = buildTypeClasses(Coin)
  before(() => {
    map = new Map();
    erc20 = new ERC20(0, toHashedMap(map));
    erc20._totalSupply = 0
    erc20.balances = toHashedMap(map)
    coin = new Coin(new PubKey(toHex(publicKeyMinter)), erc20)
  });

  const FIRST_MINT = 1000000000;
  it('should succeed when mint coin', () => {


    map.set(sender, FIRST_MINT)

    const cloned = erc20.clone()

    cloned._totalSupply = FIRST_MINT
    cloned.balances = toHashedMap(map)

    let newLockingScript = coin.getNewStateScript({
      liberc20: cloned
    })


    const tx = newTx(inputSatoshis);
    tx.addOutput(new bsv.Transaction.Output({
      script: newLockingScript,
      satoshis: outputAmount
    }))


    preimage = getPreimage(tx, coin.lockingScript, inputSatoshis, 0, SigHash.SINGLE_FORKID)

    const sigMinter = signTx(tx, privateKeyMinter, coin.lockingScript, inputSatoshis, 0, SigHash.SINGLE_FORKID);

    // set txContext for verification
    coin.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }

    const keyIndex = findKeyIndex(map, sender);

    result = coin.mint(sender, sigMinter, 0, FIRST_MINT, keyIndex, preimage).verify()
    expect(result.success, result.error).to.be.true

    coin.liberc20 = cloned;
  });



  it('should succeed when transferFrom coin: 1000000 from Minter to Receiver ', () => {
    const amount = 1000000;

    const senderKeyIndex = findKeyIndex(map, sender);
    const senderBalance = FIRST_MINT;

    map.set(receiver, amount)
    map.set(sender, FIRST_MINT - amount)

    const cloned = coin.liberc20.clone()
    cloned.balances = toHashedMap(map)
    let newLockingScript = coin.getNewStateScript({
      liberc20: cloned
    })


    const tx = newTx(inputSatoshis);
    tx.addOutput(new bsv.Transaction.Output({
      script: newLockingScript,
      satoshis: outputAmount
    }))


    preimage = getPreimage(tx, coin.lockingScript, inputSatoshis, 0, SigHash.SINGLE_FORKID)

    const senderSig = signTx(tx, privateKeyMinter, coin.lockingScript, inputSatoshis, 0, SigHash.SINGLE_FORKID);

    // set txContext for verification
    coin.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }

    const receiverKeyIndex = findKeyIndex(map, receiver);
    const receiverBalance = 0;


    result = coin.transferFrom(sender, receiver, amount, senderSig, senderBalance, senderKeyIndex, receiverBalance, receiverKeyIndex, preimage).verify()
    expect(result.success, result.error).to.be.true

    coin.liberc20 = cloned;

  });



  it('should succeed when transferFrom coin: 50 from Receiver to Minter ', () => {
    const amount = 50;

    const senderKeyIndex = findKeyIndex(map, receiver);
    const senderBalance = 1000000;

    map.set(receiver, senderBalance - amount)
    map.set(sender, FIRST_MINT - 1000000 + amount)


    const cloned = coin.liberc20.clone()
    cloned.balances = toHashedMap(map)
    let newLockingScript = coin.getNewStateScript({
      liberc20: cloned
    })


    const tx = newTx(inputSatoshis);
    tx.addOutput(new bsv.Transaction.Output({
      script: newLockingScript,
      satoshis: outputAmount
    }))


    preimage = getPreimage(tx, coin.lockingScript, inputSatoshis, 0, SigHash.SINGLE_FORKID)

    const senderSig = signTx(tx, privateKeyReceiver, coin.lockingScript, inputSatoshis, 0, SigHash.SINGLE_FORKID);

    // set txContext for verification
    coin.txContext = {
      tx,
      inputIndex,
      inputSatoshis
    }

    const receiverKeyIndex = findKeyIndex(map, sender);
    const receiverBalance = FIRST_MINT - 1000000;


    result = coin.transferFrom(receiver, sender, amount, senderSig, senderBalance, senderKeyIndex, receiverBalance, receiverKeyIndex, preimage).verify()
    expect(result.success, result.error).to.be.true
  });


});