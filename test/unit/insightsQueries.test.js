import { describe, expect, test } from 'vitest';

import {
  paginateCollection,
  runMutualFriendDetailQuery,
  runMutualFriendsQuery,
  runTimelineQuery
} from '../../src/queries/insightsQueries.js';

describe('insights query helpers', () => {
  test('paginateCollection returns the full collection when pagination is omitted', () => {
    const out = paginateCollection([{ id: 1 }, { id: 2 }]);

    expect(out).toMatchObject({
      rows: [{ id: 1 }, { id: 2 }],
      total: 2,
      page: 1,
      pageSize: 2,
      totalPages: 1
    });
  });

  test('runTimelineQuery uses the requested scope metadata instead of the larger sibling table', () => {
    const service = {
      getTimeline() {
        return {
          sessions: Array.from({ length: 8 }, (_, index) => ({ id: `s-${index}` })),
          companions: [{ id: 'c-1' }]
        };
      }
    };

    const out = runTimelineQuery(service, {
      userId: 'usr_self',
      scope: 'companions',
      companionPageSize: '1'
    });

    expect(out.total).toBe(1);
    expect(out.pageSize).toBe(1);
    expect(out.sessionsTotal).toBe(8);
    expect(out.companionsTotal).toBe(1);
  });

  test('runMutualFriendsQuery paginates mutual friend leaderboard rows', () => {
    const service = {
      getMutualFriends() {
        return {
          rows: [
            { userId: 'usr_friend_a', displayName: 'Friend A', mutualFriendCount: 3 },
            { userId: 'usr_friend_b', displayName: 'Friend B', mutualFriendCount: 2 }
          ]
        };
      }
    };

    const out = runMutualFriendsQuery(service, {
      page: '2',
      pageSize: '1'
    });

    expect(out.total).toBe(2);
    expect(out.page).toBe(2);
    expect(out.pageSize).toBe(1);
    expect(out.rows).toEqual([
      { userId: 'usr_friend_b', displayName: 'Friend B', mutualFriendCount: 2 }
    ]);
  });

  test('runMutualFriendDetailQuery returns the clicked user detail rows', () => {
    const service = {
      getMutualFriendDetail({ userId }) {
        return {
          userId,
          targetDisplayName: 'Friend A',
          rows: [{ userId: 'usr_friend_c', displayName: 'Friend C' }]
        };
      }
    };

    const out = runMutualFriendDetailQuery(service, {
      userId: 'usr_friend_a'
    });

    expect(out.userId).toBe('usr_friend_a');
    expect(out.targetDisplayName).toBe('Friend A');
    expect(out.rows).toEqual([{ userId: 'usr_friend_c', displayName: 'Friend C' }]);
  });
});
