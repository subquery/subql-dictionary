import {EventRecord } from "@polkadot/types/interfaces"
import {SubstrateExtrinsic,SubstrateBlock} from "@subql/types";
import { SpecVersion, Event, Extrinsic} from "../types";
import { wrapExtrinsics } from "../utils";

let specVersion: SpecVersion;
export async function handleBlock(block: SubstrateBlock): Promise<void> {
    if (!specVersion) {
        specVersion = await SpecVersion.get(block.specVersion.toString());
    }

    if(!specVersion || specVersion.id !== block.specVersion.toString()){
        specVersion = new SpecVersion(block.specVersion.toString());
        specVersion.blockHeight = block.block.header.number.toBigInt();
        await specVersion.save();
    }
    const events = block.events.filter(evt => evt.event.section!=='system' && evt.event.method!=='ExtrinsicSuccess').map((evt, idx)=>handleEvent(block.block.header.number.toString(), idx, evt));
    const calls = wrapExtrinsics(block).map((ext,idx)=>handleCall(`${block.block.header.number.toString()}-${idx}`,ext));
    await Promise.all([
        store.bulkCreate('Event', events),
        store.bulkCreate('Extrinsic', calls)
    ]);
}

export function handleEvent(blockNumber: string, eventIdx: number, event: EventRecord): Event {
    const newEvent = new Event(`${blockNumber}-${eventIdx}`);
    newEvent.blockHeight = BigInt(blockNumber);
    newEvent.module = event.event.section;
    newEvent.event = event.event.method;
    return newEvent;
}

export function handleCall(idx: string, extrinsic: SubstrateExtrinsic): Extrinsic {
    const newExtrinsic = new Extrinsic(idx);
    newExtrinsic.txHash = extrinsic.extrinsic.hash.toString();
    newExtrinsic.module = extrinsic.extrinsic.method.section;
    newExtrinsic.call = extrinsic.extrinsic.method.method;
    newExtrinsic.blockHeight = extrinsic.block.block.header.number.toBigInt();
    newExtrinsic.success = extrinsic.success;
    newExtrinsic.isSigned = extrinsic.extrinsic.isSigned;
    return newExtrinsic;
}
