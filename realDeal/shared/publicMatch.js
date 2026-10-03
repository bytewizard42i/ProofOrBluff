export async function readPublicMatch(publicDataProvider, decodeLedger, contractAddress, matchId) {
  if (typeof matchId !== 'string' || !/^(?:0x)?[0-9a-fA-F]{64}$/.test(matchId)) {
    throw new Error('Match ID must be 64 hexadecimal characters.');
  }
  const contractState = await publicDataProvider.queryContractState(contractAddress);
  if (!contractState) throw new Error('The indexer has not found this game contract.');
  const clean = matchId.replace(/^0x/, '');
  const key = Uint8Array.from(clean.match(/.{2}/g), pair => Number.parseInt(pair, 16));
  const matches = decodeLedger(contractState.data).matches;
  if (!matches.member(key)) throw new Error('The saved match was not found on this game contract.');
  return matches.lookup(key);
}
