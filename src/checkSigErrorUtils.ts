import { Argument, Arguments } from './abi';
import { TxContext } from './contract';
import { Bytes, SigHashPreimage, SigHashType } from './scryptTypes';
import { DEFAULT_FLAGS, getPreimage, isEmpty } from './utils';
import bsv = require('bsv');
interface Outpoint { hash: string, index: number }

export interface SighashPreiamgeDiff {
  nVersion?: [number, number],
  hashPrevouts?: [string, string],
  hashSequence?: [string, string],
  outpoint?: [Outpoint, Outpoint],
  scriptCode?: [string, string],
  amount?: [number, number],
  nSequence?: [number, number],
  hashOutputs?: [string, string],
  nLocktime?: [number, number],
  sighashType?: [number, number],
}

export function getSigHashPreimageDiff(sigImgA: SigHashPreimage, sigImgB: SigHashPreimage): SighashPreiamgeDiff {
  const result: SighashPreiamgeDiff = {};
  const attributes = ['nVersion', 'hashPrevouts', 'hashSequence', 'outpoint', 'scriptCode', 'amount', 'nSequence', 'hashOutputs', 'nLocktime', 'sighashType'];
  for (const att of attributes) {
    if (JSON.stringify(sigImgA[att]) !== JSON.stringify(sigImgB[att])) {
      result[att] = [sigImgA[att], sigImgB[att]];
    }
  }
  return result;
}

export function removeSharedStart([asmPreimageInParam, asmPreimageFromTx]) {
  const A: string[] = asmPreimageInParam.split(' ');
  const B: string[] = asmPreimageFromTx.split(' ');

  const L = A.length;

  let i = 0;
  while (i < L && A[i] === B[i] && A[i] != 'OP_RETURN') i++;

  if (A[i] === 'OP_RETURN') {
    return [`...${A.slice(i).join(' ')}`, `...${B.slice(i).join(' ')}`];
  }

  //return [`md5(scriptCode) = ${md5(asmPreimageInParam)}`, `md5(scriptCode) = ${md5(asmPreimageFromTx)}`];
}


export function getPubkeyAtCheckSigFail(interpretStates: any): string | undefined {
  const curStack = interpretStates[interpretStates.length - 1].mainstack;
  return curStack[1].toString('hex'); // public key is the second element on stack
}


export function findArgumentFailsAtCheckSig(paramType: string, args: Arguments): Argument | undefined {

  const pubFuncArgs = [...args.values()].filter(p => p.type === paramType);

  if (pubFuncArgs.length === 1) {
    return pubFuncArgs[0];
  }

  return undefined;
}


export function getCheckSigErrorDetail(arg: Argument, interpretStates: any, txCtx: TxContext, inputLockingScript: string): string {

  const sig: string = (arg.value as Bytes).value as string;

  const preimageFromTx = getPreimage(
    txCtx.tx,
    inputLockingScript,
    txCtx.inputSatoshis,
    txCtx.inputIndex,
    parseInt(sig.slice(sig.length - 2, sig.length), 16),
    DEFAULT_FLAGS
  );

  const preimageFromTxJson = preimageFromTx.toJSONObject();

  const scriptCode = bsv.Script.fromHex(preimageFromTxJson.scriptCode);
  const preimageFromTx_ = Object.assign({}, preimageFromTxJson, {
    scriptCode: {
      asm: scriptCode.toASM(),
      hex: scriptCode.toHex()
    }
  });

  const title = '----- CheckSig Fail Hints Begin -----';
  const body = [
    'You should make sure the following checkpoints all pass:',
    `1. private key used to sign should be corresponding to the public key ${getPubkeyAtCheckSigFail(interpretStates)}`,
    `2. the preimage of the tx to be signed should be:\n ${JSON.stringify(preimageFromTx_, null, 4)}`
  ].join('\n');
  const tail = '----- CheckSig Fail Hints End -----';

  return `\n${title}\n${body}\n${tail}\n`;
}

export function getCheckPreiamgeErrorDetail(arg: Argument, txCtx: TxContext, inputLockingScript: string): string {
  const preimage: string = (arg.value as Bytes).value as string;
  const preimageInParam = new SigHashPreimage(preimage);
  const preimageFromTx = getPreimage(
    txCtx.tx,
    inputLockingScript,
    txCtx.inputSatoshis,
    txCtx.inputIndex,
    preimageInParam.sighashType,
    DEFAULT_FLAGS
  );

  const diff = getSigHashPreimageDiff(preimageInParam, preimageFromTx);

  const preimageFromTxJson = preimageFromTx.toJSONObject();


  if (isEmpty(diff)) {
    return [
      '----- CheckPreimage Fail Hints Begin -----',
      `The preimage in param ${arg.name} is indeed calculated by the TxContext， `,
      'The reason for the check failure is usually because the sighashtype used by the contract to check the preimage is different from the sighashtype used by the preimage for calculating the transaction',
      `Check if the sighashtype used by the contract is [${preimageFromTxJson.sighashType}]`,
      '----- CheckPreimage Fail Hints End -----'
    ].join('\n');
  }

  const scriptCode = bsv.Script.fromHex(preimageFromTx.scriptCode);
  const preimageFromTx_ = Object.assign({}, preimageFromTxJson, {
    scriptCode: {
      asm: scriptCode.toASM(),
      hex: scriptCode.toHex(),
    }
  });

  const title = [
    '----- CheckPreimage Fail Hints Begin -----',
    'You should check the differences in detail listed below:\n',
    'Fields with difference | From preimage in entry method params | From preimage calculated with tx',
  ].join('\n');
  const tail = '----- CheckPreimage Fail Hints End -----';

  return `\n${title}\n${Object.keys(diff).map(k => {
    let value1 = diff[k][0];
    let value2 = diff[k][1];

    if (k === 'outpoint') {
      value1 = JSON.stringify(value1);
      value2 = JSON.stringify(value2);
    }

    if (k === 'scriptCode') {

      const [a, b] = removeSharedStart([bsv.Script.fromHex(value1).toASM(), bsv.Script.fromHex(value2).toASM()]);
      value1 = a;
      value2 = b;
    }

    if (k === 'sighashType') {
      value1 = `"${new SigHashType(value1).toString()}"`;
      value2 = `"${new SigHashType(value2).toString()}"`;
    }

    return `${k} | ${value1} | ${value2}`;
  }).join('\n')
  }\n\nPreimage calculated with tx:\n${JSON.stringify(preimageFromTx_, null, 4)}\n${tail}\n`;
}

export function getTxContextInfo(txCtx: TxContext): string {

  const tx = txCtx.tx;

  tx['inputs'] = [...tx['inputs'].map((input, i) => {
    input.toObject = function () {
      const { script, prevTxId, outputIndex, sequenceNumber } = input;
      return {
        'prevTxId': prevTxId.toString('hex'),
        outputIndex,
        sequenceNumber,
        'index': i,
        'unlockingScript': {
          'asm': script.toASM(),
          'hex': script.toHex()
        }
      };
    };
    return input;
  })];

  tx['outputs'] = [...tx['outputs'].map((output, i) => {
    output.toObject = function () {
      const { script, satoshis } = output;
      return {
        satoshis,
        'index': i,
        'lockingScript': {
          'asm': script.toASM(),
          'hex': script.toHex()
        }
      };
    };
    return output;
  })];

  txCtx['tx'] = tx;

  return `\nTxContext from config:\n${JSON.stringify(txCtx, null, 4)}\n`;
}

