
const { join } = require("path");
const { copyFileSync } = require("fs");
const chalk = require("chalk");
const { glob } = require('glob')

const findNodeModules = require('find-node-modules');

function apply(patches) {
    const targets = findNodeModules({ relative: false })

    if (targets.length < 1) {
        throw new Error('No node modules found.');
    }

    patches.map(patch => {
        targets.forEach(target => {
            try {
                const dest = join(target, patch);
                const src = join(__dirname, patch);
                copyFileSync(src, dest);
            } catch (error) {
            }
        })
    })
}


function printFinish() {
    console.info(`${chalk.green("✔")} ${chalk.green.bold("The patches has been successfully applied.")}`)

    //     console.info(`
    // ${chalk.grey("•")}`, `If you want to use sCrypt compiler binary, run ${chalk.yellow.bold("npx scryptlib download")} to download the compiler binary.`)
}

module.exports = function () {
    try {
        glob('**/*.js', { cwd: "./patches" }, function (err, patches) {
            apply(patches.slice(1));
        });

        printFinish();
    } catch (error) {
        console.info(`${chalk.red("x")} ${chalk.bgRed.bold("The patches has not been successfully applied.")}`)
        console.info(`${chalk.bgRed(`**ERROR**: ${error.message}`)}`)
    }
}

