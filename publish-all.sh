#!/bin/bash
set -e

for dir in */; do
    for file in "${dir}"project*.yaml; do
        echo "Publishing $file..."
        # yarn --cwd ${dir}
        # yarn --cwd ${dir} add -D @polkadot/api@^13
        # yarn --cwd ${dir} codegen
        npx subql publish -f "$file"
    done
done
