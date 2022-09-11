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


let specVersion: SpecVersion;

export type ContractEmittedResult = [AccountId, Bytes]

export async function handleBlock(block: SubstrateBlock): Promise<void> {
  if (!specVersion) {
    specVersion = await SpecVersion.get(block.specVersion.toString());
  }
  if(!specVersion || specVersion.id !== block.specVersion.toString()){
    specVersion = new SpecVersion(block.specVersion.toString());
    specVersion.blockHeight = block.block.header.number.toBigInt();
    await specVersion.save();
  }
  const wrappedCalls = wrapExtrinsics(block);
  const wrappedEvents = wrapEvents(wrappedCalls,block.events.filter(
      (evt) =>
          !(evt.event.section === "system" &&
              evt.event.method === "ExtrinsicSuccess")
  ),block)
  let events=[]
  let contractEmittedEvents=[];
  let evmLogs=[];
  wrappedEvents.filter(evt => evt.event.section!=='system' && evt.event.method!=='ExtrinsicSuccess').map(event=>{
    events.push(handleEvent(event))
    if (event.event.section === 'contracts' && (event.event.method === 'ContractEmitted' || event.event.method === 'ContractExecution')) {
      contractEmittedEvents.push(handleContractsEmitted(event));
    }
    if(event.event.section === 'evm' && event.event.method === 'Log'){
      evmLogs.push(handleEvmEvent(event));
    }
  })

  let calls=[]
  let contractCalls=[];
  let evmTransactions=[];

  wrappedCalls.map(async call => {
    calls.push(handleCall(call))
    if (call.extrinsic.method.section === 'contracts' && call.extrinsic.method.method === 'call') {
      contractCalls.push(handleContractCalls(call));
    }
    if (call.extrinsic.method.section === 'ethereum' && call.extrinsic.method.method === 'transact') {
      const [frontierEvmCall] = await FrontierEvmDatasourcePlugin.handlerProcessors['substrate/FrontierEvmCall'].transformer({
        input: call as SubstrateExtrinsic<[TransactionV2 | EthTransaction]>,
        ds: {} as any,
        filter: undefined,
        api: api as ApiPromise
      })
      evmTransactions.push(handleEvmTransaction(call.idx.toString(),frontierEvmCall))
    }
  })
  // seems there is a concurrent limitation for promise.all and bulkCreate work together,
  // the last entity upsertion are missed
  // We will put them into two promise for now.
  await Promise.all([
    store.bulkCreate('Event', events),
    store.bulkCreate('ContractEmitted', contractEmittedEvents),
    store.bulkCreate('EvmLog', evmLogs),
  ]);
  await Promise.all([
    store.bulkCreate('Extrinsic', calls),
    store.bulkCreate('ContractsCall', contractCalls),
    store.bulkCreate('EvmTransaction', evmTransactions)
  ]);
}

export function handleEvent(event: SubstrateEvent): Event {
  const newEvent = new Event(`${event.block.block.header.number.toString()}-${event.idx}`);
  newEvent.blockHeight = event.block.block.header.number.toBigInt();
  newEvent.module = event.event.section;
  newEvent.event = event.event.method;
  return newEvent;
}

export function handleCall(extrinsic: SubstrateExtrinsic): Extrinsic {
  const newExtrinsic = new Extrinsic(`${extrinsic.block.block.header.number.toString()}-${extrinsic.idx.toString()}`);
  newExtrinsic.module = extrinsic.extrinsic.method.section;
  newExtrinsic.call = extrinsic.extrinsic.method.method;
  newExtrinsic.blockHeight = extrinsic.block.block.header.number.toBigInt();
  newExtrinsic.success = extrinsic.success;
  newExtrinsic.isSigned = extrinsic.extrinsic.isSigned;
  return newExtrinsic;
}

function handleEvmEvent(event: SubstrateEvent): EvmLogModel {
  const [{address, data, topics}] = event.event.data as unknown as [EvmLog];

  const evmLog = new EvmLogModel(`${event.block.block.header.number.toString()}-${event.idx}`)
  evmLog.address = address.toString()
  evmLog.blockHeight= event.block.block.header.number.toBigInt();
  evmLog.topics0= topics[0].toHex();
  evmLog.topics1= topics[1]?.toHex();
  evmLog.topics2= topics[2]?.toHex();
  evmLog.topics3= topics[3]?.toHex();
  return evmLog
}

export function handleEvmTransaction(idx: string, tx: FrontierEvmCall): EvmTransaction {
  if (!tx.hash) {
    return;
  }
  const func = isZero(tx.data) ? undefined : inputToFunctionSighash(tx.data);
  const evmTransaction = new EvmTransaction(`${tx.blockNumber.toString()}-${idx}`)
  evmTransaction.txHash = tx.hash;
  evmTransaction.from = tx.from;
  evmTransaction.to= tx.to;
  evmTransaction.func = func;
  evmTransaction.blockHeight = BigInt(tx.blockNumber.toString());
  evmTransaction.success = tx.success;
  return evmTransaction
}


export function handleContractCalls(call:  SubstrateExtrinsic): ContractsCall {
  const [dest,,,, data] = call.extrinsic.method.args;
  const contractCall = new ContractsCall(`${call.block.block.header.number.toString()}-${call.idx}`)
  contractCall.from = call.extrinsic.isSigned? call.extrinsic.signer.toString(): undefined;
  contractCall.success = !call.events.find(
      (evt) => evt.event.section === 'system' && evt.event.method === 'ExtrinsicFailed'
  );
  contractCall.dest = (dest as Address).toString();
  contractCall.blockHeight = call.block.block.header.number.toBigInt();
  contractCall.selector = getSelector(data.toU8a())
  return contractCall;

}

export function handleContractsEmitted(event: SubstrateEvent):ContractEmitted{
  const [contract, data] = event.event.data as unknown as ContractEmittedResult;
  const contractEmitted = new ContractEmitted(`${event.block.block.header.number.toString()}-${event.event.index.toString()}`);
  contractEmitted.blockHeight = event.block.block.header.number.toBigInt();
  contractEmitted.contract= contract.toString();
  contractEmitted.from= event.extrinsic.extrinsic.isSigned? event.extrinsic.extrinsic.signer.toString(): EMPTY_ADDRESS;
  contractEmitted.eventIndex= data[0]
  return contractEmitted;
}
