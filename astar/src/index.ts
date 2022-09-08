//Exports all handler functions
import {atob} from 'abab';
global.atob = atob;
export * from "./mappings/mappingHandlers";
import "@polkadot/api-augment";
