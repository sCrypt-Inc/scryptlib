import glob = require('glob');
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { compile, compilerVersion } from '../src/scryptjs-compiler';

export function loadABI(fileName: string): any {
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
      { asm: true, abi: true, outputToFiles: true }
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

beforeAllTests();

// compileAllFixtureContracts();