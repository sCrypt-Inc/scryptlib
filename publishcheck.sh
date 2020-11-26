#!/usr/bin/env bash
set -e

WORKSPACE_ROOT=$1


echo "make sure all your code is merged to master."

echo "doing publishcheck ..."

BRANCH="master"

git checkout "$BRANCH"

echo "Start git pull ..."

git pull --rebase
