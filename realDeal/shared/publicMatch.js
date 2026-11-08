// ContractState is the decoder for the v9 era the query returns.
import { ContractState } from '@midnight-ntwrk/compact-runtime';

export async function readPublicMatch(publicDataProvider, decodeLedger, contractAddress, matchId) {
  if (typeof matchId !== 'string' || !/^(?:0x)?[0-9a-fA-F]{64}$/.test(matchId)) {
    throw new Error('Match ID must be 64 hexadecimal characters.');
  }
  const read = await publicDataProvider.queryContractState(contractAddress);
  if (!read) throw new Error('The indexer has not found this game contract.');
  const clean = matchId.replace(/^0x/, '');
  const key = Uint8Array.from(clean.match(/.{2}/g), pair => Number.parseInt(pair, 16));
  // midnight-js 5 returns SerializedContractState (bytes + era); tests still
  // hand back the pre-5.0 `{ data }` shape — accept both.
  const data = read.contractState ? read.contractState.deserialize({ v9: ContractState }).data : read.data;
  const matches = decodeLedger(data).matches;
  if (!matches.member(key)) throw new Error('The saved match was not found on this game contract.');
  return matches.lookup(key);
}
