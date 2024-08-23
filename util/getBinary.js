const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const os = require('os');
const fs = require('fs');
const stream = require('stream');
const util = require('util');
const path = require('path');
const chalk = require("chalk");
const { getProxySettings } = require("get-proxy-settings");
const { HttpsProxyAgent } = require('https-proxy-agent');
const { compilerVersion, getPlatformScryptc } = require('../dist');
const { showDownloadFailed } = require('./showerror');

const DEFAULT_COMPILER_VERSION = '1.19.4';

function safeCompilerVersion(cmd) {
  try {
    return compilerVersion(cmd)
  } catch (error) {
    return '0.0.0';
  }
}


const getBinary = async (version) => {
  const architecture = os.arch()
  const platform = os.platform()

  let FILENAME = "Windows-AMD64.exe";

  version = version || DEFAULT_COMPILER_VERSION

  const proxy = await getProxySettings();

  if (version === "latest") {
    const fromAPI = await fetch('https://api.github.com/repos/scrypt-inc/compiler_dist/releases',
      proxy !== null && proxy.https ? { agent: new HttpsProxyAgent(proxy.https) } : {});
    const res = await fromAPI.json();

    if (res && res[0] && res[0].tag_name) {
      version = res[0].tag_name.substring(1);
    } else {
      console.info(`${chalk.green.bold(`
${chalk.grey.bold("x")}`)}`, `fetch latest sCrypt compiler version failed, using default version: ${DEFAULT_COMPILER_VERSION}`);
      version = DEFAULT_COMPILER_VERSION
    }
  }

  if (platform === 'linux') {
    if (architecture == 'arm64') {
      FILENAME = "Linux-aarch64";
    } else {
      FILENAME = "Linux-x86_64";
    }
  } else if (platform === 'darwin') {
    FILENAME = "macOS-x86_64";
  }

  const streamPipeline = util.promisify(stream.pipeline);
  const urlCompiler = `https://github.com/sCrypt-Inc/compiler_dist/releases/download/v${version}/scryptc-${version}-${FILENAME}`
  const filePathCompiler = path.join(__dirname, '..', getPlatformScryptc());
  const dirCompiler = path.dirname(filePathCompiler);

  if (!fs.existsSync(dirCompiler)) {
    fs.mkdirSync(dirCompiler, { recursive: true });
  }

  console.info(`${chalk.yellow.bold(`
${chalk.grey("•")}`, `Downloading sCrypt compiler: ${version} ...`)}`);


  try {
    const fromRelease = await fetch(urlCompiler, proxy !== null && proxy.https ? {
      agent: new HttpsProxyAgent(proxy.https)
    } : {});

    if (!fromRelease.ok) {
      showDownloadFailed();
      return
    } else {
      await streamPipeline(fromRelease.body, fs.createWriteStream(filePathCompiler));
      fs.chmodSync(filePathCompiler, '755');
      console.info(`${chalk.green.bold(`
${chalk.green("✔")}`)}`, chalk.green.bold(`Successfully downloaded. File Path: ${filePathCompiler}`));

    }
  } catch (error) {
    showDownloadFailed();
  }

}

if (require.main === module) {
  getBinary();
}

module.exports = { getBinary, safeCompilerVersion };
