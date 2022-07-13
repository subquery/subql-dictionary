#!/bin/bash

while getopts f:p:o:r: flag
do
    case "${flag}" in
        f) FILE=${OPTARG};;
        p) PROJECTNAME=${OPTARG};;
        o) ORG=${OPTARG};;
        r) ROOTPATH=${OPTARG};;
        *) echo "Usage: $0 [-f file] [-p projectname] [-o org] [-r rootpath]" && exit 1;;
    esac
done

cd "$FILE" || exit

IPFSCID=$(npx subql publish -o -f "$ROOTPATH/$FILE")

npx subql deployment:deploy -d --ipfsCID="$IPFSCID" --projectName="${PROJECTNAME}" --org="${ORG%/*}"
