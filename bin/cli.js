#!/usr/bin/env node
const os = require('os');
const path = require('path');
const fs = require('fs');
const { compile, getPlatformScryptc, getOutputFilePath } = require('../dist/compilerWrapper.js');
const chalk = require("chalk");
const { exit } = require("process");

function main() {


  let scryptBinaryPath = process.env.npm_config_user_agent ? `./node_modules/scryptlib/${getPlatformScryptc()}` : `${getPlatformScryptc()}`;

  let sourcePath = path.isAbsolute(process.argv.slice(2)[0]) ? process.argv.slice(2)[0] : path.resolve(process.argv.slice(2)[0]);

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
        desc: true,
        asm: true,
        optimize: false,
        sourceMap: true,
        cmdPrefix: path.join(__dirname, '..', scryptBinaryPath)
      }
    );

    if (result.errors.length > 0) {
      console.error(`Contract ${sourcePath} ${chalk.red.bold('compiling failed')} with errors:`);
      console.error(chalk.red(JSON.stringify(result.errors, null, 4)));
      exit(1);
    }

    const output = path.join(out, `${path.basename(sourcePath, '.scrypt')}_desc.json`);

    console.log(`${chalk.green("✔")} ${chalk.green.bold("Compiling succeeded")} with output: ${output}`);

  } catch (error) {
    console.log(`${chalk.red.bold('**ERROR**')} ${chalk.red(`Failed to compile ${sourcePath}`)}`);
    console.log(`${chalk.red.bold('**MESSAGE**')} ${chalk.red(error.message)}`);
    console.log(`If you don't know what to do， please submit a bug report. Thanks!
    
    `);
    console.log(chalk.green('https://github.com/sCrypt-Inc/compiler_dist/issues'));
  }

}

if (require.main === module) {
  main();
}
