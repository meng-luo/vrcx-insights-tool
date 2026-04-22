import { describe, expect, test } from 'vitest';

import { buildNormalizedSessions } from '../../src/analyzer/sessionWindowBuilder.js';

describe('buildNormalizedSessions', () => {
  test('normalizes local exit rows into clipped sessions', () => {
    const sessions = buildNormalizedSessions({
      localRows: [
        {
          createdAt: '2026-04-10T10:30:00.000Z',
          userId: 'usr_self',
          displayName: 'Self',
          location: 'wrld_1:100~hidden(usr_host)~region(jp)',
          time: 1800000
        }
      ],
      feedGpsRows: [],
      feedOnlineOfflineRows: [],
      observedUntilMs: Date.parse('2026-04-10T12:00:00.000Z'),
      fromMs: Date.parse('2026-04-10T00:00:00.000Z'),
      toMs: Date.parse('2026-04-11T00:00:00.000Z'),
      currentDisplayNameMap: new Map([['usr_self', 'Self']]),
      locationMetaByLocation: new Map(),
      locationParseCache: new Map()
    });

    expect(sessions).toHaveLength(1);
    expect(sessions[0].durationMs).toBe(1800000);
    expect(sessions[0].accessType).toBe('friends+');
  });
});
