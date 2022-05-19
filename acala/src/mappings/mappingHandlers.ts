import { EventRecord } from "@polkadot/types/interfaces";
import { SubstrateExtrinsic, SubstrateBlock, SubstrateEvent } from "@subql/types";
import { SpecVersion, Event, Extrinsic, EvmLog, EvmTransaction } from "../types";
import acalaProcessor from '@subql/acala-evm-processor';
import {hexDataSlice, stripZeros} from '@ethersproject/bytes';
import { merge } from 'lodash';

let specVersion: SpecVersion;
export async function handleBlock(block: SubstrateBlock): Promise<void> {
  // Initialise Spec Version
  if (!specVersion) {
    specVersion = await SpecVersion.get(block.specVersion.toString());
  }

  // Check for updates to Spec Version
  if (!specVersion || specVersion.id !== block.specVersion.toString()) {
    specVersion = new SpecVersion(block.specVersion.toString());
    specVersion.blockHeight = block.block.header.number.toBigInt();
    await specVersion.save();
  }

  const wrappedExtrinsics = wrapExtrinsics(block);
  const wrappedEvents = wrapEvents(block.events, block, wrappedExtrinsics);

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

  const evmLogs = await Promise.all(
    wrappedEvents
      .filter(evt => {
        const baseFilter = acalaProcessor.handlerProcessors['substrate/AcalaEvmEvent'].baseFilter[0];
        return evt.event.section === baseFilter.module && evt.event.method === baseFilter.method;
      })
      .map(evt => handleEvmLog(block.block.header.number.toString(), evt))
  );

  // Process all calls in block
  const calls = wrappedExtrinsics.map((ext, idx) =>
    handleCall(`${block.block.header.number.toString()}-${idx}`, ext)
  );

  const evmTransactions = await Promise.all(wrappedExtrinsics
    .filter(ex => {
      const baseFilter = acalaProcessor.handlerProcessors['substrate/AcalaEvmCall'].baseFilter[0];
      return ex.extrinsic.method.section === baseFilter.module && ex.extrinsic.method.method === baseFilter.method && ex.success;
    })
    .map(ex => handleEvmTransaction(ex.idx, ex))
  );

  // Save all data
  await Promise.all([
    store.bulkCreate("Event", events),
    store.bulkCreate("Extrinsic", calls),
    store.bulkCreate("EvmLog", evmLogs.flat()),
    store.bulkCreate("EvmTransaction", evmTransactions.flat()),
  ]);
}

function handleEvent(
  blockNumber: string,
  eventIdx: number,
  event: EventRecord
): Event {
  const newEvent = new Event(`${blockNumber}-${eventIdx}`);
  newEvent.blockHeight = BigInt(blockNumber);
  newEvent.module = event.event.section;
  newEvent.event = event.event.method;
  return newEvent;
}

function handleCall(idx: string, extrinsic: SubstrateExtrinsic): Extrinsic {
  const newExtrinsic = new Extrinsic(idx);
  newExtrinsic.txHash = extrinsic.extrinsic.hash.toString();
  newExtrinsic.module = extrinsic.extrinsic.method.section;
  newExtrinsic.call = extrinsic.extrinsic.method.method;
  newExtrinsic.blockHeight = extrinsic.block.block.header.number.toBigInt();
  newExtrinsic.success = extrinsic.success;
  newExtrinsic.isSigned = extrinsic.extrinsic.isSigned;
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

function wrapEvents(events: EventRecord[], block: SubstrateBlock, extrinsics: SubstrateExtrinsic[]): SubstrateEvent[] {
  return events.reduce((acc, event, idx) => {
    const { phase } = event;
    const wrappedEvent: SubstrateEvent = merge(event, { idx, block });
    if (phase.isApplyExtrinsic) {
      wrappedEvent.extrinsic = extrinsics[phase.asApplyExtrinsic.toNumber()];
    }
    acc.push(wrappedEvent);
    return acc;
  }, [] as SubstrateEvent[]);
}


async function handleEvmLog(blockNumber: string, event: SubstrateEvent): Promise<EvmLog[]> {

  const evmLogs = await acalaProcessor.handlerProcessors['substrate/AcalaEvmEvent'].transformer({
    input: event,
    ds: null,
    api: api as any,
  });

  return evmLogs.map(evt => EvmLog.create({
    id: `${blockNumber}-${event.idx}-${evt.logIndex}`,
    address: evt.address,
    blockHeight: BigInt(blockNumber),
    topics0: evt.topics[0],
    topics1: evt.topics[1],
    topics2: evt.topics[2],
    topics3: evt.topics[3],
  }));
}

async function handleEvmTransaction(idx: number, tx: SubstrateExtrinsic): Promise<EvmTransaction[]> {
  const calls = await acalaProcessor.handlerProcessors['substrate/AcalaEvmCall'].transformer({
    input: tx,
    ds: null,
    api: api as any,
  });

  return calls.map((call, i) => EvmTransaction.create({
    id: `${call.blockNumber}-${idx}-${i}`,
    txHash: call.hash,
    from: call.from,
    to: call.to,
    func: isZero(call.data) ? undefined : inputToFunctionSighash(call.data),
    blockHeight: BigInt(call.blockNumber),
    success: tx.success,
  }));
}

export function inputToFunctionSighash(input: string): string {
    return hexDataSlice(input, 0, 4);
}

export function isZero(input: string): boolean {
    return stripZeros(input).length === 0;
}

