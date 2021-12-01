import { expect } from 'chai'
import { loadDescription, newTx } from './helper'
import { AbstractContract, buildContractClass } from '../src/contract'
import { bsv, toHex, getPreimage, buildOpreturnScript, getLowSPreimage } from '../src/utils'
import { SigHashPreimage, Ripemd160 } from '../src/scryptTypes'

const privateKey = new bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
const inputSatoshis = 100000
const tx = newTx(inputSatoshis)

const jsonDescr = loadDescription('p2pkh_desc.json')
const DemoP2PKH = buildContractClass(jsonDescr)
const p2pkh = new DemoP2PKH(new Ripemd160(toHex(pubKeyHash)))
const inputIndex = 0;

const outputAmount = 222222

describe('Preimage', () => {
  describe('check preimage parts', () => {
    let preimage: SigHashPreimage

    before(() => {
      preimage = getPreimage(tx, p2pkh.lockingScript.cropCodeseparators(0), inputSatoshis, 0)
    })

    it('outpoint', () => {
      const outpoint = preimage.outpoint
      expect(outpoint.hash).is.eq('a477af6b2667c29670467e4e0728b685ee07b240235771862318e29ddbe58458')
      expect(outpoint.index).is.eq(0)
      expect(outpoint.hex).is.eq('5884e5db9de218238671572340b207ee85b628074e7e467096c267266baf77a400000000')
    })

    it('scriptCode', () => {
      const scriptCode = preimage.scriptCode
      const hex = p2pkh.lockingScript.toHex()
      expect(scriptCode).is.eq(hex)
    })
  })


  describe('check OCSPreimage', () => {
    let ocsPreimage: AbstractContract;

    before(() => {
      const jsonDescr = loadDescription('OCSPreimage_desc.json')
      const OCSPreimage = buildContractClass(jsonDescr)
      ocsPreimage = new OCSPreimage(1)
    })

    it('should success when using cropped preimage', () => {


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
      const preimage = getPreimage(tx, ocsPreimage.lockingScript.cropCodeseparators(0), inputSatoshis)

      const result = ocsPreimage.unlock(new SigHashPreimage(toHex(preimage))).verify()
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

      const result = ocsPreimage.unlock(new SigHashPreimage(toHex(preimage))).verify()
      expect(result.success, result.error).to.be.false

    })



    it('checkPreimageOptOCS should success when using right cropped preimage', () => {


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


      const preimage = getLowSPreimage(tx, ocsPreimage.lockingScript.cropCodeseparators(1), inputSatoshis)

      const result = ocsPreimage.unlock0(new SigHashPreimage(toHex(preimage))).verify()
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


      const preimage = getLowSPreimage(tx, ocsPreimage.lockingScript.cropCodeseparators(0), inputSatoshis)

      const result = ocsPreimage.unlock0(new SigHashPreimage(toHex(preimage))).verify()
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

      const result = ocsPreimage.unlock0(new SigHashPreimage(toHex(preimage))).verify()
      expect(result.success, result.error).to.be.false
    })

  })

})
