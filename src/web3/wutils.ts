
import { toHex, bsv } from '../utils';
import { UTXO } from './wallet';


export function signInput(privateKey: any, tx: any, inputIndex: number, sigHashType: number, utxo: UTXO): string {

  tx.inputs[inputIndex].output = new bsv.Transaction.Output({
    script: utxo.script,
    satoshis: utxo.satoshis
  });

  const sig = new bsv.Transaction.Signature({
    publicKey: privateKey.publicKey,
    prevTxId: utxo.txHash,
    outputIndex: utxo.outputIndex,
    inputIndex,
    signature: bsv.Transaction.Sighash.sign(tx, privateKey, sigHashType,
      inputIndex,
      tx.inputs[inputIndex].output.script,
      tx.inputs[inputIndex].output.satoshisBN),
    sigtype: sigHashType,
  });

  return bsv.Script.buildPublicKeyHashIn(
    sig.publicKey,
    sig.signature.toDER(),
    sig.sigtype,
  ).toHex();
}