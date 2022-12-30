var fs = require('fs')
var path = require('path')
const { exit } = require("process");
const chalk = require("chalk");
const { findCompiler, compile } = require('../dist');

function compileScryptFile(sourcePath) {


    let scryptBinaryPath = findCompiler();

    try {

        if (!fs.existsSync(sourcePath)) {
            console.log(`${chalk.red.bold('**ERROR**')} ${chalk.red(`Source File ${sourcePath} does not exist`)}`);
            exit(1);
        }
        console.log(`${chalk.yellow.bold("Compiling")} ${sourcePath}`);
        const out = path.join(process.cwd(), 'out');

        if (!fs.existsSync(out)) {
            fs.mkdirSync(out, { recursive: true });
        }
        const result = compile(
            {
                path: sourcePath  //  the file path of the contract
            },
            {
                outputDir: out,
                artifact: true,
                hex: true,
                optimize: false,
                sourceMap: true,
                debug: true,
                cmdPrefix: scryptBinaryPath
            }
        );

        if (result.errors.length > 0) {
            console.error(`Contract ${sourcePath} ${chalk.red.bold('compiling failed')} with errors:`);
            console.error(chalk.red(JSON.stringify(result.errors, null, 4)));
            exit(1);
        }

        const output = path.join(out, `${path.basename(sourcePath, '.scrypt')}.json`);

        console.log(`${chalk.green("✔")} ${chalk.green.bold("Compiling succeeded")} with output: ${output}`);

    } catch (error) {
        console.log(`${chalk.red.bold('**ERROR**')} ${chalk.red(`Failed to compile ${sourcePath}`)}`);
        console.log(`${chalk.red.bold('**MESSAGE**')} ${chalk.red(error.message)}`);
        console.log(`If you don't know what to do， please submit a bug report. Thanks!

    `);
        console.log(chalk.green('https://github.com/sCrypt-Inc/compiler_dist/issues'));
    }

}

module.exports = { compileScryptFile };
