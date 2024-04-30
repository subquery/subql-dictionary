import { EventRecord } from "@polkadot/types/interfaces";
import { SubstrateExtrinsic, SubstrateBlock } from "@subql/types";
import { SpecVersion, Event, Extrinsic } from "../types";

export async function handleBlock(block: SubstrateBlock): Promise<void> {
  // Initialise Spec Version
  let specVersion = await SpecVersion.get(block.specVersion.toString());

  // Check for updates to Spec Version
  if (!specVersion) {
    specVersion = new SpecVersion(block.specVersion.toString(),block.block.header.number.toBigInt());
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
  const newEvent = new Event(`${blockNumber}-${eventIdx}`,event.event.section,event.event.method,BigInt(blockNumber));
  return newEvent;
}

function handleCall(idx: string, extrinsic: SubstrateExtrinsic): Extrinsic {
  const newExtrinsic = new Extrinsic(
      idx,
      extrinsic.extrinsic.hash.toString(),
      extrinsic.extrinsic.method.section,
      extrinsic.extrinsic.method.method,
      extrinsic.block.block.header.number.toBigInt(),
      extrinsic.success,
      extrinsic.extrinsic.isSigned
  );
  return newExtrinsic;
}

function wrapExtrinsics(wrappedBlock: SubstrateBlock): SubstrateExtrinsic[] {
  return wrappedBlock.block.extrinsics.map((extrinsic, idx) => {
    const events = wrappedBlock.events.filter(
      ({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.eqn(idx)
    );
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
