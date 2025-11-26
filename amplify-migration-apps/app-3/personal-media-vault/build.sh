#!/bin/bash
set -e

# Store current directory
APP_DIR=$(pwd)

# Navigate to amplify-cli root and build TypeScript first
cd ../../../
yarn build

# Return to app directory and install dependencies
cd "$APP_DIR"
yarn install