const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const os = require('os');
const fs = require('fs');
const stream = require('stream');
const util = require('util');
const path = require('path');
const chalk = require("chalk");
const { findCompiler, compilerVersion, getPlatformScryptc } = require('../dist');

const DEFAULT_COMPILER_VERSION = '1.19.0';

function safeCompilerVersion(cmd) {
  try {
    return compilerVersion(cmd)
  } catch (error) {
    return '0.0.0';
  }
}


const getBinary = async (version) => {
  let FILENAME = "Windows.exe";

  version = version || ''

  if (version.length === 0) {
    const fromAPI = await fetch('https://api.github.com/repos/scrypt-inc/compiler_dist/releases');
    const res = await fromAPI.json();

    if (res && res[0] && res[0].tag_name) {
      version = res[0].tag_name.substring(1);
    } else {
      console.info(`${chalk.green.bold(`
${chalk.grey.bold("x")}`)}`, `fetch latest sCrypt compiler version failed, using default version: ${DEFAULT_COMPILER_VERSION}`);
      version = DEFAULT_COMPILER_VERSION
    }
  }

  if (os.platform() === 'linux') {
    FILENAME = "Linux";
  } else if (os.platform() === 'darwin') {
    FILENAME = "macOS";
  }

  const compilerPath = findCompiler();

  if (compilerPath && safeCompilerVersion(compilerPath).startsWith(version)) {
    console.log(`${chalk.green.bold(`
${chalk.green.bold("✔")}`)}`, `${chalk.green.bold(`A latest sCrypt compiler found at: ${compilerPath}`)}`);
    return
  }


  const streamPipeline = util.promisify(stream.pipeline);
  const urlCompiler = `https://github.com/sCrypt-Inc/compiler_dist/releases/download/v${version}/scryptc-${version}-${FILENAME}`
  const filePathCompiler = path.join(__dirname, '..', getPlatformScryptc());
  const dirCompiler = path.dirname(filePathCompiler);

  if (!fs.existsSync(dirCompiler)) {
    fs.mkdirSync(dirCompiler, { recursive: true });
  }

  console.info(`${chalk.yellow.bold(`
${chalk.grey("•")}`, `Downloading sCrypt compiler ${urlCompiler} ...`)}`);

  const fromRelease = await fetch(urlCompiler);

  if (!fromRelease.ok) {
    console.log(`⛔️ ${chalk.bgRed('Download Unsuccesful:')} ${fromRelease.statusText}`);
  } else {
    await streamPipeline(fromRelease.body, fs.createWriteStream(filePathCompiler));
    fs.chmodSync(filePathCompiler, '755');
    console.info(`${chalk.green.bold(`
${chalk.green("✔")}`)}`, chalk.green.bold(`Download Successful.`));


    console.info(`${chalk.yellow.bold(`
${chalk.grey("•")}`, `Compiler file path: ${filePathCompiler}`)}`);

    console.info(`${chalk.yellow.bold(`
${chalk.grey("•")}`, `Compiler vesion: ${safeCompilerVersion(filePathCompiler)}`)}`);

  }
}

if (require.main === module) {
  getBinary();
}

module.exports = { getBinary, safeCompilerVersion };
