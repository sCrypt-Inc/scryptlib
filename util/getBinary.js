const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const os = require('os');
const fs = require('fs');
const stream = require('stream');
const util = require('util');
const path = require('path');
var child_process_1 = require("child_process");
const chalk = require("chalk");
const { exit } = require('process');

const DEFAULT_COMPILER_VERSION = '1.17.3';

function getPlatformScryptc() {
  switch (os.platform()) {
    case 'win32':
      return 'compiler/scryptc/win32/scryptc.exe';
    case 'linux':
      return 'compiler/scryptc/linux/scryptc';
    case 'darwin':
      return 'compiler/scryptc/mac/scryptc';
    default:
      throw "sCrypt doesn't support " + os.platform();
  }
}

function compilerVersion(cwd) {
  try {
    var text = child_process_1.execSync(cwd + " version").toString();
    return /Version:\s*([^\s]+)\s*/.exec(text)[1];
  }
  catch (e) {
    throw new Error("compilerVersion fail when run: " + cwd + " version");
  }
}


const getBinary = async () => {
  let FILENAME = "Windows.exe";
  let VERSION = process.argv.slice(3);

  if (VERSION.length === 0) {
    const fromAPI = await fetch('https://api.github.com/repos/scrypt-inc/compiler_dist/releases');
    const res = await fromAPI.json();

    if (res && res[0] && res[0].tag_name) {
      VERSION = res[0].tag_name.substring(1);
    } else {
      console.error(`fetch latest compiler version failed, using default compiler version: ${DEFAULT_COMPILER_VERSION}`, res);
      VERSION = DEFAULT_COMPILER_VERSION
    }

  }

  if (os.platform() === 'linux') {
    FILENAME = "Linux";
  } else if (os.platform() === 'darwin') {
    FILENAME = "macOS";
  }

  const streamPipeline = util.promisify(stream.pipeline);
  const urlCompiler = `https://github.com/sCrypt-Inc/compiler_dist/releases/download/v${VERSION}/scryptc-${VERSION}-${FILENAME}`
  const filePathCompiler = path.join(__dirname, '..', getPlatformScryptc());
  const dirCompiler = path.dirname(filePathCompiler);

  if (!fs.existsSync(dirCompiler)) {
    fs.mkdirSync(dirCompiler, { recursive: true });
  }

  console.log(`${chalk.yellow(`Downloading compiler ${urlCompiler} ...`)}`);

  const fromRelease = await fetch(urlCompiler);

  if (!fromRelease.ok) {
    console.log(`⛔️ ${chalk.red('Download Unsuccesful:')} ${fromRelease.statusText}`);
  } else {
    await streamPipeline(fromRelease.body, fs.createWriteStream(filePathCompiler));
    fs.chmodSync(filePathCompiler, '755');
    console.log(`Download Successful, path: ${filePathCompiler}`);
    console.log(`Compiler vesion: ${chalk.green.bold(compilerVersion(filePathCompiler))} ${chalk.green("✔")}`);
  }
}

if (require.main === module) {
  getBinary();
}

module.exports = getBinary;
