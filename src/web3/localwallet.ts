import { Account, NetWork, UTXO, wallet, Tx, SignType } from './wallet';
import { toHex, bsv, signTx } from '../utils';
import { signInput } from './wutils';
import axios from 'axios';


export class LocalWallet extends wallet {
  API_PREFIX: string;
  privKey: any;
  constructor(network: NetWork, key?: string) {
    super(network);
    this.API_PREFIX = `https://api.whatsonchain.com/v1/bsv/${network == NetWork.Testnet ? 'test' : 'main'}`;
    this.privKey = key ? new bsv.PrivateKey.fromWIF(key) : new bsv.PrivateKey.fromRandom(network);
  }


  requestAccount(name: string, permissions: string[]): Promise<Account> {
    throw new Error('Method not implemented.');
  }

  async balance(): Promise<number> {

    const {
      data: balance
    } = await axios.get(`${this.API_PREFIX}/address/${this.privKey.toAddress()}/balance`, {
      timeout: 5000
    });

    return balance.confirmed + balance.unconfirmed;
  }

  async signTx(tx: Tx,
    inputIndex: number,
    sigHashType: SignType,
    onlySig = false
  ): Promise<string> {


    const tx_ = wallet.toBsvTx(tx);

    const utxo = tx.inputs[inputIndex].utxo;

    if (onlySig) {
      return signTx(tx_, this.privKey, tx_.inputs[inputIndex].output.script.toASM(), tx_.inputs[inputIndex].output.satoshisBN, inputIndex, sigHashType);
    }
    return signInput(this.privKey, tx_, inputIndex, sigHashType, utxo);
  }

  async sendTx(rawTx: string): Promise<string> {

    // 1 second per KB

    const size = Math.max(1, rawTx.length / 2 / 1024); //KB
    const time = Math.max(10000, 1000 * size);
    const {
      data: txid
    } = await axios.post(`${this.API_PREFIX}/tx/raw`, {
      txhex: rawTx
    }, {
      timeout: time
    });
    return txid;
  }

  async queryUtxos(minAmount: number, options?: { purpose?: string; }): Promise<UTXO[]> {
    return axios.get(`${this.API_PREFIX}/address/${this.privKey.toAddress()}/unspent`, {
      timeout: 10000
    }).then(res => {
      return res.data.map(utxo => {
        return {
          txHash: utxo.tx_hash,
          outputIndex: utxo.tx_pos,
          satoshis: utxo.value,
          script: bsv.Script.buildPublicKeyHashOut(this.privKey.toAddress()).toHex(),
        } as UTXO;
      });
    });
  }


  changeAddress(options?: { purpose?: string; }): Promise<string> {

    return new Promise(resolve => resolve(this.privKey.toAddress() + ''));
  }


  publicKey(options?: { purpose?: string; }): Promise<string> {

    return new Promise(resolve => resolve(toHex(this.privKey.publicKey)));
  }

}