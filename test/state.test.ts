import { assert, expect } from 'chai';
import { loadDescription, newTx } from './helper';
import { buildContractClass, buildTypeClasses } from '../src/contract';
import { Bool, Bytes, Int, PrivKey, PubKey, Ripemd160, Sha256, SigHashPreimage, SigHashType, OpCodeType, SigHash, Sig } from '../src/scryptTypes';
import { bsv, toHex, getPreimage } from '../src/utils';

const inputIndex = 0;
const inputSatoshis = 100000;

const outputAmount = 222222

const StateExample = buildContractClass(loadDescription('state_desc.json'));


describe('state_test', () => {


    it('should serializer state success', () => {
        const stateExample = new StateExample(1000, new Bytes("0101"), true,
            new PrivKey("11"),
            new PubKey("03f4a8ec3e44903ea28c00113b351af3baeec5662e5e2453c19188fbcad00fb1cf"),
            new Ripemd160("40933785f6695815a7e1afb59aff20226bbb5bd4"),
            new Sha256("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"),
            new OpCodeType("76"),
            new SigHashType(SigHash.ALL | SigHash.FORKID),
            new Sig("304402207b6ce0aaae3a379721a364ab11414abd658a9940c10d48cd0bc6b273e81d058902206f6c0671066aef4c0de58ab8c349fde38ef3ea996b9f2e79241ebad96049299541"),
        );

        expect(stateExample.dataPart.toHex()).to.be.equal('0102e80302010101010b2103f4a8ec3e44903ea28c00113b351af3baeec5662e5e2453c19188fbcad00fb1cf1440933785f6695815a7e1afb59aff20226bbb5bd420ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad0176014147304402207b6ce0aaae3a379721a364ab11414abd658a9940c10d48cd0bc6b273e81d058902206f6c0671066aef4c0de58ab8c349fde38ef3ea996b9f2e79241ebad96049299541ae00000000');
        stateExample.counter++;
        stateExample.state_bytes = new Bytes('010101');
        stateExample.state_bool = false;

        expect(stateExample.dataPart.toHex()).to.be.equal('0002e9030301010100010b2103f4a8ec3e44903ea28c00113b351af3baeec5662e5e2453c19188fbcad00fb1cf1440933785f6695815a7e1afb59aff20226bbb5bd420ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad0176014147304402207b6ce0aaae3a379721a364ab11414abd658a9940c10d48cd0bc6b273e81d058902206f6c0671066aef4c0de58ab8c349fde38ef3ea996b9f2e79241ebad96049299541af00000000');


    });


    it('should deserializer state success 1', () => {
        const stateExample = new StateExample(0, new Bytes(''), false,
            new PrivKey("3"),
            new PubKey("01"),
            new Ripemd160("02"),
            new Sha256("03"),
            new OpCodeType('76'),
            new SigHashType(SigHash.ALL | SigHash.FORKID),
            new Sig("05")
        );


        expect(stateExample.dataPart.toHex()).to.be.eq('010100000001030101010201030176014101051300000000');

        let newStateExample = StateExample.fromHex(stateExample.lockingScript.toHex());

        expect(newStateExample.dataPart.toHex()).to.be.eq('010100000001030101010201030176014101051300000000');

        expect(newStateExample.counter.equals(new Int(0))).to.be.true;
        expect(newStateExample.state_bytes.equals(new Bytes(''))).to.be.true;
        expect(newStateExample.state_bool.equals(new Bool(false))).to.be.true;

        expect(newStateExample.pubkey.equals(new PubKey("01"))).to.be.true;
        expect(newStateExample.privKey.equals(new PrivKey("3"))).to.be.true;
        expect(newStateExample.ripemd160.equals(new Ripemd160("02"))).to.be.true;
        expect(newStateExample.sha256.equals(new Sha256("03"))).to.be.true;
        expect(newStateExample.opCodeType.equals(new OpCodeType('76'))).to.be.true;
        expect(newStateExample.sigHashType.equals(new SigHashType(SigHash.ALL | SigHash.FORKID))).to.be.true;
        expect(newStateExample.sig.equals(new Sig("05"))).to.be.true;
    });


    it('should deserializer state success 2', () => {
        const stateExample = new StateExample(3, new Bytes(''), false,
            new PrivKey("3"),
            new PubKey("01"),
            new Ripemd160("02"),
            new Sha256("03"),
            new OpCodeType('76'),
            new SigHashType(SigHash.ALL | SigHash.FORKID),
            new Sig("05")
        );


        expect(stateExample.dataPart.toHex()).to.be.eq('010103000001030101010201030176014101051300000000');

        let newStateExample = StateExample.fromHex(stateExample.lockingScript.toHex());

        expect(newStateExample.counter.equals(new Int(3))).to.be.true;

    });


    it('should deserializer state success 2', () => {
        const stateExample = new StateExample(1000, new Bytes('0101'), true,
            new PrivKey("11"),
            new PubKey("03f4a8ec3e44903ea28c00113b351af3baeec5662e5e2453c19188fbcad00fb1cf"),
            new Ripemd160("40933785f6695815a7e1afb59aff20226bbb5bd4"),
            new Sha256("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"),
            new OpCodeType('76'),
            new SigHashType(SigHash.ALL | SigHash.FORKID),
            new Sig("304402207b6ce0aaae3a379721a364ab11414abd658a9940c10d48cd0bc6b273e81d058902206f6c0671066aef4c0de58ab8c349fde38ef3ea996b9f2e79241ebad96049299541")
        );

        let newStateExample = StateExample.fromHex(stateExample.lockingScript.toHex());

        expect(newStateExample.counter.equals(new Int(1000))).to.be.true;
        expect(newStateExample.state_bytes.equals(new Bytes('0101'))).to.be.true;
        expect(newStateExample.state_bool.equals(new Bool(true))).to.be.true;
        expect(newStateExample.privKey.equals(new PrivKey("11"))).to.be.true;
        expect(newStateExample.ripemd160.equals(new Ripemd160("40933785f6695815a7e1afb59aff20226bbb5bd4"))).to.be.true;
        expect(newStateExample.sha256.equals(new Sha256("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"))).to.be.true;
        expect(newStateExample.opCodeType.equals(new OpCodeType('76'))).to.be.true;
        expect(newStateExample.sigHashType.equals(new SigHashType(SigHash.ALL | SigHash.FORKID))).to.be.true;
        expect(newStateExample.sig.equals(new Sig("304402207b6ce0aaae3a379721a364ab11414abd658a9940c10d48cd0bc6b273e81d058902206f6c0671066aef4c0de58ab8c349fde38ef3ea996b9f2e79241ebad96049299541"))).to.be.true;
    });



    it('should call success', () => {
        const stateExample = new StateExample(1000, new Bytes('0101'), true,
            new PrivKey("11"),
            new PubKey("03f4a8ec3e44903ea28c00113b351af3baeec5662e5e2453c19188fbcad00fb1cf"),
            new Ripemd160("40933785f6695815a7e1afb59aff20226bbb5bd4"),
            new Sha256("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"),
            new OpCodeType('76'),
            new SigHashType(SigHash.ALL | SigHash.FORKID),
            new Sig("304402207b6ce0aaae3a379721a364ab11414abd658a9940c10d48cd0bc6b273e81d058902206f6c0671066aef4c0de58ab8c349fde38ef3ea996b9f2e79241ebad96049299541")
        );

        let newLockingScript = stateExample.getNewStateScript({
            counter: 1001,
            state_bytes: new Bytes('010101'),
            state_bool: false
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

        const result1 = stateExample.unlock(new SigHashPreimage(toHex(preimage1)), outputAmount).verify()
        expect(result1.success, result1.error).to.be.true

        // update state
        stateExample.counter = 1001
        stateExample.state_bytes = new Bytes('010101');
        stateExample.state_bool = false;


        newLockingScript = stateExample.getNewStateScript({
            counter: 1002,
            state_bytes: new Bytes('01010101'),
            state_bool: true
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

        const result2 = stateExample.unlock(new SigHashPreimage(toHex(preimage2)), outputAmount).verify()
        expect(result2.success, result2.error).to.be.true

    });

    it('should throw if providing non-existent state', () => {

        const stateExample = new StateExample(1000, new Bytes('0101'), true,
            new PrivKey("11"),
            new PubKey("03f4a8ec3e44903ea28c00113b351af3baeec5662e5e2453c19188fbcad00fb1cf"),
            new Ripemd160("40933785f6695815a7e1afb59aff20226bbb5bd4"),
            new Sha256("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"),
            new OpCodeType('76'),
            new SigHashType(SigHash.ALL | SigHash.FORKID),
            new Sig("304402207b6ce0aaae3a379721a364ab11414abd658a9940c10d48cd0bc6b273e81d058902206f6c0671066aef4c0de58ab8c349fde38ef3ea996b9f2e79241ebad96049299541")
        );


        expect(() => {
            stateExample.getNewStateScript({
                coun1ter: 1002,
                state_bytes: new Bytes('01010101'),
                state_bool: true
            })
        }).to.throw('Contract StateExample does not have stateful property coun1ter');

    });


    it('should throw if constract does not have any stateful property', () => {

        const Counter = buildContractClass(loadDescription('counter_desc.json'));
        let counter = new Counter();

        expect(() => {
            counter.getNewStateScript({
                coun1ter: 1002,
                state_bytes: new Bytes('01010101'),
                state_bool: true
            })
        }).to.throw('Contract Counter does not have any stateful property');

    });


    it('should success when not all state properties are provided in getNewStateScript() ', () => {

        const StateCounter = buildContractClass(loadDescription('statecounter_desc.json'));
        let counter = new StateCounter(0, true);

        let newLockingScript = counter.getNewStateScript({
            counter: 1
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

        const result2 = counter.increment(new SigHashPreimage(toHex(preimage)), outputAmount).verify()
        expect(result2.success, result2.error).to.be.true

    });


    it('should fail when wrong value state properties are provided in getNewStateScript() ', () => {

        const StateCounter = buildContractClass(loadDescription('statecounter_desc.json'));
        let counter = new StateCounter(0, true);

        let newLockingScript = counter.getNewStateScript({
            counter: 1,
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

        const result2 = counter.increment(new SigHashPreimage(toHex(preimage)), outputAmount).verify()
        expect(result2.success, result2.error).to.be.false

    });


    it('should success when state property is struct', () => {

        const Counter = buildContractClass(loadDescription('ststate_desc.json'));
        const { States, MyStates } = buildTypeClasses(loadDescription('ststate_desc.json'));
        let counter = new Counter(new States({
            counter: 1000,
            done: true,
            hex: new Bytes('02')
        }));

        let newLockingScript = counter.getNewStateScript({
            states: new MyStates({
                counter: 1001,
                done: false,
                hex: new Bytes('0201')
            })
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

        const result = counter.increment(new SigHashPreimage(toHex(preimage)), outputAmount).verify()
        expect(result.success, result.error).to.be.true
    });


    it('should success when state property is array', () => {

        const Counter = buildContractClass(loadDescription('arraystate_desc.json'));
        let counter = new Counter([0, 1, 2]);

        let newLockingScript = counter.getNewStateScript({
            counters: [1, 2, 3]
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

        const result = counter.increment(new SigHashPreimage(toHex(preimage)), outputAmount).verify()
        expect(result.success, result.error).to.be.true
    });


    it('should success state property is mix struct and array', () => {

        const Counter = buildContractClass(loadDescription('mixstate_desc.json'));
        const { States, StatesA } = buildTypeClasses(loadDescription('mixstate_desc.json'));
        let counter = new Counter(new States({
            counter: 1000,
            done: true
        }), [new StatesA({
            states: [new States({
                counter: 0,
                done: true
            }), new States({
                counter: 1,
                done: false
            })],
            hex: new Bytes('02')
        })]);


        let newLockingScript = counter.getNewStateScript({
            states: new States({
                counter: 1001,
                done: false
            }),
            sss: [new StatesA({
                states: [new States({
                    counter: 0,
                    done: true
                }), new States({
                    counter: 1,
                    done: false
                })],
                hex: new Bytes('0201')
            })]
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

        const result = counter.increment(new SigHashPreimage(toHex(preimage)), outputAmount).verify()
        expect(result.success, result.error).to.be.true
    });

    it('should fail state property with wrong value', () => {

        const Counter = buildContractClass(loadDescription('mixstate_desc.json'));
        const { States, StatesA } = buildTypeClasses(loadDescription('mixstate_desc.json'));
        let counter = new Counter(new States({
            counter: 1000,
            done: true
        }), [new StatesA({
            states: [new States({
                counter: 0,
                done: true
            }), new States({
                counter: 1,
                done: false
            })],
            hex: new Bytes('02')
        })]);


        let newLockingScript = counter.getNewStateScript({
            states: new States({
                counter: 1001,
                done: false
            }),
            sss: [new StatesA({
                states: [new States({
                    counter: 0,
                    done: true
                }), new States({
                    counter: 1,
                    done: true
                })],
                hex: new Bytes('0201')
            })]
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

        const result = counter.increment(new SigHashPreimage(toHex(preimage)), outputAmount).verify()
        expect(result.success, result.error).to.be.false
    });
})
