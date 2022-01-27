import type { OverrideBundleType } from '@polkadot/types/types';

import { versionedKhala } from '@phala/typedefs';

export default { typesBundle: {spec: { khala: {types: versionedKhala }}} as OverrideBundleType};