import { Argument, Arguments } from './abi';
import { TxContext } from './contract';
import { Bytes, SigHashPreimage, SigHashType } from './scryptTypes';
import { DEFAULT_FLAGS, getPreimage, isEmpty } from './utils';
import { Table } from 'console-table-printer';
import chalk = require('chalk')
import Diff = require('diff');
import bsv = require('bsv');
interface Outpoint { hash: string, index: number }

const customChalk = new chalk.Instance({ level: 1 });

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

export function getCheckPreiamgeErrorDetail(arg: Argument, txCtx: TxContext, inputLockingScript: string, supportsColor?: boolean): string {
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

  const isSupportsColor = chalk.supportsColor ? true : false || supportsColor;

  const diff = getSigHashPreimageDiff(preimageFromTx, preimageInParam);

  const preimageFromTxJson = preimageFromTx.toJSONObject();


  let title = 'CheckPreimage Fail Hints\n \n You should check the differences in detail listed below:';
  if (isSupportsColor) {
    title += `fields of ${customChalk.green('preimage')} calculated with TxContext is marked green
    fields of public function param ${customChalk.red(arg.name)} is marked red\n`;
  }

  const p = new Table({
    title: title,
    columns: [
      { name: 'Field', alignment: 'left' }, //with alignment and color
      { name: 'value', alignment: 'left' }, // with Title as separate Text
    ],
  });


  if (isEmpty(diff)) {
    const result = p.render();

    return [
      result,
      `There is no different field, the preimage of param ${arg.name} is indeed calculated by the TxContext.`,
      `The reason for the check failure is usually because the sighashtype used by the contract to check ${arg.name} is different from the sighashtype used for calculating the preimage of the TxContext`,
      `Check if the sighashtype used by the contract is [${preimageFromTxJson.sighashType}], which is used by ${arg.name}`
    ].join('\n');
  }


  Object.keys(diff).forEach(k => {
    let value1 = diff[k][0];
    let value2 = diff[k][1];

    if (k === 'outpoint') {
      value1 = JSON.stringify(value1);
      value2 = JSON.stringify(value2);
    }

    if (k === 'scriptCode') {
      value1 = 'See scriptCode diff below ...';
      value2 = 'See scriptCode diff below ...';
    }

    if (k === 'sighashType') {
      value1 = `"${new SigHashType(value1).toString()}"`;
      value2 = `"${new SigHashType(value2).toString()}"`;
    }

    p.addRow({ Field: isSupportsColor ? k : `${k}:TxContext`, value: value1 }, { color: 'green' });
    p.addRow({ Field: isSupportsColor ? k : `${k}:${arg.name}`, value: value2 }, { color: 'red' });
  });

  let result = p.render();

  if (diff['scriptCode']) {
    let scriptCodeDiff = '';

    if (isSupportsColor) {
      Diff.diffWords(bsv.Script.fromHex(diff['scriptCode'][0]).toASM(), bsv.Script.fromHex(diff['scriptCode'][1]).toASM()).forEach((part) => {

        if (part.added) {
          scriptCodeDiff += customChalk.red(part.value);
        } else if (part.removed) {
          scriptCodeDiff += customChalk.green(part.value);
        } else {
          scriptCodeDiff += customChalk.grey(part.value);
        }
      });

      result += `\n[scriptCode diff:\n ${scriptCodeDiff}]`;
    } else {

      result += `\n[scriptCode diff:\n TxContext:\n${bsv.Script.fromHex(diff['scriptCode'][0]).toASM()} \n\n\n${arg.name}:\n${bsv.Script.fromHex(diff['scriptCode'][1]).toASM()}]`;
    }
  }


  return result + '\n';
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

