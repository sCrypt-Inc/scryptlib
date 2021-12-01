
const { execSync } = require("child_process");
const { exit } = require("process");
const { join } = require("path");
const { copyFileSync, existsSync } = require("fs");
const chalk = require("chalk");

function isDev() {
    const cwd = process.cwd();
    if (cwd.indexOf("node_modules") > -1) {
        return false;
    }

    return true;
}

const _isDev = isDev();


function apply(patches) {
    patches.map(patch => {
        const dest = _isDev ? join(__dirname, '..', 'node_modules', patch) : join(__dirname, '..', '..', patch);
        if (!existsSync(dest)) {
            new Error(`apply patch ${patch} fail, dest file ${dest} not exist`);
        }
        const src = join(__dirname, patch);
        if (!existsSync(src)) {
            new Error(`apply patch ${patch} fail, src file ${src} not exist`);
        }
        copyFileSync(src, dest);
    })
}


function printFinish() {
    console.info(`${chalk.green("✔")} ${chalk.green.bold("The patches has been successfully applied.")}`)

    console.info(`
${chalk.grey("•")}`, `If you want to use sCrypt compiler binary, run ${chalk.yellow.bold("npx scryptlib download")} to download the compiler binary.`)
}

const patches = [
    'bsv/lib/crypto/bn.js',
    'bsv/lib/crypto/ecdsa.js',
    'bsv/lib/script/index.js',
    'bsv/lib/script/interpreter.js',
    'bsv/lib/script/script.js',
    'bsv/lib/script/stack.js',
    'bsv/lib/transaction/input/input.js',
    'bsv/lib/transaction/transaction.js',
    'bsv/lib/errors/spec.js',
    'json-bigint/lib/parse.js',
]

try {
    apply(patches);
    printFinish();
} catch (error) {

    console.error(error)

}
