import type { EventRecord } from "@polkadot/types/interfaces";
import type { SubstrateBlock, SubstrateExtrinsic } from "@subql/types";
import { Event, Extrinsic, SpecVersion } from "../types";

export async function handleBlock(block: SubstrateBlock): Promise<void> {
  // Initialise Spec Version
  let specVersion = await SpecVersion.get(block.specVersion.toString());

  // Check for updates to Spec Version
  if (!specVersion) {
    specVersion = SpecVersion.create({
      id: block.specVersion.toString(),
      blockHeight: block.block.header.number.toBigInt(),
    });
    await specVersion.save();
  }

  // Process all events in block
  const events = block.events
    .filter(
      (evt) =>
        !(evt.event.section === "system" &&
          evt.event.method === "ExtrinsicSuccess")
    )
    .map((evt, idx) =>
      handleEvent(block.block.header.number.toString(), idx, evt)
    );

  // Process all calls in block
  const calls = wrapExtrinsics(block).map((ext, idx) =>
    handleCall(`${block.block.header.number.toString()}-${idx}`, ext)
  );

  // Save all data
  // All save order should always follow this structure
  for (const event of events) {
    await event.save()
  }
  for (const call of calls) {
    await call.save()
  }
}

function handleEvent(
  blockNumber: string,
  eventIdx: number,
  event: EventRecord
): Event {
  return Event.create({
    id: `${blockNumber}-${eventIdx}`,
    blockHeight: BigInt(blockNumber),
    module: event.event.section,
    event: event.event.method,
  });
}

function handleCall(idx: string, extrinsic: SubstrateExtrinsic): Extrinsic {
  return Extrinsic.create({
    id: idx,
    txHash: extrinsic.extrinsic.hash.toString(),
    module: extrinsic.extrinsic.method.section,
    call: extrinsic.extrinsic.method.method,
    blockHeight: extrinsic.block.block.header.number.toBigInt(),
    success: extrinsic.success,
    isSigned: extrinsic.extrinsic.isSigned,
  });
}

function wrapExtrinsics(wrappedBlock: SubstrateBlock): SubstrateExtrinsic[] {
  const groupedEvents = wrappedBlock.events.reduce((acc, evt) => {
    if (evt.phase.isApplyExtrinsic) {
      acc[evt.phase.asApplyExtrinsic.toNumber()] ??= [];
      acc[evt.phase.asApplyExtrinsic.toNumber()].push(evt);
    }
    return acc;
  }, {} as Record<number, EventRecord[]>)
  return wrappedBlock.block.extrinsics.map((extrinsic, idx) => {
    const events = groupedEvents[idx];
    return {
      idx,
      extrinsic,
      block: wrappedBlock,
      events,
      success:
        events.findIndex((evt) => evt.event.method === "ExtrinsicSuccess") > -1,
    };
  });
}
