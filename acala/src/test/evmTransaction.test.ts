import { subqlTest } from '@subql/testing';
import { EvmTransaction } from '../types';

// test for correct Total_supply
subqlTest(
  'test collections entity',
  1102920,
  [],
  [
    EvmTransaction.create({
      id: '1102920-2-0',
      txHash: '0xd0705329e0f6ea5cd5a7cb49bd5d8a25e990c61710a06bbfd594dbae75c8874d',
      from: '0xffffd2ff9b840f6bd74f80df8e532b4d7886ffff',
      to: undefined,
      func: '0x60806040',
      blockHeight: BigInt(1102920),
      success: true,
    }),
  ],
  'handleBlock'
);

// Test for correct new NFTs, metadata, Transfer

// Test for correct updated NFTs with transfer

// Correct updated Collections total_supply with increment ERC1155

// Correct update Collections total_supply with state update ERC721
