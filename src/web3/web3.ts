import { promises } from 'dns';
import { AbstractContract, buildContractClass, buildTypeClasses } from '../contract';
import { ScryptType, SigHashPreimage } from '../scryptTypes';
import { Output, UTXO, wallet, Tx, Input, SignType } from './wallet';
import { bsv, getPreimage, toHex } from '../utils';
import { Call } from './call';
import axios from 'axios';
const WEB3_VERSION = '0.0.1';

const FEE_PER_KB = 500;
const FEE = 1000;

export class web3 {


    static wallet: wallet;


    static setWallet(wallet: wallet) {
      web3.wallet = wallet;
    }


    static version() {
      return WEB3_VERSION;
    }


    static loadContract(url: string): Promise<{
        contract: typeof AbstractContract,
        types: Record<string, typeof ScryptType>
    }> {

      return axios.get(url, {
        timeout: 10000
      }).then(res => {

        if (res.status === 200) {
          return {
            contract: buildContractClass(res.data),
            types: buildTypeClasses(res.data)
          };
        }

        return null;
      });
    }



    static async buildDeployTx(contract: AbstractContract, amountInContract: number): Promise<Tx> {

      return web3.buildUnsignDeployTx(contract, amountInContract).then(async (tx: Tx) => {
        const sig = await web3.wallet.signTx(tx, 0, SignType.ALL);
        tx.inputs[0].script = sig;
        return tx;
      });
    }



    static async appendPayInput(tx: Tx, payAmount: number): Promise<Tx> {
      const changeAddress = await web3.wallet.changeAddress();

      return web3.wallet.queryUtxos(payAmount, {
        purpose: 'change'
      }).then(async (utxos: UTXO[]) => {


        if (utxos.length === 0) {
          throw new Error('no utxos');
        }

        const inputIndex = tx.inputs.length;
        tx.inputs.push(
          {
            utxo: utxos[0],
            script: '',
            sequence: 0
          }
        );

        const changeAmount = utxos[0].satoshis - payAmount - FEE;
        tx.outputs.push(
          {
            script: bsv.Script.buildPublicKeyHashOut(changeAddress).toHex(),
            satoshis: changeAmount
          }
        );

        const sig = await web3.wallet.signTx(tx, inputIndex, SignType.ALL);
        tx.inputs[inputIndex].script = sig;
        return tx;
      });
    }



    static async buildUnsignDeployTx(contract: AbstractContract, amountInContract: number): Promise<Tx> {
      const changeAddress = await web3.wallet.changeAddress();
      return web3.wallet.queryUtxos(amountInContract, {
        purpose: 'change'
      }).then(async (utxos: UTXO[]) => {
        if (utxos.length === 0) {
          throw new Error('no utxos');
        }

        const tx: Tx = {
          inputs: [],
          outputs: []
        };
        const input: Input = {
          utxo: utxos[0],
          sequence: 0,
          script: ''
        };

        tx.inputs.push(input);

        tx.outputs.push({
          script: contract.lockingScript.toHex(),
          satoshis: amountInContract
        });

        const changeAmount = utxos[0].satoshis - amountInContract - FEE;
        tx.outputs.push({
          script: bsv.Script.buildPublicKeyHashOut(changeAddress).toHex(),
          satoshis: changeAmount
        });

        return tx;
      });
    }



    static getPreimage(tx: Tx, inputIndex = 0, sigHashType: SignType = SignType.ALL): SigHashPreimage {
      const bsvTx = wallet.toBsvTx(tx);
      return getPreimage(bsvTx, bsv.Script.fromHex(tx.inputs[inputIndex].utxo.script).toASM(), tx.inputs[inputIndex].utxo.satoshis, inputIndex, sigHashType);
    }


    static async sendRawTx(rawTx: string): Promise<string> {
      return web3.wallet.sendTx(rawTx);
    }

    static async sendTx(tx: Tx): Promise<string> {
      return web3.wallet.sendTx(wallet.toHexBsvTx(tx));
    }


    static async deploy(contract: AbstractContract, amountInContract: number): Promise<string> {
      return web3.buildDeployTx(contract, amountInContract).then(async tx => {
        return web3.sendTx(tx);
      });
    }


    static call(calls: Call[], utxos: UTXO[],
      outputs: Output[]): Promise<string> {

      return null;
    }

}




console.log(`hello, this is scryptlib web3 ${WEB3_VERSION}.`);