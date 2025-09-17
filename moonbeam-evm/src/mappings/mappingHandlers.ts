import {
  EventRecord,
  EvmLog,
  TransactionV2,
  EthTransaction,
  AccountId,
  Address,
} from "@polkadot/types/interfaces";
import { SubstrateExtrinsic, SubstrateBlock } from "@subql/types";
import {
  SpecVersion,
  Event,
  Extrinsic,
  EvmLog as EvmLogModel,
  EvmTransaction,
} from "../types";
import FrontierEvmDatasourcePlugin, {
  FrontierEvmCall,
} from "@subql/frontier-evm-processor/";
import { inputToFunctionSighash, isZero, wrapExtrinsics } from "../utils";

export async function handleBlock(block: SubstrateBlock): Promise<void> {
  let specVersion = await SpecVersion.get(block.specVersion.toString());

  if (!specVersion) {
    specVersion = SpecVersion.create({
      id: block.specVersion.toString(),
      blockHeight: block.block.header.number.toBigInt(),
    });
    await specVersion.save();
  }
  const eventData = block.events
    .filter(
      (evt) =>
        evt.event.section !== "system" &&
        evt.event.method !== "ExtrinsicSuccess",
    )
    .map((evt, idx) =>
      handleEvent(block.block.header.number.toString(), idx, evt),
    );
  const events = eventData.map(([evt]) => evt);
  const logs = eventData.map(([_, log]) => log).filter((log) => log);
  const calls = wrapExtrinsics(block).map((ext, idx) =>
    handleCall(`${block.block.header.number.toString()}-${idx}`, ext),
  );

  const evmCalls: [FrontierEvmCall][] = [];

  for (const ext of wrapExtrinsics(block).filter(
    (ext) =>
      ext.extrinsic.method.section === "ethereum" &&
      ext.extrinsic.method.method === "transact",
  )) {
    const result = await FrontierEvmDatasourcePlugin.handlerProcessors[
      "substrate/FrontierEvmCall"
    ].transformer({
      input: ext as SubstrateExtrinsic<[TransactionV2 | EthTransaction]>,
      ds: {} as any,
      filter: undefined,
      api: undefined as any,
    });
    evmCalls.push(result as [FrontierEvmCall]);
  }

  // Save all data
  // All save order should always follow this structure
  for (const event of events) {
    await event.save();
  }
  for (const call of calls) {
    await call.save();
  }
  for (const log of logs) {
    await log?.save();
  }
  for (const evmCall of evmCalls
    .map((call, idx) =>
      handleEvmTransaction(
        `${block.block.header.number.toString()}-${idx}`,
        call,
      ),
    )
    .filter((tx) => tx)) {
    await evmCall?.save();
  }
}

export function handleEvent(
  blockNumber: string,
  eventIdx: number,
  event: EventRecord,
): [Event, EvmLogModel | undefined] {
  const newEvent = Event.create({
    id: `${blockNumber}-${eventIdx}`,
    blockHeight: BigInt(blockNumber),
    module: event.event.section,
    event: event.event.method,
  });
  const ret: [Event, EvmLogModel | undefined] = [newEvent, undefined];
  if (event.event.section === "evm" && event.event.method === "Log") {
    ret[1] = handleEvmEvent(blockNumber, eventIdx, event);
  }
  return ret;
}

export function handleCall(
  idx: string,
  extrinsic: SubstrateExtrinsic,
): Extrinsic {
  return Extrinsic.create({
    id: idx,
    module: extrinsic.extrinsic.method.section,
    call: extrinsic.extrinsic.method.method,
    blockHeight: extrinsic.block.block.header.number.toBigInt(),
    success: extrinsic.success,
    isSigned: extrinsic.extrinsic.isSigned,
  });
}

function handleEvmEvent(
  blockNumber: string,
  eventIdx: number,
  event: EventRecord,
): EvmLogModel {
  let address;
  let data;
  let topics;
  const [log] = event.event.data as unknown as [{ log: EvmLog } | EvmLog];

  if ((log as EvmLog).address) {
    address = (log as EvmLog).address;
    topics = (log as EvmLog).topics;
  } else {
    address = (log as { log: EvmLog }).log.address;
    topics = (log as { log: EvmLog }).log.topics;
  }
  return EvmLogModel.create({
    id: `${blockNumber}-${eventIdx}`,
    address: address.toString(),
    blockHeight: BigInt(blockNumber),
    topics0: topics[0]?.toHex().toLowerCase(),
    topics1: topics[1]?.toHex().toLowerCase(),
    topics2: topics[2]?.toHex().toLowerCase(),
    topics3: topics[3]?.toHex().toLowerCase(),
  });
}

export function handleEvmTransaction(
  idx: string,
  transaction: [FrontierEvmCall],
): EvmTransaction | undefined {
  const [tx] = transaction;
  if (!tx.hash) {
    return;
  }
  const func = isZero(tx.data)
    ? undefined
    : inputToFunctionSighash(tx.data).toLowerCase();
  return EvmTransaction.create({
    id: idx,
    txHash: tx.hash,
    from: tx.from.toLowerCase(),
    to: tx.to?.toLowerCase(),
    func,
    blockHeight: BigInt(tx.blockNumber?.toString() ?? 0),
    success: tx.success,
  });
}
