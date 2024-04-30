#!/bin/bash

while getopts f:p:o:r:y: flag
do
    case "${flag}" in
        f) FILE=${OPTARG};;
        p) PROJECTNAME=${OPTARG};;
        o) ORG=${OPTARG};;
        r) ROOTPATH=${OPTARG};;
        y) YAML=${OPTARG};;
        *) echo "Usage: $0 [-f file] [-p projectname] [-o org] [-r rootpath] [-y yaml]" && exit 1;;
    esac
done

cd "$FILE" || exit

# Check if YAML is defined and set IPFSCID and ENDPOINT accordingly
if [ -n "$YAML" ]; then
    IPFSCID=$(npx subql publish -o -f "$ROOTPATH/$FILE/$YAML")
    ENDPOINT=$(yq e '.network.endpoint' "$ROOTPATH/$FILE/$YAML")
else
    IPFSCID=$(npx subql publish -o -f "$ROOTPATH/$FILE")
    ENDPOINT=$(yq e '.network.endpoint' "$ROOTPATH/$FILE/project.yaml")
fi

npx subql deployment:deploy -d --ipfsCID="$IPFSCID" --projectName="${PROJECTNAME}" --org="${ORG%/*}" --endpoint="${ENDPOINT}"
