#!/bin/sh
set -e

rm -rf ./bsv

git clone --depth=1 https://github.com/sCrypt-Inc/bsv.git


cp ./bsv/index.d.ts ./patches/bsv
cp ./bsv/index.js ./patches/bsv


cp -Rv ./bsv/lib ./patches/bsv
