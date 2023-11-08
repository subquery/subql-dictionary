import { typesBundleForPolkadot } from '@bifrost-finance/type-definitions';
// @ts-ignore
typesBundleForPolkadot.spec.bifrost.types[0].types.DispatchErrorModule = 'DispatchErrorModuleU8'
typesBundleForPolkadot.spec.bifrost.types.push(
    {
        minmax: [0, undefined],
        types:{
            // @ts-ignore
            DispatchErrorModule: 'DispatchErrorModuleU8',
        }
    }
)

export default { typesBundle: typesBundleForPolkadot };
