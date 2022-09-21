
const { execSync } = require("child_process");
const { exit } = require("process");
const { join } = require("path");
const { copyFileSync, existsSync } = require("fs");
const chalk = require("chalk");
var glob = require('glob');

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


try {

    glob('**/*.js', { cwd: "./patches" }, function (err, patches) {
        apply(patches.slice(1));
        printFinish();
    });

} catch (error) {

    console.error(error)

}
