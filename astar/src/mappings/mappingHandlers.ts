import assert from 'assert';
import {Bytes} from '@polkadot/types';
const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';
import {TransactionV2, EthTransaction ,AccountId, Address, EvmLog} from "@polkadot/types/interfaces"
import {SubstrateExtrinsic,SubstrateBlock,SubstrateEvent} from "@subql/types";
import {
  SpecVersion,
  Event,
  Extrinsic,
  EvmTransaction,
  ContractEmitted,
  ContractsCall,
  EvmLog as EvmLogModel
} from "../types";
import FrontierEvmDatasourcePlugin, { FrontierEvmCall } from "@subql/frontier-evm-processor/";
import {inputToFunctionSighash, isZero, getSelector, wrapExtrinsics, wrapEvents} from "../utils";
import {ApiPromise} from "@polkadot/api";

export type ContractEmittedResult = [AccountId, Bytes]

export async function handleBlock(block: SubstrateBlock): Promise<void> {
  let specVersion = await SpecVersion.get(block.specVersion.toString());
  if(!specVersion){
    specVersion = SpecVersion.create({
      id: block.specVersion.toString(),
      blockHeight: block.block.header.number.toBigInt(),
    });
    await specVersion.save();
  }
  const wrappedCalls = wrapExtrinsics(block);
  const wrappedEvents = wrapEvents(wrappedCalls,block.events.filter(
      (evt) =>
          !(evt.event.section === "system" &&
              evt.event.method === "ExtrinsicSuccess")
  ),block)
  let events: Event[] =[]
  let contractEmittedEvents: ContractEmitted[] =[];
  let evmLogs: EvmLogModel[] =[];
  wrappedEvents.filter(evt => evt.event.section!=='system' && evt.event.method!=='ExtrinsicSuccess').map(event=>{
    events.push(handleEvent(event))
    if (event.event.section === 'contracts' && (event.event.method === 'ContractEmitted' || event.event.method === 'ContractExecution')) {
      contractEmittedEvents.push(handleContractsEmitted(event));
    }
    if(event.event.section === 'evm' && event.event.method === 'Log'){
      evmLogs.push(handleEvmEvent(event));
    }
  })

  let calls: Extrinsic[] =[]
  let contractCalls: ContractsCall[] =[];
  let evmTransactions: EvmTransaction[] =[];

  for (const call of wrappedCalls) {
    calls.push(handleCall(call));

    if (call.extrinsic.method.section === 'contracts' && call.extrinsic.method.method === 'call') {
      contractCalls.push(handleContractCalls(call));
    }
    try {
      if (call.extrinsic.method.section === 'ethereum' && call.extrinsic.method.method === 'transact') {
        const [frontierEvmCall] = await FrontierEvmDatasourcePlugin.handlerProcessors['substrate/FrontierEvmCall'].transformer({
          input: call as SubstrateExtrinsic<[TransactionV2 | EthTransaction]>,
          ds: {} as any,
          filter: undefined,
          api: api as ApiPromise
        });
        evmTransactions.push(handleEvmTransaction(call.idx.toString(), frontierEvmCall));
      }
    } catch (e) {
      logger.warn(e, 'Failed to transform ethereum transaction, skipping');
      // Failed evm transaction skipped
    }
  }

  // seems there is a concurrent limitation for promise.all and bulkCreate work together,
  // the last entity upsertion are missed
  // We will put them into two promise for now.
  // All save order should always follow this structure
  for (const event of events) {
    await event.save()
  }
  for (const call of calls) {
    await call.save()
  }
  for (const evmLog of evmLogs) {
    await evmLog.save()
  }
  for (const evmTransaction of evmTransactions) {
    await evmTransaction.save()
  }
  for (const contractEmittedEvent of contractEmittedEvents) {
    await contractEmittedEvent.save()
  }
  for (const contractCall of contractCalls) {
    await contractCall.save()
  }
}

export function handleEvent(event: SubstrateEvent): Event {
  return Event.create({
    id: `${event.block.block.header.number.toString()}-${event.idx}`,
    blockHeight: event.block.block.header.number.toBigInt(),
    module: event.event.section,
    event: event.event.method,
  });
}

export function handleCall(extrinsic: SubstrateExtrinsic): Extrinsic {
  return Extrinsic.create({
    id: `${extrinsic.block.block.header.number.toString()}-${extrinsic.idx.toString()}`,
    module: extrinsic.extrinsic.method.section,
    call: extrinsic.extrinsic.method.method,
    blockHeight: extrinsic.block.block.header.number.toBigInt(),
    success: extrinsic.success,
    isSigned: extrinsic.extrinsic.isSigned,
  });
}

function handleEvmEvent(event: SubstrateEvent): EvmLogModel {
  let address;
  // let data;
  let topics;
  const [log] = event.event.data as unknown as [{log:EvmLog} | EvmLog];

  if((log as EvmLog).address){
    address = (log as EvmLog).address
    topics = (log as EvmLog).topics
  }else{
    address = (log as {log: EvmLog}).log.address;
    topics = (log as {log: EvmLog}).log.topics;
  }
  return EvmLogModel.create({
    id: `${event.block.block.header.number.toString()}-${event.idx}`,
    address: address.toString(),
    blockHeight:event.block.block.header.number.toBigInt(),
    topics0:topics[0].toHex().toLowerCase(),
    topics1:topics[1]?.toHex().toLowerCase(),
    topics2:topics[2]?.toHex().toLowerCase(),
    topics3:topics[3]?.toHex().toLowerCase(),
  });
}

export function handleEvmTransaction(idx: string, tx: FrontierEvmCall): EvmTransaction {
  if (!tx.hash || !tx.blockNumber) {
    throw new Error('Invalid evm transaction');
  }
  const func = isZero(tx.data) ? undefined : inputToFunctionSighash(tx.data).toLowerCase();
  return EvmTransaction.create({
    id: `${tx.blockNumber.toString()}-${idx}`,
    txHash: tx.hash,
    from: tx.from.toLowerCase(),
    // @ts-ignore
    to: tx.to?.toLowerCase(),
    func: func,
    blockHeight: BigInt(tx.blockNumber.toString()),
    success: tx.success,
  });
}

export function handleContractCalls(call:  SubstrateExtrinsic): ContractsCall {
  const [dest,,,, data] = call.extrinsic.method.args;
  assert(call.extrinsic.isSigned, "Contract calls must be signed");

  return ContractsCall.create({
    id: `${call.block.block.header.number.toString()}-${call.idx}`,
    from: call.extrinsic.signer.toString(),
    success: !call.events.find(
        (evt) => evt.event.section === 'system' && evt.event.method === 'ExtrinsicFailed'
    ),
    dest: (dest as Address).toString(),
    blockHeight: call.block.block.header.number.toBigInt(),
    selector: getSelector(data.toU8a()),
  });
}

export function handleContractsEmitted(event: SubstrateEvent):ContractEmitted{
  const [contract, data] = event.event.data as unknown as ContractEmittedResult;

  return ContractEmitted.create({
    id: `${event.block.block.header.number.toString()}-${event.idx}`,
    blockHeight:  event.block.block.header.number.toBigInt(),
    contract: contract.toString(),
    from: event.extrinsic?.extrinsic.isSigned ? event.extrinsic.extrinsic.signer.toString(): EMPTY_ADDRESS,
    eventIndex: data[0],
  });
}
