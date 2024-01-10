#!/bin/bash

set -exu -o pipefail

: "${AWS_REGION:=us-west-2}"
: "${CONTAINER_REGISTRY:=201135299591.dkr.ecr.${AWS_REGION}.amazonaws.com}"
: "${CONTAINER_TAG:=$(git rev-parse HEAD)}"

docker run --rm \
           -it \
           --env-file ./deploy/.env.template \
           "${CONTAINER_REGISTRY}/polymesh/subquery-dictionary:${CONTAINER_TAG}"