import {EventRecord, EvmLog,TransactionV2, EthTransaction ,AccountId, Address} from "@polkadot/types/interfaces"
import {SubstrateExtrinsic,SubstrateBlock} from "@subql/types";
import { SpecVersion, Event, Extrinsic, EvmLog as EvmLogModel, EvmTransaction, ChainAliases } from "../types";
import FrontierEvmDatasourcePlugin, { FrontierEvmCall } from "@subql/frontier-evm-processor/";
import { inputToFunctionSighash, isZero, wrapExtrinsics } from "../utils";

const evmChainId: Record<string, string> = {
    '0xfe58ea77779b7abda7da4ec526d14db9b1e9cd40a217c34892af80a9b332b76d': '1284',
    '0x401a1f9dca3da46f5c4091016c8a2f26dcea05865116b286f60f668207d1474b': '1285',
    '0x91bc6e169807aaa54802737e1c504b2577d4fafedd5a02c10293b1cd60e39527': '1287',
}

let checkedAliases = false;

async function setAliases(): Promise<void> {
    if (checkedAliases) return;

    const chainId = (global as any).chainId;
    if(!evmChainId[chainId]) {
        checkedAliases = true;
        return;
    }

    const chianAliases = ChainAliases.create({
        id: 'evmChainId',
        value: evmChainId[chainId]
    });

    await chianAliases.save();

    checkedAliases = true;
}

let specVersion: SpecVersion;
export async function handleBlock(block: SubstrateBlock): Promise<void> {
    await setAliases();
    if (!specVersion) {
        specVersion = await SpecVersion.get(block.specVersion.toString());
    }

    if(!specVersion || specVersion.id !== block.specVersion.toString()){
        specVersion = new SpecVersion(block.specVersion.toString());
        specVersion.blockHeight = block.block.header.number.toBigInt();
        await specVersion.save();
    }
    const eventData = block.events.filter(evt => evt.event.section!=='system' && evt.event.method!=='ExtrinsicSuccess').map((evt, idx)=>handleEvent(block.block.header.number.toString(), idx, evt));
    const events = eventData.map(([evt])=>evt);
    const logs = eventData.map(([_,log])=>log).filter(log=>log);
    const calls = wrapExtrinsics(block).map((ext,idx)=>handleCall(`${block.block.header.number.toString()}-${idx}`,ext));
    const evmCalls = await Promise.all(wrapExtrinsics(block).filter(ext => ext.extrinsic.method.section === 'ethereum' && ext.extrinsic.method.method === 'transact').map( (ext) => FrontierEvmDatasourcePlugin.handlerProcessors['substrate/FrontierEvmCall'].transformer({
        input: ext as SubstrateExtrinsic<[TransactionV2 | EthTransaction]>,
        ds:{} as any,
        filter: undefined,
        api: undefined}
    ))) as [FrontierEvmCall][];
    await Promise.all([
        store.bulkCreate('Event', events),
        store.bulkCreate('EvmLog', logs),
        store.bulkCreate('Extrinsic', calls),
        store.bulkCreate('EvmTransaction', evmCalls
            .map((call,idx)=>handleEvmTransaction(`${block.block.header.number.toString()}-${idx}`,call))
            .filter(tx=>tx)
        ),
    ]);
}

export function handleEvent(blockNumber: string, eventIdx: number, event: EventRecord): [Event, EvmLogModel] {
    const newEvent = new Event(`${blockNumber}-${eventIdx}`);
    newEvent.blockHeight = BigInt(blockNumber);
    newEvent.module = event.event.section;
    newEvent.event = event.event.method;
    const ret: [Event, EvmLogModel] = [newEvent, undefined];
    if (event.event.section === 'evm' && event.event.method === 'Log') {
        ret[1] = handleEvmEvent(blockNumber, eventIdx, event);
    }
    return ret;
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

function handleEvmEvent(blockNumber: string, eventIdx: number, event: EventRecord): EvmLogModel {
    let address;
    let data;
    let topics;
    const [log] = event.event.data as unknown as [{log:EvmLog} | EvmLog]

    if((log as EvmLog).address){
        address = (log as EvmLog).address
        topics = (log as EvmLog).topics
    }else{
        address = (log as {log: EvmLog}).log.address;
        topics = (log as {log: EvmLog}).log.topics;
    }
    return EvmLogModel.create({
        id: `${blockNumber}-${eventIdx}`,
        address: address.toString(),
        blockHeight: BigInt(blockNumber),
        topics0: topics[0].toHex(),
        topics1: topics[1]?.toHex(),
        topics2: topics[2]?.toHex(),
        topics3: topics[3]?.toHex(),
    });
}

export function handleEvmTransaction(idx: string, transaction: [FrontierEvmCall]): EvmTransaction {
    const [tx] = transaction
    if (!tx.hash) {
        return;
    }
    const func = isZero(tx.data) ? undefined : inputToFunctionSighash(tx.data);
    return EvmTransaction.create({
        id: idx,
        txHash: tx.hash,
        from: tx.from,
        to: tx.to,
        func,
        blockHeight: BigInt(tx.blockNumber.toString()),
        success: tx.success,
    });
}
