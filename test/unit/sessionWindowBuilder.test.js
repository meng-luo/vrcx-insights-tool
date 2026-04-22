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

  test('prefers world names observed from feed rows when location metadata is missing', () => {
    const location = 'wrld_f20326da-f1ac-45fc-a062-609723b097b1:08792~region(jp)';
    const sessions = buildNormalizedSessions({
      localRows: [],
      feedGpsRows: [
        {
          createdAt: '2026-04-10T10:30:00.000Z',
          userId: 'usr_target',
          displayName: 'Target',
          location,
          worldName: 'Test World',
          previousLocation: 'private',
          time: 0
        }
      ],
      feedOnlineOfflineRows: [
        {
          createdAt: '2026-04-10T11:00:00.000Z',
          userId: 'usr_target',
          displayName: 'Target',
          type: 'Offline',
          location,
          worldName: 'Test World',
          time: 1800000
        }
      ],
      observedUntilMs: Date.parse('2026-04-10T12:00:00.000Z'),
      fromMs: Date.parse('2026-04-10T00:00:00.000Z'),
      toMs: Date.parse('2026-04-11T00:00:00.000Z'),
      currentDisplayNameMap: new Map([['usr_target', 'Target']]),
      locationMetaByLocation: new Map(),
      locationParseCache: new Map()
    });

    expect(sessions).toHaveLength(1);
    expect(sessions[0].worldName).toBe('Test World');
    expect(sessions[0].location).toBe(location);
  });

  test('keeps unknown world names empty so downstream UI can hydrate them later', () => {
    const location =
      'wrld_unknown:60241~hidden(usr_d6613ded-d8b2-4e08-9967-2ed990d5fc58)~region(jp)';
    const sessions = buildNormalizedSessions({
      localRows: [
        {
          createdAt: '2026-04-10T10:30:00.000Z',
          userId: 'usr_target',
          displayName: 'Target',
          location,
          time: 1800000
        }
      ],
      feedGpsRows: [],
      feedOnlineOfflineRows: [],
      observedUntilMs: Date.parse('2026-04-10T12:00:00.000Z'),
      fromMs: Date.parse('2026-04-10T00:00:00.000Z'),
      toMs: Date.parse('2026-04-11T00:00:00.000Z'),
      currentDisplayNameMap: new Map([['usr_target', 'Target']]),
      locationMetaByLocation: new Map(),
      locationParseCache: new Map()
    });

    expect(sessions).toHaveLength(1);
    expect(sessions[0].worldId).toBe('wrld_unknown');
    expect(sessions[0].worldName).toBe('');
    expect(sessions[0].location).toBe(location);
  });
});
