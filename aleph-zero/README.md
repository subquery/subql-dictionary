# SubQuery - Dictionary 

This special SubQuery Project provides a dictionary of data that pre-indexes events on chain to dramatically improve indexing the performance of your own SubQuery Project, sometimes up to 10x faster.

It scans over the network, and simply records the module and method for every event/extrinsic on each block - please see the standard entities in `schema.graphql`.

**If you want to create your SubQuery Dictionary to speed up indexing of your own Substrate chain, fork this project and let us know**

# Geting Started
### 1. Install dependencies
```shell
yarn
```

### 2. Generate types
```shell
yarn codegen
```

### 3. Build
```shell
yarn build
```

### 4. Run locally
```shell
yarn start:docker
```

### 4. Queries

Event:

```
query {
  events(first: 10, filter: {blockHeight : {equalTo:"50253705"}}) {
    nodes {
      id,
      module,
      event,
      blockHeight
    }
  }
}
```

Extrinsic:

```
query {
  extrinsics(first: 10, filter: {blockHeight : {equalTo:"50253705"}}) {
    nodes {
      id,
      module,
      call,
      blockHeight,
      success,
      isSigned,
    }
  }
}
```

SpecVersion:

```
query {
  specVersions(first: 10) {
    nodes {
      id,
      blockHeight
    }
  }
}
```