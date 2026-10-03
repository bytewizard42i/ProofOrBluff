export async function completeMatchSetup({ readMatch, joinBot, revealSeed, hasOpponentEntropy }) {
  const match = await readMatch();
  const phase = Number(match?.phase);
  if (!Number.isInteger(phase) || phase < 0 || phase > 4) {
    throw new Error('The saved match has no valid on-chain phase. Nothing was submitted.');
  }
  if (phase === 0 || (phase === 1 && !hasOpponentEntropy())) await joinBot();
  if (phase < 2) await revealSeed();
  return readMatch();
}
