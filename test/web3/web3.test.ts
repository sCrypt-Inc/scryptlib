

import { assert, expect } from 'chai';
import { buildContractClass } from '../../src/contract';
import { AbstractContract } from '../../src/contract';
import { web3, LocalWallet } from '../../src/web3';
import { delay, loadDescription } from '../helper';
import { Sig, PubKey, Ripemd160 } from '../../src/scryptTypes';
import { toHex, bsv, newCall } from '../../src/utils';
import { NetWork } from '../../src/web3/wallet';

const privateKey = new bsv.PrivateKey.fromRandom('testnet');
const publicKey = privateKey.publicKey;
const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());

describe('test web3api', () => {


    describe('test web3api loadContract', () => {

        it('test web3api loadContract', async () => {

            let {
                contractClass: TictactoeClass
            }
                = await web3.loadContract('https://scrypt.io/tic-tac-toe/tictactoe_desc.json')


            const tictactoe: AbstractContract = newCall(TictactoeClass, [new PubKey(toHex(privateKey.publicKey)), new PubKey(toHex(privateKey.publicKey))]);


            assert.isTrue(tictactoe instanceof AbstractContract)
        })
    })


    describe('test web3api deploy', () => {


        const jsonDescr = loadDescription('p2pkh_desc.json');
        const DemoP2PKH = buildContractClass(jsonDescr);

        before(() => {
            web3.setWallet(new LocalWallet(NetWork.Testnet, 'cRsnshD1gkiGQMqHe5EnX1ndob33GLmNKD9QweaKvW4Fwz7YDu7h'));
        });

        it('test web3api deploy P2PKH ', async () => {
            let p2pkh = new DemoP2PKH(new Ripemd160(toHex(pubKeyHash)));
            let tx = await web3.deploy(p2pkh, 1000);
            console.log('tx', tx)
            assert.isTrue(typeof tx === 'string' && tx !== '')
        })


        it('test web3api deploy tictactoe ', async () => {

            let {
                contractClass: TictactoeClass
            }
                = await web3.loadContract('https://scrypt.io/tic-tac-toe/tictactoe_desc.json')

            const tictactoe: AbstractContract = newCall(TictactoeClass, [new PubKey(toHex(privateKey.publicKey)), new PubKey(toHex(privateKey.publicKey))]);

            tictactoe.setDataPart("0011");

            await delay(3000);
            let tx = await web3.deploy(tictactoe, 1000);
            console.log('tx', tx)
            assert.isTrue(typeof tx === 'string' && tx !== '')

        })
    })

})