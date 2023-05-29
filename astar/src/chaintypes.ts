import type { OverrideBundleDefinition } from '@polkadot/types/types';

// structs need to be in order
/* eslint-disable sort-keys */

const definitions: OverrideBundleDefinition = {
  types: [
    {
      // TODO awaiting an error at a future spec version to figure out the end range
      minmax: [3, undefined],
      types: {
        DispatchErrorModule: {
            index: 'u8',
            error: 'u8',
        },
      }
    }
  ]
};

export default { typesBundle: { spec: { "shiden": definitions }}};
