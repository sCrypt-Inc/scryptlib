
import { toHex, bsv } from '../utils';
const Signature = bsv.crypto.Signature;
export interface UTXO {
  txHash: number,
  outputIndex: string;
  satoshis: number;
  script: string;
}

export interface Output {
  satoshis: number,
  script: string;
}


export interface Input {
  utxo: UTXO,
  sequence: number,
  script: string;
}

export interface Tx {
  inputs: Input[],
  outputs: Output[],
}

export interface Account {
  name: string,
  paymail: string,
  address: string,
  permissions?: string[]
}


export enum NetWork {
  Testnet = 'testnet',
  Mainnet = 'mainnet',
  STN = 'STN'
}


export enum SignType {
  ALL = 0x00000001 | 0x00000040,
  SINGLE = 0x00000003 | 0x00000040,
  NONE = 0x00000002 | 0x00000040,
  ANYONECANPAY_ALL = 0x00000001 | 0x00000040 | 0x00000080,
  ANYONECANPAY_SINGLE = 0x00000003 | 0x00000040 | 0x00000080,
  ANYONECANPAY_NONE = 0x00000002 | 0x00000040 | 0x00000080
}


export abstract class wallet {

  network: NetWork;

  constructor(network: NetWork) {
    this.network = network;
  }


  static toBsvTx(tx: Tx) {
    const tx_ = new bsv.Transaction();

    tx.inputs.forEach(input => {
      tx_.addInput(new bsv.Transaction.Input({
        prevTxId: input.utxo.txHash,
        outputIndex: input.utxo.outputIndex,
        script: input.script ? bsv.Script.fromHex(input.script) : new bsv.Script(),
      }), bsv.Script.fromHex(input.utxo.script), input.utxo.satoshis);
    });


    tx.outputs.forEach(output => {
      tx_.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.fromHex(output.script),
        satoshis: output.satoshis,
      }));
    });

    return tx_;
  }

  static toHexBsvTx(tx: Tx) {
    return wallet.toBsvTx(tx).toString();
  }


  abstract requestAccount(name: string, permissions: string[]): Promise<Account>;

  abstract balance(): Promise<number>;


  abstract signTx(tx: Tx,
    inputIndex: number,
    sigHashType: SignType,
    onlySig?: boolean,
  ): Promise<string>;

  abstract sendTx(rawTx: string): Promise<string>;

  abstract queryUtxos(minAmount: number, options?: {
    purpose?: string
  }): Promise<UTXO[]>;

  abstract changeAddress(options?: {
    purpose?: string
  }): Promise<string>;

  abstract publicKey(options?: {
    purpose?: string
  }): Promise<string>;

}