import { assert, expect } from 'chai';
import { loadArtifact, newTx } from './helper';
import { buildContractClass } from '../src/contract';
import { Bool, Bytes, Int, PrivKey, PubKey, Ripemd160, Sha256, SigHashPreimage, SigHashType, OpCodeType, SignatureHashType, Sig } from '../src/scryptTypes';
import { bsv, getPreimage } from '../src/utils';

const inputIndex = 0;
const inputSatoshis = 100000;

const outputAmount = 222222

const StateExample = buildContractClass(loadArtifact('state.json'));


describe('state_test', () => {


    it('should serializer state success', () => {
        const stateExample = new StateExample(1000n, Bytes("0101"), true,
            PrivKey(11n),
            PubKey("03f4a8ec3e44903ea28c00113b351af3baeec5662e5e2453c19188fbcad00fb1cf"),
            Ripemd160("40933785f6695815a7e1afb59aff20226bbb5bd4"),
            Sha256("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"),
            OpCodeType("76"),
            SigHashType(SignatureHashType.ALL),
            Sig("304402207b6ce0aaae3a379721a364ab11414abd658a9940c10d48cd0bc6b273e81d058902206f6c0671066aef4c0de58ab8c349fde38ef3ea996b9f2e79241ebad96049299541"),
        );

        expect(stateExample.dataPart?.toHex()).to.be.equal('01010001000101000100010001000100010001001400000000');
        stateExample.counter++;
        stateExample.state_bytes = Bytes('010101');
        stateExample.state_bool = false;

        expect(stateExample.dataPart?.toHex()).to.be.equal('000101030101010001000100010001000100010001001600000000');


    });


    it('should deserializer state success 1', () => {
        const stateExample = new StateExample(0n, Bytes(''), false,
            PrivKey(3n),
            PubKey("01"),
            Ripemd160("02"),
            Sha256("03"),
            OpCodeType('76'),
            SigHashType(SignatureHashType.ALL),
            Sig("05")
        );


        expect(stateExample.dataPart?.toHex()).to.be.eq('01010001000101000100010001000100010001001400000000');

        let newStateExample = StateExample.fromHex(stateExample.lockingScript.toHex());

        expect(newStateExample.dataPart?.toHex()).to.be.eq('01010001000101000100010001000100010001001400000000');

        expect(newStateExample.counter == Int(0)).to.be.true;
        expect(newStateExample.state_bytes == Bytes('00')).to.be.true;
        expect(newStateExample.state_bool == Bool(true)).to.be.true;

        expect(newStateExample.pubkey == PubKey("00")).to.be.true;
        expect(newStateExample.privKey == PrivKey(0n)).to.be.true;
        expect(newStateExample.ripemd160 === Ripemd160("00")).to.be.true;
        expect(newStateExample.sha256 === Sha256("00")).to.be.true;
        expect(newStateExample.opCodeType === OpCodeType('00')).to.be.true;
        expect(newStateExample.sigHashType === SigHashType(0)).to.be.true;
        expect(newStateExample.sig === (Sig("00"))).to.be.true;
    });


    it('should deserializer state success 2', () => {
        const stateExample = new StateExample(3n, Bytes(''), false,
            PrivKey(3n),
            PubKey("01"),
            Ripemd160("02"),
            Sha256("03"),
            OpCodeType('76'),
            SigHashType(SignatureHashType.ALL),
            Sig("05")
        );

        stateExample.counter = 3n;
        expect(stateExample.dataPart?.toHex()).to.be.eq('00010301000101000100010001000100010001001400000000');

        let newStateExample = StateExample.fromHex(stateExample.lockingScript.toHex());

        expect(newStateExample.counter == Int(3)).to.be.true;

    });


    it('should deserializer state success 2', () => {
        const stateExample = new StateExample(1000n, Bytes('0101'), true,
            PrivKey(11n),
            PubKey("03f4a8ec3e44903ea28c00113b351af3baeec5662e5e2453c19188fbcad00fb1cf"),
            Ripemd160("40933785f6695815a7e1afb59aff20226bbb5bd4"),
            Sha256("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"),
            OpCodeType('76'),
            SigHashType(SignatureHashType.ALL),
            Sig("304402207b6ce0aaae3a379721a364ab11414abd658a9940c10d48cd0bc6b273e81d058902206f6c0671066aef4c0de58ab8c349fde38ef3ea996b9f2e79241ebad96049299541")
        );

        stateExample.counter = 1000n;
        stateExample.state_bytes = Bytes('0101');
        stateExample.state_bool = true;
        stateExample.privKey = PrivKey(11n);
        stateExample.ripemd160 = Ripemd160("40933785f6695815a7e1afb59aff20226bbb5bd4");
        stateExample.sha256 = Sha256("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
        stateExample.opCodeType = OpCodeType('76');
        stateExample.sigHashType = SigHashType(SignatureHashType.ALL);
        stateExample.sig = Sig("304402207b6ce0aaae3a379721a364ab11414abd658a9940c10d48cd0bc6b273e81d058902206f6c0671066aef4c0de58ab8c349fde38ef3ea996b9f2e79241ebad96049299541");

        let newStateExample = StateExample.fromHex(stateExample.lockingScript.toHex());

        expect(newStateExample.counter === 1000n).to.be.true;
        expect(newStateExample.state_bytes === Bytes('0101')).to.be.true;
        expect(newStateExample.state_bool === Bool(true)).to.be.true;
        expect(newStateExample.privKey === PrivKey(11n)).to.be.true;
        expect(newStateExample.ripemd160 === Ripemd160("40933785f6695815a7e1afb59aff20226bbb5bd4")).to.be.true;
        expect(newStateExample.sha256 === Sha256("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")).to.be.true;
        expect(newStateExample.opCodeType === OpCodeType('76')).to.be.true;
        expect(newStateExample.sigHashType === SigHashType(SignatureHashType.ALL)).to.be.true;
        expect(newStateExample.sig === Sig("304402207b6ce0aaae3a379721a364ab11414abd658a9940c10d48cd0bc6b273e81d058902206f6c0671066aef4c0de58ab8c349fde38ef3ea996b9f2e79241ebad96049299541")).to.be.true;
    });



    it('should call success', () => {
        const stateExample = new StateExample(1000n, Bytes('0101'), true,
            PrivKey(11n),
            PubKey("03f4a8ec3e44903ea28c00113b351af3baeec5662e5e2453c19188fbcad00fb1cf"),
            Ripemd160("40933785f6695815a7e1afb59aff20226bbb5bd4"),
            Sha256("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"),
            OpCodeType('76'),
            SigHashType(SignatureHashType.ALL),
            Sig("304402207b6ce0aaae3a379721a364ab11414abd658a9940c10d48cd0bc6b273e81d058902206f6c0671066aef4c0de58ab8c349fde38ef3ea996b9f2e79241ebad96049299541")
        );

        stateExample.counter = 1000n;
        stateExample.state_bytes = Bytes('0101');
        stateExample.state_bool = true;
        stateExample.privKey = PrivKey(11n);
        stateExample.ripemd160 = Ripemd160("40933785f6695815a7e1afb59aff20226bbb5bd4");
        stateExample.sha256 = Sha256("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
        stateExample.opCodeType = OpCodeType('76');
        stateExample.sigHashType = SigHashType(SignatureHashType.ALL);
        stateExample.sig = Sig("304402207b6ce0aaae3a379721a364ab11414abd658a9940c10d48cd0bc6b273e81d058902206f6c0671066aef4c0de58ab8c349fde38ef3ea996b9f2e79241ebad96049299541");


        let newLockingScript = stateExample.getNewStateScript({
            counter: 1001n,
            state_bytes: Bytes('010101'),
            state_bool: false,
            privKey: PrivKey(11n),
            ripemd160: Ripemd160("40933785f6695815a7e1afb59aff20226bbb5bd4"),
            sha256: Sha256("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"),
            opCodeType: OpCodeType('76'),
            sigHashType: SigHashType(SignatureHashType.ALL),
            sig: Sig("304402207b6ce0aaae3a379721a364ab11414abd658a9940c10d48cd0bc6b273e81d058902206f6c0671066aef4c0de58ab8c349fde38ef3ea996b9f2e79241ebad96049299541")
        });

        const tx1 = newTx(inputSatoshis);
        tx1.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage1 = getPreimage(tx1, stateExample.lockingScript, inputSatoshis)

        stateExample.txContext = {
            tx: tx1,
            inputIndex,
            inputSatoshis
        }

        const result1 = stateExample.unlock(SigHashPreimage(preimage1), Int(outputAmount)).verify()
        expect(result1.success, result1.error).to.be.true

        // update state
        stateExample.counter = 1001n
        stateExample.state_bytes = Bytes('010101');
        stateExample.state_bool = false;
        stateExample.privKey = PrivKey(11n);
        stateExample.ripemd160 = Ripemd160("40933785f6695815a7e1afb59aff20226bbb5bd4");
        stateExample.sha256 = Sha256("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
        stateExample.opCodeType = OpCodeType('76');
        stateExample.sigHashType = SigHashType(SignatureHashType.ALL);
        stateExample.sig = Sig("304402207b6ce0aaae3a379721a364ab11414abd658a9940c10d48cd0bc6b273e81d058902206f6c0671066aef4c0de58ab8c349fde38ef3ea996b9f2e79241ebad96049299541");



        newLockingScript = stateExample.getNewStateScript({
            counter: 1002n,
            state_bytes: Bytes('01010101'),
            state_bool: true,
            privKey: PrivKey(11n),
            ripemd160: Ripemd160("40933785f6695815a7e1afb59aff20226bbb5bd4"),
            sha256: Sha256("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"),
            opCodeType: OpCodeType('76'),
            sigHashType: SigHashType(SignatureHashType.ALL),
            sig: Sig("304402207b6ce0aaae3a379721a364ab11414abd658a9940c10d48cd0bc6b273e81d058902206f6c0671066aef4c0de58ab8c349fde38ef3ea996b9f2e79241ebad96049299541")
        })

        const tx2 = newTx(inputSatoshis);
        tx2.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage2 = getPreimage(tx2, stateExample.lockingScript, inputSatoshis)

        stateExample.txContext = {
            tx: tx2,
            inputIndex,
            inputSatoshis
        }

        const result2 = stateExample.unlock(SigHashPreimage(preimage2), Int(outputAmount)).verify()
        expect(result2.success, result2.error).to.be.true

    });

    it('should throw if providing non-existent state', () => {

        const stateExample = new StateExample(1000n, Bytes('0101'), true,
            PrivKey(11n),
            PubKey("03f4a8ec3e44903ea28c00113b351af3baeec5662e5e2453c19188fbcad00fb1cf"),
            Ripemd160("40933785f6695815a7e1afb59aff20226bbb5bd4"),
            Sha256("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"),
            OpCodeType('76'),
            SigHashType(SignatureHashType.ALL),
            Sig("304402207b6ce0aaae3a379721a364ab11414abd658a9940c10d48cd0bc6b273e81d058902206f6c0671066aef4c0de58ab8c349fde38ef3ea996b9f2e79241ebad96049299541")
        );


        expect(() => {
            stateExample.getNewStateScript({
                coun1ter: 1002n,
                state_bytes: Bytes('01010101'),
                state_bool: true
            })
        }).to.throw('Contract StateExample does not have stateful property coun1ter');

    });


    it('should throw if constract does not have any stateful property', () => {

        const Counter = buildContractClass(loadArtifact('counter.json'));
        let counter = new Counter();

        expect(() => {
            counter.getNewStateScript({
                coun1ter: 1002n,
                state_bytes: Bytes('01010101'),
                state_bool: true
            })
        }).to.throw('Contract Counter does not have any stateful property');

    });


    it('should succeeding when not all state properties are provided in getNewStateScript() ', () => {

        const StateCounter = buildContractClass(loadArtifact('statecounter.json'));
        let counter = new StateCounter(0n, true);

        let newLockingScript = counter.getNewStateScript({
            counter: 1n
        })

        const tx = newTx(inputSatoshis);
        tx.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage = getPreimage(tx, counter.lockingScript, inputSatoshis)

        counter.txContext = {
            tx: tx,
            inputIndex,
            inputSatoshis
        }

        const result2 = counter.increment(SigHashPreimage(preimage), BigInt(outputAmount)).verify()
        expect(result2.success, result2.error).to.be.true

    });


    it('should fail when wrong value state properties are provided in getNewStateScript() ', () => {

        const StateCounter = buildContractClass(loadArtifact('statecounter.json'));
        let counter = new StateCounter(0n, true);

        let newLockingScript = counter.getNewStateScript({
            counter: 1n,
            done: false
        })

        const tx = newTx(inputSatoshis);
        tx.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage = getPreimage(tx, counter.lockingScript, inputSatoshis)

        counter.txContext = {
            tx: tx,
            inputIndex,
            inputSatoshis
        }

        const result2 = counter.increment(SigHashPreimage(preimage), Int(outputAmount)).verify()
        expect(result2.success, result2.error).to.be.false

    });


    it('should succeeding when state contract with a constructor with a param', () => {

        const StateCounter = buildContractClass(loadArtifact('statecounter1.json'));
        let counter = new StateCounter(6n);

        let newLockingScript = counter.getNewStateScript({
            counter: 8n
        })

        const tx = newTx(inputSatoshis);
        tx.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage = getPreimage(tx, counter.lockingScript, inputSatoshis)

        counter.txContext = {
            tx: tx,
            inputIndex,
            inputSatoshis
        }

        const result = counter.increment(SigHashPreimage(preimage), Int(outputAmount)).verify()
        expect(result.success, result.error).to.be.true

    });


    it('should succeeding when state contract with a constructor with two param', () => {

        const StateCounter = buildContractClass(loadArtifact('statecounter2.json'));
        let counter = new StateCounter(1n, 2n);

        let newLockingScript = counter.getNewStateScript({
            counter: 202n
        })

        const tx = newTx(inputSatoshis);
        tx.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage = getPreimage(tx, counter.lockingScript, inputSatoshis)

        counter.txContext = {
            tx: tx,
            inputIndex,
            inputSatoshis
        }

        const result = counter.increment(SigHashPreimage(preimage), Int(outputAmount)).verify()
        expect(result.success, result.error).to.be.true

    });

    it('should succeeding when state contract with a constructor with a struct param and an array param', () => {

        const StateCounter = buildContractClass(loadArtifact('statecounter3.json'));

        let counter = new StateCounter({
            p1: 1n,
            p2: true,
            p3: [1n, 1n, 1n]
        }, [1n, 1n, 12n]);

        let newLockingScript = counter.getNewStateScript({
            counter: 19n
        })

        const tx = newTx(inputSatoshis);
        tx.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage = getPreimage(tx, counter.lockingScript, inputSatoshis)

        counter.txContext = {
            tx: tx,
            inputIndex,
            inputSatoshis
        }

        const result = counter.increment(SigHashPreimage(preimage), BigInt(outputAmount)).verify()
        expect(result.success, result.error).to.be.true

    });


    it('should succeeding when state property is struct', () => {

        const Counter = buildContractClass(loadArtifact('ststate.json'));

        let counter = new Counter({
            counter: 1000n,
            done: true,
            hex: Bytes('02')
        });

        let newLockingScript = counter.getNewStateScript({
            states: {
                counter: 1001n,
                done: false,
                hex: Bytes('0201')
            }
        })

        const tx = newTx(inputSatoshis);
        tx.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage = getPreimage(tx, counter.lockingScript, inputSatoshis)

        counter.txContext = {
            tx: tx,
            inputIndex,
            inputSatoshis
        }

        const result = counter.increment(SigHashPreimage(preimage), Int(outputAmount)).verify()
        expect(result.success, result.error).to.be.true
    });


    it('should succeeding when state property is array', () => {

        const Counter = buildContractClass(loadArtifact('arraystate.json'));
        let counter = new Counter([0n, 1n, 2n]);

        let newLockingScript = counter.getNewStateScript({
            counters: [1n, 2n, 3n]
        })

        const tx = newTx(inputSatoshis);
        tx.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage = getPreimage(tx, counter.lockingScript, inputSatoshis)

        counter.txContext = {
            tx: tx,
            inputIndex,
            inputSatoshis
        }

        const result = counter.increment(SigHashPreimage(preimage), BigInt(outputAmount)).verify()
        expect(result.success, result.error).to.be.true
    });


    it('should succeeding state property is mix struct and array', () => {

        const Counter = buildContractClass(loadArtifact('mixstate.json'));
        let counter = new Counter({
            counter: 1000n,
            done: true
        }, [{
            states: [{
                counter: 0n,
                done: true
            }, {
                counter: 1n,
                done: false
            }],
            hex: Bytes('02')
        }]);


        let newLockingScript = counter.getNewStateScript({
            states: {
                counter: 1001n,
                done: false
            },
            sss: [{
                states: [{
                    counter: 0n,
                    done: true
                }, {
                    counter: 1n,
                    done: false
                }],
                hex: Bytes('0201')
            }]
        })


        const tx = newTx(inputSatoshis);
        tx.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage = getPreimage(tx, counter.lockingScript, inputSatoshis)

        counter.txContext = {
            tx: tx,
            inputIndex,
            inputSatoshis
        }

        const result = counter.increment(SigHashPreimage(preimage), BigInt(outputAmount)).verify()
        expect(result.success, result.error).to.be.true
    });

    it('should fail state property with wrong value', () => {

        const Counter = buildContractClass(loadArtifact('mixstate.json'));
        let counter = new Counter({
            counter: 1000n,
            done: true
        }, [{
            states: [{
                counter: 0n,
                done: true
            }, {
                counter: 1n,
                done: false
            }],
            hex: Bytes('02')
        }]);


        let newLockingScript = counter.getNewStateScript({
            states: {
                counter: 1001n,
                done: false
            },
            sss: [{
                states: [{
                    counter: 0n,
                    done: true
                }, {
                    counter: 1n,
                    done: true
                }],
                hex: Bytes('0201')
            }]
        })

        const tx = newTx(inputSatoshis);
        tx.addOutput(new bsv.Transaction.Output({
            script: newLockingScript,
            satoshis: outputAmount
        }))

        const preimage = getPreimage(tx, counter.lockingScript, inputSatoshis)

        counter.txContext = {
            tx: tx,
            inputIndex,
            inputSatoshis
        }

        const result = counter.increment(SigHashPreimage(preimage), BigInt(outputAmount)).verify()
        expect(result.success, result.error).to.be.false
    });
})
