const chalk = require('chalk');
function showNoCompilerFound() {
    console.info(`${chalk.bgRed.bold('**ERROR**: No sCrypt compiler found.')}`);

    console.info(`${chalk.green.bold('You can install the compiler in the following ways: \n')}`);

    console.info(`${chalk.grey('•')}`, `Run ${chalk.yellow.bold('npx scryptlib download')} to download the sCrypt compiler.`);

    console.info(`${chalk.grey('•')}`, `Install ${chalk.bold('sCrypt IDE')} at vscode extension marketplace: ${chalk.blue.bold('https://marketplace.visualstudio.com/items?itemName=bsv-scrypt.sCrypt')}`);
}


module.exports = showNoCompilerFound;
