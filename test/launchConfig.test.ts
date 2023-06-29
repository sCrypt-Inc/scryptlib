import { assert, expect } from 'chai';
import { excludeMembers, loadArtifact, newTx } from './helper';
import { buildContractClass } from '../src/contract';
import { Bool, Bytes, Int, PrivKey, PubKey, Ripemd160, Sha256, SigHashPreimage, SigHashType, OpCodeType, SignatureHashType, Sig } from '../src/scryptTypes';
import { bsv, getPreimage, uri2path } from '../src/utils';
import { readFileSync } from 'fs';


describe('genLaunchConfig', () => {
    it('genLaunchConfig should generate right json', () => {

        const inputIndex = 0;
        const inputSatoshis = 100000;

        const outputAmount = 222222

        const StateExample = buildContractClass(loadArtifact('state.json'));

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

        const file = stateExample.unlock(SigHashPreimage(preimage1), Int(outputAmount)).genLaunchConfig();

        const config = JSON.parse(readFileSync(uri2path(file)).toString())

        expect(excludeMembers(config, ['program', 'txContext', 'pubFuncArgs'])).deep.equal({
            "version": "0.2.0",
            "configurations": [
                {
                    "type": "scrypt",
                    "request": "launch",
                    "internalConsoleOptions": "openOnSessionStart",
                    "name": "Debug StateExample",
                    "constructorArgs": [
                        1000,
                        "b'0101'",
                        true,
                        "PrivKey(11)",
                        "PubKey(b'03f4a8ec3e44903ea28c00113b351af3baeec5662e5e2453c19188fbcad00fb1cf')",
                        "Ripemd160(b'40933785f6695815a7e1afb59aff20226bbb5bd4')",
                        "Sha256(b'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')",
                        "OpCodeType(b'76')",
                        "SigHashType(b'41')",
                        "Sig(b'304402207b6ce0aaae3a379721a364ab11414abd658a9940c10d48cd0bc6b273e81d058902206f6c0671066aef4c0de58ab8c349fde38ef3ea996b9f2e79241ebad96049299541')"
                    ],
                    "pubFunc": "unlock"
                }
            ]
        })


    });
})
