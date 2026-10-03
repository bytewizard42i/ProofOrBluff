export function normalizeTransactionId(value) {
  if (typeof value !== 'string') return null;
  const clean = value.trim().replace(/^0x/i, '');
  return /^(?:[0-9a-fA-F]{64}|[0-9a-fA-F]{68})$/.test(clean)
    ? clean.toLowerCase()
    : null;
}

export function optionalTransactionId(result) {
  return normalizeTransactionId(result?.txId ?? result?.txHash ?? result?.transactionId);
}
