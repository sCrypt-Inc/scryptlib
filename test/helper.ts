import glob = require('glob');
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { compile, compilerVersion } from '../src/compiler';
import { AbiJSON } from '../src/abi';
import { bsv } from '../src/utils';

export function loadAbiJSON(fileName: string): AbiJSON {
  return JSON.parse(readFileSync(join(__dirname, 'fixture', fileName.replace('.scrypt', '_abi.json'))).toString());
}

export function loadASM(fileName: string): string {
  return readFileSync(join(__dirname, 'fixture', fileName.replace('.scrypt', '_asm.json'))).toString();
}

function compileAllFixtureContracts() {
  const contracts = glob.sync(join(__dirname, 'fixture/*.scrypt'));
  contracts.forEach(filePath => {
    compile(
      { path: filePath },
      { abi: true, outputToFiles: true }
    );
  })
}

function beforeAllTests() {
  const compilerVersionFile = join(__dirname, 'fixture/.compilerVersion');
  const lastVersion = existsSync(compilerVersionFile) ? readFileSync(compilerVersionFile).toString() : undefined;
  const curVersion = compilerVersion();
  if (lastVersion !== curVersion) {
    compileAllFixtureContracts();
    writeFileSync(compilerVersionFile, curVersion);
  }
}

export function newTx(inputSatoshis: number) {
  const utxo = {
    txId: 'a477af6b2667c29670467e4e0728b685ee07b240235771862318e29ddbe58458',
    outputIndex: 0,
    script: '',   // placeholder
    satoshis: inputSatoshis
  };
  return new bsv.Transaction().from(utxo);
}

beforeAllTests();

// compileAllFixtureContracts();