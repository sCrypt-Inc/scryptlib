


export interface UTXO {
    height: number,
    tx_pos: number,
    tx_hash: string;
    value: number;
    script: string;
}

export interface Account {
    name: string,
    paymail: string,
    address: string,
    permissions?: string[]
}


export enum NetWork {
    Testnet = "testnet",
    Mainnet = "mainnet",
    STN = "STN"
}

export abstract class wallet {

    network: NetWork;

    constructor(network: NetWork) {
        this.network = network;
    }

    abstract requestAccount(name: string, permissions: string[]):Promise<Account>;

    abstract balance():Promise<number>;


    abstract signTx(rawTx: string, 
        inputIndex: number,
        sigHashType: number,
        utxo: UTXO
    ):Promise<string>;

    abstract sendTx(rawTx: string):Promise<string>;

    abstract queryUtxos(minAmount: number, options?: {
        purpose?: string
    }):Promise<UTXO[]>;

    abstract changeAddress(options?: {
        purpose?: string
    }):Promise<string>;

}