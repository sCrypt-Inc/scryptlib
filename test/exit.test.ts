import { expect } from 'chai'
import { loadDescription, newTx } from './helper'
import { buildContractClass } from '../src/contract'
import { bsv, toHex, getPreimage, } from '../src/utils'
import { SigHashPreimage, Ripemd160 } from '../src/scryptTypes'

const privateKey = bsv.PrivateKey.fromRandom('testnet')
const publicKey = privateKey.publicKey
const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
const inputSatoshis = 100000
const tx = newTx(inputSatoshis)



describe('test.Exit', () => {
    describe('check exit', () => {
        let exit;

        before(() => {
            const jsonDescr = loadDescription('exit_desc.json')
            const Exit = buildContractClass(jsonDescr)
            exit = new Exit(0)
        })

        it('test unlock', () => {

            const result = exit.unlock(0).verify()

            expect(result.success, result.error).to.be.true;

        })

        it('test unlock if', () => {

            const result = exit.unlockif(1).verify()

            expect(result.success, result.error).to.be.true;

        })

        it('test unlockelse', () => {

            const result = exit.unlockelse(-1).verify()

            expect(result.success, result.error).to.be.true;

        })


        it('test unlockloopif', () => {

            const result = exit.unlockloopif(1).verify()

            expect(result.success, result.error).to.be.true;

        })

        it('test unlockifif', () => {

            const result = exit.unlockifif(1).verify()

            expect(result.success, result.error).to.be.true;

        })

        it('test unlockfalse', () => {

            const result = exit.unlockfalse(1).verify()
            expect(result.success, result.error).to.be.false;
        })

    })
})
