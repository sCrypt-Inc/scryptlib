import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { bsv } from '../src/utils';
import { ContractDescription } from '../src/contract';
import { compile, CompileResult, getPlatformScryptc} from '../src/compilerWrapper';
export function loadDescription(fileName: string): ContractDescription {
  return JSON.parse(readFileSync(join(__dirname, "../out/", fileName)).toString());
}

export function loadASM(fileName: string): string {
  return readFileSync(join(__dirname, 'fixture', fileName.replace('.scrypt', '_asm.json'))).toString();
}

export function loadFile(fileName: string): string {
  return join(__dirname, 'fixture', fileName);
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


function getCIScryptc(): string | undefined {
  const scryptc = join(__dirname, '../', getPlatformScryptc());
  return existsSync(scryptc) ? scryptc : undefined;
}

export function compileContract(file: string) {
  console.log(`Compiling contract ${file} ...`);


  if(!existsSync(file)) {
    throw(`file ${file} not exists!`);
  }

  var argv = require('minimist')(process.argv.slice(2));

  let scryptc = argv.scryptc;
  if(argv.ci) {
    scryptc = getCIScryptc();
  }

  const result = compile(
    { path: file },
    { desc: true, debug: true, outputDir: join(__dirname, '../out'),
		  cmdPrefix: scryptc
    }
  );

  if (result.errors.length > 0) {
    console.log(`Contract ${file} compiling failed with errors:`);
    console.log(result.errors);
    throw result.errors;
  }

  return result;
}