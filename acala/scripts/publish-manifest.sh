#!/bin/bash
set -e
for file in ./project*.yaml; do
    echo "Publishing $file..."
    npx subql publish -f "$file"
done