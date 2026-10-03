import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ContractAddressControl, { normalizeContractAddress } from './ContractAddressControl.jsx';

const PREVIEW_CONTRACT = 'cc75d39e2d11096d160be2524dc2bbc9c6a569f2906d0adade33d6227f06a159';

describe('contract (table) address control', () => {
  it('accepts a 64-hex address with or without 0x and lowercases it', () => {
    expect(normalizeContractAddress(PREVIEW_CONTRACT)).toBe(PREVIEW_CONTRACT);
    expect(normalizeContractAddress(`0x${PREVIEW_CONTRACT.toUpperCase()}`)).toBe(PREVIEW_CONTRACT);
    expect(normalizeContractAddress(`  ${PREVIEW_CONTRACT}\n`)).toBe(PREVIEW_CONTRACT);
  });

  it('rejects anything that is not exactly 64 hex characters', () => {
    for (const bad of ['', 'abc', PREVIEW_CONTRACT.slice(1), `${PREVIEW_CONTRACT}0`, 'g'.repeat(64), null]) {
      expect(() => normalizeContractAddress(bad)).toThrow(/64 hexadecimal/);
    }
  });

  it('renders a paste field and warns that Start would deploy when nothing is saved', () => {
    const markup = renderToStaticMarkup(<ContractAddressControl />);
    expect(markup).toContain('Paste the published 64-hex contract address');
    expect(markup).toContain('Use this table');
    expect(markup).toMatch(/none saved/);
  });
});
