import {SubstrateExtrinsic, SubstrateBlock, SubstrateEvent} from "@subql/types";
import { SpecVersion, Event, Extrinsic, ContractEmitted, ContractsCall } from "../types";
import {getSelector, wrapExtrinsics} from "../utils";
import {AccountId,Address} from '@polkadot/types/interfaces';
import {Bytes} from '@polkadot/types';
const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

let specVersion: SpecVersion;

export interface ContractEmittedResult {
  contract: AccountId;
  data: Bytes;
}


export async function handleBlock(block: SubstrateBlock): Promise<void> {
  if (!specVersion) {
    specVersion = await SpecVersion.get(block.specVersion.toString());
  }
  if(!specVersion || specVersion.id !== block.specVersion.toString()){
    specVersion = new SpecVersion(block.specVersion.toString());
    specVersion.blockHeight = block.block.header.number.toBigInt();
    await specVersion.save();
  }
  const calls = wrapExtrinsics(block).map((ext,idx)=>handleCall(`${block.block.header.number.toString()}-${idx}`,ext));
  const rawContractCalls = wrapExtrinsics(block).filter(ext => ext.extrinsic.method.section === 'contracts' && ext.extrinsic.method.method === 'call');
  const contractCalls: ContractsCall[] = rawContractCalls.map(call=>{return handleContractCalls(call)})

  await Promise.all([
    store.bulkCreate('Extrinsic', calls),
    store.bulkCreate('EvmTransaction', contractCalls),
  ]);
}

export async function handleEvent(event: SubstrateEvent): Promise<void> {
  const blockNumber = event.block.block.header.number;
  const newEvent = new Event(`${blockNumber.toNumber()}-${event.event.index.toString()}`);
  newEvent.blockHeight = blockNumber.toBigInt();
  newEvent.module = event.event.section;
  newEvent.event = event.event.method;
  if (event.event.section === 'contracts' && event.event.method === 'ContractEmitted') {
    const [{contract, data}] = event.event.data as unknown as [ContractEmittedResult];
    await ContractEmitted.create({
      id: `${event.block.block.header}-${event.event.index.toString()}`,
      blockHeight: blockNumber.toBigInt(),
      contract: contract.toString(),
      from:event.extrinsic.extrinsic.isSigned? event.extrinsic.extrinsic.signer.toString(): EMPTY_ADDRESS,
      eventIndex: data[0]
    });
  }
  await newEvent.save();
}

export function handleCall(idx: string, extrinsic: SubstrateExtrinsic): Extrinsic {
  const newExtrinsic = new Extrinsic(idx);
  newExtrinsic.module = extrinsic.extrinsic.method.section;
  newExtrinsic.call = extrinsic.extrinsic.method.method;
  newExtrinsic.blockHeight = extrinsic.block.block.header.number.toBigInt();
  newExtrinsic.success = extrinsic.success;
  newExtrinsic.isSigned = extrinsic.extrinsic.isSigned;
  return newExtrinsic;
}


export function handleContractCalls(call:  SubstrateExtrinsic): ContractsCall {
  const [dest, value, gasLimit, storageDepositLimit, data] = call.extrinsic.method.args;
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
