import { execSync } from "child_process";
import { exit } from "process";
import { join } from "path";
import { copyFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";

let dirname;
if (typeof __dirname === "undefined") {
  dirname = fileURLToPath(new URL(".", import.meta.url));
} else {
  dirname = __dirname;
}

import chalk from "chalk";
const { green, grey, yellow } = chalk;

import glob from "glob";

function isDev() {
  const cwd = process.cwd();
  if (cwd.indexOf("node_modules") > -1) {
    return false;
  }

  return true;
}

const _isDev = isDev();

function apply(patches) {
  patches.map((patch) => {
    const dest = _isDev
      ? join(dirname, "..", "node_modules", patch)
      : join(dirname, "..", "..", patch);
    if (!existsSync(dest)) {
      new Error(`apply patch ${patch} fail, dest file ${dest} not exist`);
    }
    const src = join(dirname, patch);
    if (!existsSync(src)) {
      new Error(`apply patch ${patch} fail, src file ${src} not exist`);
    }
    copyFileSync(src, dest);
  });
}

function printFinish() {
  console.info(
    `${green("✔")} ${green.bold("The patches has been successfully applied.")}`,
  );

  console.info(
    `
${grey("•")}`,
    `If you want to use sCrypt compiler binary, run ${
      yellow.bold("npx scryptlib download")
    } to download the compiler binary.`,
  );
}

try {
  glob("**/*.js", { cwd: "./patches" }, function (err, patches) {
    apply(patches.slice(1));
    printFinish();
  });
} catch (error) {
  console.error(error);
}
