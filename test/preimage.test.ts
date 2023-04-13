import { expect } from 'chai'
import { loadArtifact, newTx } from './helper'
import { AbstractContract, buildContractClass } from '../src/contract'
import { bsv, getPreimage, getLowSPreimage } from '../src/utils'
import { SigHashPreimage, Ripemd160 } from '../src/scryptTypes'
import { buildOpreturnScript, toHex } from '../src'

const privateKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
const publicKey = privateKey.publicKey
const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
const inputSatoshis = 100000
const tx = newTx(inputSatoshis)

const jsonArtifact = loadArtifact('p2pkh.json')
const DemoP2PKH = buildContractClass(jsonArtifact)
const p2pkh = new DemoP2PKH(Ripemd160(toHex(pubKeyHash)))
const inputIndex = 0;

const outputAmount = 222222

describe('Preimage', () => {


  describe('check OCSPreimage', () => {
    let ocsPreimage: AbstractContract;

    before(() => {
      const jsonArtifact = loadArtifact('OCSPreimage.json')
      const OCSPreimage = buildContractClass(jsonArtifact)
      ocsPreimage = new OCSPreimage(1n)
    })

    it('should succeeding when using cropped preimage', () => {


      const tx = newTx(inputSatoshis);
      tx.addOutput(new bsv.Transaction.Output({
        script: buildOpreturnScript("0001"),
        satoshis: outputAmount
      }))

      tx.setLockTime(333)

      ocsPreimage.txContext = {
        tx,
        inputIndex,
        inputSatoshis
      }
      const preimage = getPreimage(tx, ocsPreimage.lockingScript.subScript(0), inputSatoshis)

      const result = ocsPreimage.unlock(SigHashPreimage(preimage)).verify()
      expect(result.success, result.error).to.be.true


    })


    it('should FAIL when not using cropped preimage', () => {

      const tx = newTx(inputSatoshis);
      tx.addOutput(new bsv.Transaction.Output({
        script: buildOpreturnScript("0001"),
        satoshis: outputAmount
      }))

      ocsPreimage.txContext = {
        tx,
        inputIndex,
        inputSatoshis
      }
      const preimage = getPreimage(tx, ocsPreimage.lockingScript, inputSatoshis)

      const result = ocsPreimage.unlock(SigHashPreimage(preimage)).verify()
      expect(result.success, result.error).to.be.false

    })



    it('checkPreimageOptOCS should succeeding when using right cropped preimage', () => {


      const tx = newTx(inputSatoshis);
      tx.addOutput(new bsv.Transaction.Output({
        script: buildOpreturnScript("0001"),
        satoshis: outputAmount
      }))

      tx.setLockTime(11)

      ocsPreimage.txContext = {
        tx,
        inputIndex,
        inputSatoshis
      }


      const preimage = getLowSPreimage(tx, ocsPreimage.lockingScript.subScript(1), inputSatoshis)

      const result = ocsPreimage.unlock0(SigHashPreimage(preimage)).verify()
      expect(result.success, result.error).to.be.true
    })



    it('checkPreimageOptOCS should fail when using wrong cropped preimage', () => {


      const tx = newTx(inputSatoshis);
      tx.addOutput(new bsv.Transaction.Output({
        script: buildOpreturnScript("0001"),
        satoshis: outputAmount
      }))

      tx.setLockTime(11)

      ocsPreimage.txContext = {
        tx,
        inputIndex,
        inputSatoshis
      }


      const preimage = getLowSPreimage(tx, ocsPreimage.lockingScript.subScript(0), inputSatoshis)

      const result = ocsPreimage.unlock0(SigHashPreimage(preimage)).verify()
      expect(result.success, result.error).to.be.false
    })

    it('checkPreimageOptOCS should fail when using uncropped preimage', () => {

      const tx = newTx(inputSatoshis);
      tx.addOutput(new bsv.Transaction.Output({
        script: buildOpreturnScript("0001"),
        satoshis: outputAmount
      }))

      tx.setLockTime(11)

      ocsPreimage.txContext = {
        tx,
        inputIndex,
        inputSatoshis
      }


      const preimage = getLowSPreimage(tx, ocsPreimage.lockingScript, inputSatoshis)

      const result = ocsPreimage.unlock0(SigHashPreimage(preimage)).verify()
      expect(result.success, result.error).to.be.false
    })

  })

})
