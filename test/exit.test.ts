import { expect } from 'chai'
import { loadArtifact, newTx } from './helper'
import { buildContractClass } from '../src/contract'
import { bsv } from '../src/utils'

const privateKey = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)
const publicKey = privateKey.publicKey
const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer())
const inputSatoshis = 100000
const tx = newTx(inputSatoshis)



describe('test.Exit', () => {
    describe('check exit', () => {
        let exit;

        before(() => {
            const jsonArtifact = loadArtifact('exit.json')
            const Exit = buildContractClass(jsonArtifact)
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
