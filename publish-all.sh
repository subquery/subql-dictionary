#!/bin/bash
set -e

for dir in */; do
    for file in "${dir}"project*.yaml; do
        echo "Publishing $file..."
        npx subql publish -f "$file"
    done
done