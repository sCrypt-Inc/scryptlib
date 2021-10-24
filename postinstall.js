
const { execSync } = require("child_process");
const { exit } = require("process");
const chalk = require("chalk");

function isDev() {
    const cwd = process.cwd();
    if (cwd.indexOf("node_modules") > -1) {
        return false;
    }

    return true;
}

const _isDev = isDev();

function printFinish() {
    console.info(`${chalk.green("✔")} ${chalk.green.bold("The patches has been successfully applied.")}`)

    console.info(`
${chalk.grey("•")}`, `If you want to use sCrypt compiler binary, run ${chalk.yellow.bold("npx scryptlib download")} to download the compiler binary.`)
}

function apply(changeDir) {

    const cwd = process.cwd();
    console.log('workspace:', cwd)
    if (!_isDev) {
        if (changeDir) {
            process.chdir('../../');
            console.log('changed workspace:', process.cwd())
        }


        execSync("npx patch-package --patch-dir node_modules/scryptlib/patches --error-on-fail", { stdio: 'inherit' })
    } else {
        execSync("npx patch-package --error-on-fail", { stdio: 'inherit' });
    }
}

try {
    apply(true);
    printFinish();
} catch (error) {

    try {


        if (_isDev) {
            execSync("npm i bsv", { stdio: 'inherit' });
            execSync("npm i json-bigint", { stdio: 'inherit' });

            apply(false);
            printFinish();
        } else {
            console.log(`⛔️ ${chalk.red.bold("Applying patches failed")} , please run ${chalk.yellow.bold("npm ci")} to try again ...`)
        }

    } catch (error) {

        console.error('retry failed', error);
        exit(-1)
    }

}

// download binary
// getBinary();
