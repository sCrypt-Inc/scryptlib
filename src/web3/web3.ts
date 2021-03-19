import { promises } from "dns";
import { AbstractContract, buildContractClass, buildTypeClasses } from "../contract";
import { ScryptType, SupportedParamType } from "../scryptTypes";
import { wallet } from "./wallet";
import { bsv } from "../utils";

import axios from 'axios';
const WEB3_VERSION = "0.0.1";

const FEE_PER_KB = 250;
const Signature = bsv.crypto.Signature
const DEFAULT_SIGHASHTYPE =
Signature.SIGHASH_ALL |
Signature.SIGHASH_FORKID;

export class web3 {


    static wallet: wallet;


    static setWallet(wallet: wallet) {
        web3.wallet = wallet;
    }


    static version(){
        return WEB3_VERSION;
    }


    static loadContract(url: string): Promise< {
        contract: typeof AbstractContract,
        types:  Record<string, typeof ScryptType>
    }> {

        return axios.get(url, {
            timeout: 10000
        }).then(res => {

            if(res.status === 200) {
                return {
                    contract: buildContractClass(res.data), 
                    types: buildTypeClasses(res.data)
                }
            }

            return null;
        })
    }


    static async deploy(contract: AbstractContract, amountInContract: number): Promise<string> {
        let changeAddress = await web3.wallet.changeAddress();
        return web3.wallet.queryUtxos(amountInContract, {
            purpose: 'change'
        }).then(async utxos => {
            const tx = new bsv.Transaction().from(utxos.map(utxo => ({
                txId: utxo.tx_hash,
                outputIndex: utxo.tx_pos,
                satoshis: utxo.value,
                script: utxo.script
            })))

            tx.addOutput(new bsv.Transaction.Output({
                script: bsv.Script.fromASM(contract.lockingScript.toASM()),
                satoshis: amountInContract,
            }))
        
            tx.change(changeAddress).feePerKb(FEE_PER_KB);

            let sig = await  web3.wallet.signTx(tx.toString(), 0, DEFAULT_SIGHASHTYPE, utxos[0]);

            tx.inputs[0].setScript(bsv.Script.fromString(sig))
            return tx.toString();
        }).then(rawTx => {
            return web3.wallet.sendTx(rawTx)
        })
    }


    static call(contract: AbstractContract, params: SupportedParamType[], method: string): Promise<string> {


        
        return null;
    }

}

console.log(`hello, this is scryptlib web3 ${WEB3_VERSION}.`)