import { typesBundleForPolkadot } from "@acala-network/type-definitions";

typesBundleForPolkadot.spec.karura.types = [
    ... typesBundleForPolkadot.spec.karura.types,
    {
            minmax:[0,undefined],
            types: {
                // @ts-ignore
                DispatchTime: {
                    _enum: {
                        At: 'BlockNumber',
                        After: 'BlockNumber'
                    }
                },
                CallOf: 'Call',
                AsOriginId: 'AuthoritysOriginId',
                AuthoritysOriginId: {
                    _enum: [
                        'Root',
                        'EaveTreasury',
                        'CdpTreasury',
                        'ElpTreasury',
                        'DSWF'
                    ]
                },
                DispatchErrorModule: 'DispatchErrorModuleU8'
            },
        }
    ]

export default { typesBundle: typesBundleForPolkadot };
