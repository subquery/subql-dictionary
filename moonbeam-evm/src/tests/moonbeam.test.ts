


import { subqlTest } from '@subql/testing';
import { EvmTransaction} from '../types';


// https://moonbeam.moonscan.io/txs?block=2847447
// https://moonbeam.subscan.io/block/2847447
const blockNumber = 2847447;

subqlTest(
  'Contract Creation',
  blockNumber,
  [],
  [
    EvmTransaction.create({
      id: `${blockNumber}-${5}`,
      from: '0x16f615a38528764eea9c6388a8c4e1fc8305cbb3',
      to: undefined,
      blockHeight: BigInt(blockNumber),
      func:'0x600d805',
      success: true,
      txHash: '0x24bef923522a4d6a79f9ab9242a74fb987dce94002c0f107c2a7d0b7e24bcf05'
    })
  ],
  'handleBlock'
);
