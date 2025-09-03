import { EventRecord } from "@polkadot/types/interfaces";
import { SubstrateExtrinsic, SubstrateBlock, SubstrateEvent } from "@subql/types";
import { SpecVersion, Event, Extrinsic, EvmLog, EvmTransaction } from "../types";
import acalaProcessor from '@subql/acala-evm-processor';
import { hexDataSlice, stripZeros } from '@ethersproject/bytes';
import { merge } from 'lodash';

export async function handleBlock(block: SubstrateBlock): Promise<void> {
  // Initialise Spec Version
  let specVersion = await SpecVersion.get(block.specVersion.toString());

  // Check for updates to Spec Version
  if (!specVersion) {
    specVersion = new SpecVersion(block.specVersion.toString(), block.block.header.number.toBigInt());
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

  const baseEventFilter = acalaProcessor.handlerProcessors['substrate/AcalaEvmEvent'].baseFilter[0];
  const evmLogs: EvmLog[][] = []
  for (const evt of wrappedEvents.filter(evt => {

    return evt.event.section === baseEventFilter.module && evt.event.method === baseEventFilter.method;
  })) {
    const logResult = await handleEvmLog(block.block.header.number.toString(), evt);
    evmLogs.push(logResult);
  }

  // Process all calls in block
  const evmTransactions: EvmTransaction[][] = [];
  const calls: Extrinsic[] = [];
  const baseCallFilter = acalaProcessor.handlerProcessors['substrate/AcalaEvmCall'].baseFilter[0];

  for (let i = 0; i < wrapExtrinsics.length; i++/*const ex of wrappedExtrinsics*/) {
    const ex = wrapExtrinsics[i]

    if (ex.extrinsic.method.section === baseCallFilter.module && ex.extrinsic.method.method === baseCallFilter.method && ex.success) {
      const transactionResult = await handleEvmTransaction(ex.idx, ex);
      evmTransactions.push(transactionResult);
    }
    calls.push(handleCall(`${block.block.header.number.toString()}-${i}`, ex))
  }

  // Save all data
  // All save order should always follow this structure
  for (const event of events) {
    await event.save()
  }
  for (const call of calls) {
    await call.save()
  }

  for (const evmLog of evmLogs.flat()) {
    await evmLog.save()
  }
  for (const evmTransaction of evmTransactions.flat()) {
    await evmTransaction.save()
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
    ds: {} as any,
    api: api as any,
  });

  return evmLogs.map(evt => EvmLog.create({
    id: `${blockNumber}-${event.idx}-${evt.logIndex}`,
    address: evt.address,
    blockHeight: BigInt(blockNumber),
    topics0: evt.topics[0].toLowerCase(),
    topics1: evt.topics[1]?.toLowerCase(),
    topics2: evt.topics[2]?.toLowerCase(),
    topics3: evt.topics[3]?.toLowerCase(),
  }));
}

async function handleEvmTransaction(idx: number, tx: SubstrateExtrinsic): Promise<EvmTransaction[]> {
  const calls = await acalaProcessor.handlerProcessors['substrate/AcalaEvmCall'].transformer({
    input: tx,
    ds: {} as any,
    api: api as any,
  });

  return calls.map((call, i) => EvmTransaction.create({
    id: `${call.blockNumber}-${idx}-${i}`,
    txHash: call.hash,
    from: call.from,
    to: call.to,
    func: isZero(call.data) ? undefined : inputToFunctionSighash(call.data).toLowerCase(),
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

