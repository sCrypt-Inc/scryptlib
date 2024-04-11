import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { Artifact } from '../src/contract';
import { Chain, LockingScript } from '../src/chain';

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

export function newTx(inputSatoshis: number = 100000, lockingScript: LockingScript = Chain.getFactory().LockingScript.from()) {

  const sourceTx = Chain.getFactory().Transaction.from(1, [], [{
    lockingScript: lockingScript,
    satoshis: inputSatoshis
  }], 0)

  const spendTx = Chain.getFactory().Transaction.from(1, [{
    sourceTransaction: sourceTx,
    sourceOutputIndex: 0,
    sequence: 0xffffffff,
  }], [], 0)

  return spendTx;
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
