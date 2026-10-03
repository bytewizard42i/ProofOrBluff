import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ProofServerChoice from './ProofServerChoice.jsx';

describe('proof server privacy choice', () => {
  it('always offers the private local option and states the trade-off honestly', () => {
    const markup = renderToStaticMarkup(<ProofServerChoice />);
    expect(markup).toContain('My own (private)');
    expect(markup).toContain('http://localhost:6300');
    expect(markup).toMatch(/proof server sees them while proving/);
    expect(markup).not.toMatch(/nobody can see your cards|fully private/i);
  });
});
