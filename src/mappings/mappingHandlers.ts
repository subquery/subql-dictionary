import {SubstrateExtrinsic,SubstrateEvent,SubstrateBlock} from "@subql/types";
import {SpecVersion,Event,Extrinsic} from "../types";


export async function handleBlock(block: SubstrateBlock): Promise<void> {
    const specVersion = await SpecVersion.get(block.specVersion.toString());
    if(specVersion === undefined){
        const newSpecVersion = new SpecVersion(block.specVersion.toString());
        newSpecVersion.blockHeight = block.block.header.number.toBigInt();
        await newSpecVersion.save();
    }
}

export async function handleEvent(event: SubstrateEvent): Promise<void> {
    const thisEvent = await Event.get(`${event.block.block.header.number}-${event.idx.toString()}`);
    if(thisEvent === undefined){
        const newEvent = new Event(`${event.block.block.header.number}-${event.idx.toString()}`);
        newEvent.blockHeight = event.block.block.header.number.toBigInt();
        newEvent.module = event.event.section;
        newEvent.event = event.event.method;
        await newEvent.save();
    }

}

export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const thisExtrinsic = await Extrinsic.get(extrinsic.extrinsic.hash.toString());
    if(thisExtrinsic === undefined){
        const newExtrinsic = new Extrinsic(extrinsic.extrinsic.hash.toString());
        newExtrinsic.module = extrinsic.extrinsic.method.section;
        newExtrinsic.call = extrinsic.extrinsic.method.method;
        newExtrinsic.blockHeight = extrinsic.block.block.header.number.toBigInt();
        newExtrinsic.success = extrinsic.success;
        newExtrinsic.isSigned = extrinsic.extrinsic.isSigned;
        await newExtrinsic.save();
    }
}


