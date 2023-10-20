const chalk = require('chalk');
function showNoCompilerFound() {
  console.info(`${chalk.bgRed.bold('**ERROR**: No sCrypt compiler found.')}`);
}


function showDownloadFailed() {
  console.info(`${chalk.bgRed.bold('**ERROR**: Downloading sCrypt compiler failed.')}`);
  console.info(`Go to ${chalk.blue.bold('https://github.com/sCrypt-Inc/compiler_dist/releases')} to download sCrypt compiler.\n`);
}



module.exports = { showNoCompilerFound, showDownloadFailed };
