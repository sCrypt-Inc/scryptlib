const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const os = require('os');
const fs = require('fs');
const stream = require('stream');
const util = require('util');

const getBinary = async () => {
  let FILENAME = "Windows.exe";
  let VERSION = process.argv.slice(2);

  if (VERSION.length === 0) {
    const fromAPI = await fetch('https://api.github.com/repos/scrypt-inc/compiler_dist/releases');
    const res = await fromAPI.json();
    VERSION = res[0]['tag_name'].substring(1);
  }
  
  console.log('getting VERSION', VERSION);

  if (os.platform() === 'linux') {
      FILENAME = "Linux";
  } else if (os.platform() === 'darwin') {
      FILENAME = "macOS";
  }

  const streamPipeline = util.promisify(stream.pipeline);
  const urlCompiler= `https://github.com/sCrypt-Inc/compiler_dist/releases/download/v${VERSION}/scryptc-${VERSION}-${FILENAME}`
  const filePathCompiler = `${__dirname}/../bin/scryptc-${FILENAME}`;
  const fromRelease = await fetch(urlCompiler);

  if (!fromRelease.ok) {
    console.log(`Download Unsuccesful: ${fromRelease.statusText}`);
  } else {
    await streamPipeline(fromRelease.body, fs.createWriteStream(filePathCompiler));
    fs.chmodSync(filePathCompiler, '755');
    console.log(`Download Successful`);
  }
}

if (require.main === module) {
  getBinary();
}

module.exports = getBinary;
