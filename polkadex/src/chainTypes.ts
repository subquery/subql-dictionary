
import type { OverrideBundleDefinition } from '@polkadot/types/types';

// structs need to be in order
/* eslint-disable sort-keys */

const definitions: OverrideBundleDefinition = {
    types: [{
        minmax: [0, undefined],
        types: {
            DispatchErrorModule: 'DispatchErrorModuleU8'
        }
    }]
}

export default { typesBundle: { spec: { "node": definitions }}};
