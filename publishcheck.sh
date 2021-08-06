#!/usr/bin/env bash
set -e

WORKSPACE_ROOT=$1

version=$(node -e "const version = JSON.parse(fs.readFileSync('./package.json', 'utf8')).version; console.log(version)")

if [[ $version == *"beta"* ]]; then
  echo "beta version: ${version}, exit check."
  exit
fi


echo "make sure all your code is merged to master."

echo "doing publishcheck ..."

BRANCH="master"

git checkout "$BRANCH"

echo "Start git pull ..."

git pull --rebase
