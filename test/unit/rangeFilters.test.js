import { describe, expect, test } from 'vitest';

import {
  buildRangeQueryObject,
  getPresetRangeValues,
  normalizeDateRangeChange
} from '../../src/static/rangeFilters.js';

describe('range filter helpers', () => {
  test('uses null for the all-time preset and still emits all=1', () => {
    expect(getPresetRangeValues('all')).toBeNull();
    expect(buildRangeQueryObject({ rangePreset: 'all', dateRange: null })).toEqual({ all: '1' });
  });

  test('normalizes cleared or incomplete picker values back to all-time state', () => {
    expect(normalizeDateRangeChange(null)).toEqual({
      dateRange: null,
      rangePreset: 'all'
    });
    expect(normalizeDateRangeChange([])).toEqual({
      dateRange: null,
      rangePreset: 'all'
    });
    expect(normalizeDateRangeChange(['2026-04-01', '2026-04-30'])).toEqual({
      dateRange: ['2026-04-01', '2026-04-30'],
      rangePreset: 'custom'
    });
  });
});
