import { expect } from 'chai'
import { loadArtifact } from './helper'
import { buildContractClass } from '../src/contract'
import { bsv, num2bin, SigHashPreimage } from '../src'

describe('test.Counter with NOPScript', () => {


    it('should unlock success', () => {

        let nopScript = bsv.Script.fromASM("OP_NOP");

        const Counter = buildContractClass(loadArtifact('counter.json'))
        let counter = new Counter()

        counter.setDataPartInASM('00')
        counter.prependNOPScript(nopScript)


        expect(counter.lockingScript.toASM().startsWith("OP_NOP")).to.true

        let callTx = new bsv.Transaction()
            .addDummyInput(counter.lockingScript, 1000)
            .setOutput(0, (tx) => {
                const newLockingScript = [counter.codePart.toASM(), num2bin(1n, 1)].join(' ')
                const newAmount = tx.inputAmount - tx.getEstimateFee();
                return new bsv.Transaction.Output({
                    script: bsv.Script.fromASM(newLockingScript),
                    satoshis: newAmount
                })
            })
            .setInputScript(0, (tx) => {
                return counter.increment(SigHashPreimage(tx.getPreimage(0)), BigInt(tx.getOutputAmount(0))).toScript();
            })
            .seal();
        // verify all tx inputs
        expect(callTx.verify()).to.be.true

        // just verify the contract inputs
        expect(callTx.verifyInputScript(0).success).to.true


        let callTx1 = new bsv.Transaction()
            .addInputFromPrevTx(callTx)
            .setOutput(0, (tx) => {
                const newLockingScript = [counter.codePart.toASM(), num2bin(2n, 1)].join(' ')
                const newAmount = tx.inputAmount - tx.getEstimateFee();
                return new bsv.Transaction.Output({
                    script: bsv.Script.fromASM(newLockingScript),
                    satoshis: newAmount
                })
            })
            .setInputScript(0, (tx) => {
                return counter.increment(SigHashPreimage(tx.getPreimage(0)), BigInt(tx.getOutputAmount(0))).toScript();
            })
            .seal();
        // verify all tx inputs
        expect(callTx1.verify()).to.be.true

        // just verify the contract inputs
        expect(callTx1.verifyInputScript(0).success).to.true


    })


    it('should unlock failed', () => {

        const Counter = buildContractClass(loadArtifact('counter.json'))
        let counter = new Counter()
        let nopScript = bsv.Script.fromASM("OP_NOP");

        counter.setDataPartInASM('00')
        counter.prependNOPScript(nopScript)

        let callTx = new bsv.Transaction()
            .addDummyInput(counter.lockingScript, 1000)
            .setOutput(0, (tx) => {
                const newLockingScript = [counter.codePart.toASM(), num2bin(1n, 1)].join(' ')
                const newAmount = tx.inputAmount - tx.getEstimateFee();
                return new bsv.Transaction.Output({
                    script: bsv.Script.fromASM(newLockingScript),
                    satoshis: newAmount
                })
            })
            .setInputScript(0, (tx) => {
                return counter.increment(SigHashPreimage(tx.getPreimage(0)), 1n).toScript();
            })
            .seal();


        // verify all tx inputs
        expect(callTx.verify()).to.be.eq('transaction input 0 VerifyError: SCRIPT_ERR_EVAL_FALSE_IN_STACK')

        // just verify the contract inputs
        const result = callTx.verifyInputScript(0)
        expect(result).to.deep.eq({
            success: false,
            error: "SCRIPT_ERR_EVAL_FALSE_IN_STACK",
            failedAt: {
                fExec: true,
                opcode: 106,
                pc: 1012
            }
        })

        const launchConfigUri = counter.genLaunchConfig({
            tx: callTx,
            inputIndex: 0,
            inputSatoshis: 1000
        });

        expect(launchConfigUri).to.includes("Launch Debugger")

        expect(counter.fmtError(result)).to.includes("counter.scrypt#20")
        expect(counter.fmtError(result)).to.includes("fails at OP_RETURN")


    })
})
