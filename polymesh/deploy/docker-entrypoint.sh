#!/bin/bash -xe

set -xe -o pipefail
_term() {
	echo "Caught SIGTERM signal!"
	kill -TERM "$child" 2>/dev/null
}
trap _term SIGTERM

# If NETWORK_CHAIN_ID is not set and we have an http endpoint to use, then curl the chain to fetch it (might need to retry)
if [[ -n $NETWORK_HTTP_ENDPOINT ]] && [[ -z $NETWORK_CHAIN_ID ]]
then
  export NETWORK_CHAIN_ID=$(curl --silent -H "Content-Type: application/json" -d '{"id":"1", "jsonrpc":"2.0", "method": "chain_getBlockHash", "params":[0]}' $NETWORK_HTTP_ENDPOINT |
  grep -o '"result":"[^"]*' |
  grep -o '[^"]*$'
)
  echo "NETWORK_CHAIN_ID was set to ${NETWORK_CHAIN_ID} based on calling: $NETWORK_HTTP_ENDPOINT. Production chains should explictly set NETWORK_CHAIN_ID instead"
fi

envsubst < project.template.yaml > project.yaml # Substitute environment variables in project.template.yaml

# Allow configuring node memory. Default to 1.5MB, should be ~75% of available RAM
NODE_SPACE=${MAX_OLD_SPACE_SIZE:-1536}

node --max-old-space-size=$NODE_SPACE \
	/bin/run $@ 

child=$!
wait "$child"
