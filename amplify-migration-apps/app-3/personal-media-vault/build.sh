#!/bin/bash
set -e

# Navigate to amplify-cli root and build TypeScript first
cd ../../../
yarn build

# Then install dependencies
yarn install