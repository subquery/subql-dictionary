import type { OverrideBundleDefinition } from '@polkadot/types/types';

// structs need to be in order
/* eslint-disable sort-keys */

const definitions: OverrideBundleDefinition = {
  types: [
    {
      // on all versions
      minmax: [0, undefined],
      types:
      {
        CurrencyId: {
          _enum: [
            'MA'
          ]
        },
        CurrencyIdOf: 'CurrencyId',
        Amount: 'i128',
        AmountOf: 'Amount',
        AccountInfo: 'AccountInfoWithDualRefCount',
        DispatchErrorModule: 'DispatchErrorModuleU8'
      }
    }
  ]
};

export default { typesBundle: { spec: { "calamari": definitions }}};
