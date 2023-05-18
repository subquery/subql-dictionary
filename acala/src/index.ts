//Exports all handler functions
import {atob} from 'abab';
if (!global.atob) {
    global.atob = atob;
}
export * from "./mappings/mappingHandlers";
import "@polkadot/api-augment";
