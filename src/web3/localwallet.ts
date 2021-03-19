import { Account, NetWork, UTXO, wallet } from "./wallet";
import { toHex, bsv } from '../../src/utils';
import { signInput} from './wutils';
import axios from 'axios';


export class LocalWallet extends wallet {
    API_PREFIX: string;
    privKey: any;
    constructor(network: NetWork, key?: string) {
        super(network);
        this.API_PREFIX = `https://api.whatsonchain.com/v1/bsv/${network == NetWork.Testnet ? "test": "main"}`;
        this.privKey =  key ? new bsv.PrivateKey.fromWIF(key) : new bsv.PrivateKey.fromRandom(network);
    }


    requestAccount(name: string, permissions: string[]): Promise<Account> {
        throw new Error("Method not implemented.");
    }

    async balance(): Promise<number> {
        
        let {
            data: balance
        } = await axios.get(`${this.API_PREFIX}/address/${this.privKey.toAddress()}/balance`, {
            timeout: 5000
        })
    
        return balance.confirmed + balance.unconfirmed;
    }

    async signTx(rawTx: string, 
        inputIndex: number,
        sigHashType: number,
        utxo: UTXO
    ):Promise<string> {
        let tx = new bsv.Transaction();
        tx.fromString(rawTx);
        return signInput(this.privKey, tx, inputIndex, sigHashType, utxo);
    }

    async sendTx(rawTx: string): Promise<string> {
       
        // 1 second per KB
    
        const size = Math.max(1, rawTx.length / 2 /1024); //KB
        const time = Math.max(10000, 1000 * size);
        const {
            data: txid
        } = await axios.post(`${this.API_PREFIX}/tx/raw`, {
            txhex: rawTx
        }, {
            timeout: time
        })
        return txid
    }

    async queryUtxos(minAmount: number, options?: { purpose?: string;}): Promise<UTXO[]> {
        return axios.get(`${this.API_PREFIX}/address/${this.privKey.toAddress()}/unspent`, {
            timeout: 10000
        }).then(res => {
            return res.data.map(utxo => {
                return Object.assign(utxo, {
                    script: bsv.Script.buildPublicKeyHashOut(this.privKey.toAddress()).toHex(),
                })
            });
        })
    }
    changeAddress(options?: { purpose?: string; }): Promise<string> {
        return this.privKey.toAddress();
    }

}