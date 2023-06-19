import { OverrideBundleType } from '@polkadot/types/types';
import * as typeDefs from '@zeitgeistpm/type-defs';

export function typesFromDefs (definitions: Record<string, { types: Record<string, any> }>): Record<string, any> {
    return Object
        .values(definitions)
        .reduce((res: Record<string, any>, { types }): Record<string, any> => ({
            ...res,
            ...types
        }), {});
}


const types = {
    alias: {
        tokens: {
            AccountData: 'TokensAccountData'
        }
    },
    types: [{
        minmax: [0, undefined],
        types: {
            // the cast here is needed to make the build happy,
            // however the output is actually correct as well...
            // in ts: ...typesFromDefs(typeDefs as unknown as Record<string, { types: Record<string, any> }>),
            ...typesFromDefs(typeDefs),
            TokensAccountData: {
                free: 'Balance',
                    frozen: 'Balance',
                    reserved: 'Balance'
            },
            // Fixed from block 1 to 166730
            RegistrationInfo: {
                account: "AccountId",
                deposit: "Balance"
            },
            AuthorId: "AccountId"
        }
    }]
};

const typesBundle: OverrideBundleType = {
    spec: {
      zeitgeist: types,
    },
}

export default {
    types: {
    },
    typesBundle
};