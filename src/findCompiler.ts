
import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import * as minimist from 'minimist';
import * as os from 'os';
import { join, resolve } from 'path';

import compareVersions = require('compare-versions');
import showNoCompilerFound = require('../util/showerror');


export function getPlatformScryptc(): string {
  switch (os.platform()) {
    case 'win32':
      return 'compiler/scryptc/win32/scryptc.exe';
    case 'linux':
      return 'compiler/scryptc/linux/scryptc';
    case 'darwin':
      return 'compiler/scryptc/mac/scryptc';
    default:
      throw `sCrypt doesn't support ${os.platform()}`;
  }
}


function find_compiler_vscode(): string | undefined {
  const homedir = os.homedir();
  const extensionPath = join(homedir, '.vscode/extensions');
  if (!existsSync(extensionPath)) {
    return undefined;
  }

  const sCryptPrefix = 'bsv-scrypt.scrypt-';
  let versions = readdirSync(extensionPath).reduce((filtered, item) => {
    if (item.indexOf(sCryptPrefix) > -1) {
      const version = item.substring(sCryptPrefix.length);
      if (compareVersions.validate(version)) {
        filtered.push(version);
      }
    }
    return filtered;
  }, []);

  // compareVersions is ascending, so reverse.
  versions = versions.sort(compareVersions).reverse();
  const sCryptExtensionDirName = sCryptPrefix + versions[0];

  const scryptc = join(extensionPath, sCryptExtensionDirName, getPlatformScryptc());

  return existsSync(scryptc) ? scryptc : undefined;

}


function find_compiler_local(directory: string = __dirname): string | undefined {

  const compiler = resolve(directory, 'compiler');
  if (existsSync(compiler) && statSync(compiler).isDirectory()) {
    const scryptc = join(compiler, '..', getPlatformScryptc());
    return existsSync(scryptc) ? scryptc : undefined;
  }

  const parent = resolve(directory, '..');
  if (parent === directory) {
    return undefined;
  }
  return find_compiler_local(parent);
}

function find_compiler_PATH(): string | undefined {

  const isWin = os.platform().indexOf('win') > -1;

  const where = isWin ? 'where' : 'which';


  try {
    const scryptc = execSync(`${where} scryptc`, { stdio: [] }).toString();
    return scryptc.replace(/\r\n/g, '');
  } catch (error) {
    return undefined;
  }
}

// Searches known directories for a specific platform and returns Path object of the sCrypt compiler binary if found.
export function findCompiler(): string | undefined {


  const argv = minimist(process.argv.slice(2));

  let scryptc = argv.scryptc;

  if (scryptc && scryptc.startsWith('"') && scryptc.endsWith('"')) {
    scryptc = scryptc.substring(1, scryptc.length - 1);
  }

  // If a special compiler is specified on the command line, the specified compiler is used
  if (scryptc && existsSync(scryptc)) {
    return scryptc;
  }

  scryptc = find_compiler_local();

  if (scryptc && existsSync(scryptc)) {
    return scryptc;
  }

  scryptc = find_compiler_PATH();

  if (scryptc && existsSync(scryptc)) {
    return scryptc;
  }

  scryptc = find_compiler_vscode();

  if (scryptc && existsSync(scryptc)) {
    return scryptc;
  }

  showNoCompilerFound();

}
