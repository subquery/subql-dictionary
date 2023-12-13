# SubQuery - Dictionary

This special SubQuery Project provides a dictionary of data that pre-indexes events on Polymesh chain to dramatically improve indexing the performance of the SubQuery Project, sometimes up to 10x faster.

It scans over the network, and simply records the module and method for every event/extrinsic on each block - please see the standard entities in `schema.graphql`.

**If you want to create your SubQuery Dictionary to speed up indexing of your own Substrate chain, fork this project and let us know**

# Geting Started

### 1. Install dependencies

```shell
yarn
```

### 2. Generate project.yaml

Using `project.template.yaml`, create the `project.yaml` file replacing the following -

- `NETWORK_ENDPOINT` - the wss endpoint of the blockchain to be indexed
- `NETWORK_CHAIN_ID` - The genesis hash of the chain. This value can be retrieved by going to the explorer and looking for the block hash of block 0. e.g. [for mainnet](https://mainnet-app.polymesh.network/#/explorer/query/0)

You can manually create copy of the file and replace the values or you can use the below command (replacing with you own values)

```shell
NETWORK_ENDPOINT=wss://testnet-rpc.polymesh.live NETWORK_CHAIN_ID=0x2ace05e703aa50b48c0ccccfc8b424f7aab9a1e2c424ed12e45d20b1e8ffd0d6 envsubst < project.template.yaml > project.yaml
```

### 3. Generate types

```shell
yarn codegen
```

### 4. Build

```shell
yarn build
```

### 5. Run locally

```shell
yarn start:docker
```
