import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { bsv } from '../src/utils';
import { Artifact } from '../src/contract';
export function loadArtifact(fileName: string): Artifact {
  return JSON.parse(readFileSync(join(__dirname, "../out/", fileName)).toString());
}

export function loadASM(fileName: string): string {
  return readFileSync(join(__dirname, 'fixture', fileName.replace('.scrypt', '_asm.json'))).toString();
}

export function getContractFilePath(fileName: string): string {
  return join(__dirname, 'fixture', fileName);
}

export function getInvalidContractFilePath(fileName: string): string {
  return join(__dirname, 'fixture', 'invalid', fileName);
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

export function excludeMembers(o: any, members: string[]) {

  if (Array.isArray(o)) {
    return o.map(i => excludeMembers(i, members))
  } else {
    Object.keys(o).forEach(key => {

      if (members.indexOf(key) > -1) {
        delete o[key];
      }

      if (typeof o[key] === "object" && o[key] !== null) {
        excludeMembers(o[key], members)
      }
    })
  }

  return o;
}

export function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}
