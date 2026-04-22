import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { resolveDefaultRange } from '../../src/queries/insightsQueries.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appJsPath = path.resolve(__dirname, '../../src/static/app.js');

describe('resolveDefaultRange', () => {
  test('keeps all-time when all=1', () => {
    const out = resolveDefaultRange({ all: '1' });
    expect(out).toEqual({ from: null, to: null });
  });

  test('uses 30-day default when no filters provided', () => {
    const out = resolveDefaultRange({});
    expect(typeof out.from).toBe('string');
    expect(typeof out.to).toBe('string');
  });

  test('keeps explicit from/to query values', () => {
    const out = resolveDefaultRange({ from: '2026-01-01', to: '2026-01-31' });
    expect(out).toEqual({ from: '2026-01-01', to: '2026-01-31' });
  });
});

describe('all-time date picker wiring', () => {
  test('clears the range picker to null instead of an empty array', () => {
    const source = fs.readFileSync(appJsPath, 'utf8');

    expect(source).toContain(':empty-values="[null, undefined]"');
    expect(source).toContain(':value-on-clear="null"');
  });
});
