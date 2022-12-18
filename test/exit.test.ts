import { expect } from 'chai'
import { loadDescription, newTx } from './helper'
import { buildContractClass } from '../src/contract'
import { bsv } from '../src/utils'

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
            exit = new Exit(0n)
        })

        it('test unlock', () => {

            const result = exit.unlock(0n).verify()

            expect(result.success, result.error).to.be.true;

        })

        it('test unlock if', () => {

            const result = exit.unlockif(1n).verify()

            expect(result.success, result.error).to.be.true;

        })

        it('test unlockelse', () => {

            const result = exit.unlockelse(-1n).verify()

            expect(result.success, result.error).to.be.true;

        })


        it('test unlockloopif', () => {

            const result = exit.unlockloopif(1n).verify()

            expect(result.success, result.error).to.be.true;

        })

        it('test unlockifif', () => {

            const result = exit.unlockifif(1n).verify()

            expect(result.success, result.error).to.be.true;

        })

        it('test unlockfalse', () => {

            const result = exit.unlockfalse(1n).verify()
            expect(result.success, result.error).to.be.false;
        })

    })
})
