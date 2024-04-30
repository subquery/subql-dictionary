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

# Parse the endpoint from the YAML file
ENDPOINT=$(yq e '.network.endpoint' "$ROOTPATH/$FILE/$YAML")

if [ "$YAML" != undefined ]
  then
    IPFSCID=$(npx subql publish -o -f"$ROOTPATH/$FILE/$YAML")
  else
    IPFSCID=$(npx subql publish -o -f "$ROOTPATH/$FILE")
fi

npx subql deployment:deploy -d --ipfsCID="$IPFSCID" --projectName="${PROJECTNAME}" --org="${ORG%/*}" --endpoint="${ENDPOINT}"
