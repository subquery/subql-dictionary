# What is SubQuery?

SubQuery powers the next generation of Polkadot dApps by allowing developers to extract, transform and query blockchain data in real time using GraphQL. In addition to this, SubQuery provides production quality hosting infrastructure to run these projects in.

# What is SubQuery Dictionary

This special SubQuery Project provides a dictionary of data that pre-indexes events on chain to dramatically improve indexing the performance of your own SubQuery Project, sometimes up to 10x faster.

It scans over the network, and records the module and method for every event/extrinsic on each block. See the standard entities in the `schema.graphql` file within this project to see what fields are available.

**If you want to create your SubQuery Dictionary to speed up indexing of your own Substrate chain, fork this project and let us know**

# Getting Started

### 1. Add the dictionary URL to your SubQuery project

```shell
network:
  endpoint: wss://polkadot.api.onfinality.io/public-ws
  dictionary: https://api.subquery.network/sq/subquery/dictionary-polkadot
```

# Understanding the dictionary

Visit [How the dictionary works](https://doc.subquery.network/tutorials_examples/howto.html#how-does-a-subquery-dictionary-work) for more information.
