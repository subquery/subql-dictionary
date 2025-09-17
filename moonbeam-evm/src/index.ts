//Exports all handler functions
import { atob } from "abab";

if (!global.atob) {
  (global as any).atob = atob;
}
export * from "./mappings/mappingHandlers";
import "@polkadot/api-augment";
