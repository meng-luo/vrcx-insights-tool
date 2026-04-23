import { CacheStore } from './cacheStore.js';
import { toDateRangeMs } from './dateRange.js';
import {
  calculateOverlapMs,
  calculatePeakOccupancy,
  collectOverlapSegments,
  isSelfPresentInSegments
} from './overlap.js';
import { parseLocationHost } from './locationHost.js';
import { SqliteReadRepository } from './sqliteReadRepository.js';
import { buildNormalizedSessions } from './sessionWindowBuilder.js';

function groupByLocation(sessions) {
  const map = new Map();
  for (const session of sessions) {
    if (!map.has(session.location)) {
      map.set(session.location, []);
    }
    map.get(session.location).push(session);
  }
  return map;
}

function sumOverlapMs(segments) {
  return segments.reduce((sum, item) => sum + item.overlapMs, 0);
}

function summarizeLocationOverlap(listA, listB) {
  const segments = collectOverlapSegments(listA, listB);
  if (segments.length === 0) {
    return null;
  }
  return {
    segments,
    overlapMs: sumOverlapMs(segments),
    overlapStartMs: Math.min(...segments.map((item) => item.startMs)),
    overlapEndMs: Math.max(...segments.map((item) => item.endMs))
  };
}

function uniqueLocationsFromInputs({ localRows = [], feedGpsRows = [], feedOnlineOfflineRows = [] }) {
  const values = new Set();
  for (const row of localRows) {
    if (row.location) {
      values.add(row.location);
    }
  }
  for (const row of feedGpsRows) {
    if (row.location) {
      values.add(row.location);
    }
    if (row.previousLocation) {
      values.add(row.previousLocation);
    }
  }
  for (const row of feedOnlineOfflineRows) {
    if (row.location) {
      values.add(row.location);
    }
  }
  return Array.from(values);
}

function buildDisplayNameMap(baseMap, sessions = []) {
  const map = new Map(baseMap);
  for (const session of sessions) {
    if (session?.userId && session?.displayName && !map.has(session.userId)) {
      map.set(session.userId, session.displayName);
    }
  }
  return map;
}

export class InsightsService {
  constructor(dbPath, { repositoryFactory = (target) => new SqliteReadRepository(target) } = {}) {
    this.dbPath = dbPath;
    this.repository = repositoryFactory(dbPath);
    this.cache = new CacheStore();
    this.loadedAt = null;
  }

  reload() {
    this.clearAnalysisCaches();
    return this.refreshMeta();
  }

  refreshMeta() {
    const meta = this.repository.getMeta();
    this.cache.setMeta(meta);
    this.loadedAt = new Date().toISOString();
    return this.getMeta();
  }

  clearAnalysisCaches() {
    this.cache.clearAnalysis();
  }

  getMeta() {
    const meta = this.cache.getMeta() || this.repository.getMeta();
    this.cache.setMeta(meta);
    return {
      dbPath: meta.dbPath,
      loadedAt: this.loadedAt,
      selfUserId: meta.selfUserId,
      selfDisplayName: meta.selfDisplayName,
      friendTable: meta.friendTable,
      friendCount: meta.friendList.length,
      sessionCount: 0,
      userCount: 0,
      locationCount: 0,
      friends: meta.friendList
    };
  }

  getAnalysisMeta() {
    const meta = this.cache.getMeta() || this.repository.getMeta();
    this.cache.setMeta(meta);
    return meta;
  }

  getCurrentDisplayNameMap(meta = this.getAnalysisMeta()) {
    const map = new Map(meta.friendList.map((row) => [row.userId, row.displayName]));
    map.set(meta.selfUserId, meta.selfDisplayName);
    return map;
  }

  getUserSessions(userId, { fromMs, toMs }) {
    const key = `user:${this.dbPath}:${userId}:${fromMs ?? 'null'}:${toMs ?? 'null'}`;
    const cached = this.cache.getSessionWindow(key);
    if (cached) {
      return cached;
    }

    const meta = this.getAnalysisMeta();
    const inputs = this.repository.getSessionInputsForUsers([userId], { toMs });
    const locationMetaByLocation = this.repository.getLocationMetadata(uniqueLocationsFromInputs(inputs));
    const sessions = buildNormalizedSessions({
      ...inputs,
      observedUntilMs: meta.observedUntilMs,
      fromMs,
      toMs,
      currentDisplayNameMap: this.getCurrentDisplayNameMap(meta),
      locationMetaByLocation,
      locationParseCache: this.cache.locationParses
    });
    this.cache.setSessionWindow(key, sessions);
    return sessions;
  }

  getLocationSessions(locations, { fromMs, toMs, excludeUserIds = [], includeUserIds = null } = {}) {
    const key = `location:${this.dbPath}:${locations.join('|')}:${excludeUserIds.join('|')}:${includeUserIds ? includeUserIds.join('|') : 'all'}:${fromMs ?? 'null'}:${toMs ?? 'null'}`;
    const cached = this.cache.getSessionWindow(key);
    if (cached) {
      return cached;
    }

    const meta = this.getAnalysisMeta();
    const inputs = this.repository.getSessionInputsForLocations(locations, {
      toMs,
      excludeUserIds,
      includeUserIds
    });
    const locationMetaByLocation = this.repository.getLocationMetadata(uniqueLocationsFromInputs(inputs));
    const sessions = buildNormalizedSessions({
      ...inputs,
      observedUntilMs: meta.observedUntilMs,
      fromMs,
      toMs,
      currentDisplayNameMap: this.getCurrentDisplayNameMap(meta),
      locationMetaByLocation,
      locationParseCache: this.cache.locationParses
    });
    this.cache.setSessionWindow(key, sessions);
    return sessions;
  }

  getAcquaintances({ from, to, limit = 50 } = {}) {
    const meta = this.getAnalysisMeta();
    const { fromMs, toMs } = toDateRangeMs({ from, to });

    const selfSessions = this.getUserSessions(meta.selfUserId, { fromMs, toMs });
    const selfByLocation = groupByLocation(selfSessions);
    const candidateSessions = this.getLocationSessions(Array.from(selfByLocation.keys()), {
      fromMs,
      toMs,
      excludeUserIds: [meta.selfUserId, ...meta.friendSet]
    });
    const candidateByLocation = groupByLocation(candidateSessions);

    const agg = new Map();

    for (const [location, mySessions] of selfByLocation.entries()) {
      const locationSessions = candidateByLocation.get(location) || [];
      const byOther = new Map();
      for (const row of locationSessions) {
        if (!byOther.has(row.userId)) {
          byOther.set(row.userId, []);
        }
        byOther.get(row.userId).push(row);
      }

      for (const [userId, sessions] of byOther.entries()) {
        const overlapMs = calculateOverlapMs(mySessions, sessions);
        if (overlapMs <= 0) continue;

        const prev = agg.get(userId) || {
          userId,
          displayName: sessions[0]?.displayName || userId,
          meetCount: 0,
          overlapMs: 0
        };
        prev.meetCount += 1;
        prev.overlapMs += overlapMs;
        agg.set(userId, prev);
      }
    }

    const rows = Array.from(agg.values());
    const byMeetCount = [...rows]
      .sort((a, b) => b.meetCount - a.meetCount || b.overlapMs - a.overlapMs)
      .slice(0, limit);
    const byOverlap = [...rows]
      .sort((a, b) => b.overlapMs - a.overlapMs || b.meetCount - a.meetCount)
      .slice(0, limit);

    return {
      range: { from, to },
      byMeetCount,
      byOverlap
    };
  }

  getTimeline({ userId, from, to, sessionLimit = null, companionLimit = 200 } = {}) {
    const meta = this.getAnalysisMeta();
    const targetUserId = userId || meta.selfUserId;
    const { fromMs, toMs } = toDateRangeMs({ from, to });

    const sessions = this.getUserSessions(targetUserId, { fromMs, toMs }).slice().sort((a, b) => b.startMs - a.startMs);
    const targetByLocation = groupByLocation(sessions);
    const candidateSessions = this.getLocationSessions(Array.from(targetByLocation.keys()), {
      fromMs,
      toMs,
      excludeUserIds: [targetUserId]
    });
    const locationCandidateByLocation = groupByLocation(candidateSessions);

    const companionAgg = new Map();

    for (const [location, targetSessionsAtLocation] of targetByLocation.entries()) {
      const locationSessions = locationCandidateByLocation.get(location) || [];
      const byUser = new Map();
      for (const item of locationSessions) {
        if (!byUser.has(item.userId)) {
          byUser.set(item.userId, []);
        }
        byUser.get(item.userId).push(item);
      }

      for (const [otherId, otherSessions] of byUser.entries()) {
        const overlapMs = calculateOverlapMs(targetSessionsAtLocation, otherSessions);
        if (overlapMs <= 0) continue;
        const prev = companionAgg.get(otherId) || {
          userId: otherId,
          displayName: otherSessions[0]?.displayName || otherId,
          overlapMs: 0,
          meetCount: 0
        };
        prev.overlapMs += overlapMs;
        prev.meetCount += 1;
        companionAgg.set(otherId, prev);
      }
    }

    const companions = Array.from(companionAgg.values())
      .sort((a, b) => b.overlapMs - a.overlapMs || b.meetCount - a.meetCount)
      .slice(0, companionLimit);

    const timelineSessions =
      typeof sessionLimit === 'number' && sessionLimit > 0
        ? sessions.slice(0, sessionLimit)
        : sessions;

    return {
      targetUserId,
      targetDisplayName: this.getCurrentDisplayNameMap(meta).get(targetUserId) || targetUserId,
      sessions: timelineSessions,
      companions
    };
  }

  getRelationshipTop({ userId, scope = 'friends', from, to, limit = 100 } = {}) {
    if (!userId) {
      throw new Error('userId is required');
    }

    const meta = this.getAnalysisMeta();
    const { fromMs, toMs } = toDateRangeMs({ from, to });
    const targetSessions = this.getUserSessions(userId, { fromMs, toMs });
    const targetByLocation = groupByLocation(targetSessions);

    const friendsOnly = scope !== 'all';
    const candidateSessions = this.getLocationSessions(Array.from(targetByLocation.keys()), {
      fromMs,
      toMs,
      excludeUserIds: friendsOnly ? [] : [userId, meta.selfUserId],
      includeUserIds: friendsOnly
        ? Array.from(meta.friendSet).filter((otherId) => otherId !== userId && otherId !== meta.selfUserId)
        : null
    });
    const candidateByLocation = groupByLocation(candidateSessions);

    const agg = new Map();
    for (const [location, targetLocSessions] of targetByLocation.entries()) {
      const locationSessions = candidateByLocation.get(location) || [];

      const byUser = new Map();
      for (const session of locationSessions) {
        if (!byUser.has(session.userId)) {
          byUser.set(session.userId, []);
        }
        byUser.get(session.userId).push(session);
      }

      for (const [otherId, otherSessions] of byUser.entries()) {
        const summary = summarizeLocationOverlap(targetLocSessions, otherSessions);
        if (!summary) continue;
        const prev = agg.get(otherId) || {
          userId: otherId,
          displayName: otherSessions[0]?.displayName || otherId,
          overlapMs: 0,
          meetCount: 0,
          isFriend: meta.friendSet.has(otherId)
        };
        prev.overlapMs += summary.overlapMs;
        prev.meetCount += 1;
        agg.set(otherId, prev);
      }
    }

    const rows = Array.from(agg.values())
      .sort((a, b) => b.overlapMs - a.overlapMs || b.meetCount - a.meetCount)
      .slice(0, limit);

    return {
      userId,
      scope: friendsOnly ? 'friends' : 'all',
      rows
    };
  }

  getMutualFriends() {
    const meta = this.getAnalysisMeta();
    const rows = meta.friendList
      .map((friend) => {
        const mutualFriendCount = this.repository
          .getMutualGraphRows(friend.userId)
          .filter(
            (row) =>
              row.isFriend &&
              row.userId &&
              row.userId !== meta.selfUserId &&
              row.userId !== friend.userId
          ).length;

        return {
          userId: friend.userId,
          displayName: friend.displayName,
          mutualFriendCount
        };
      })
      .filter((row) => row.mutualFriendCount > 0)
      .sort(
        (a, b) =>
          b.mutualFriendCount - a.mutualFriendCount || a.displayName.localeCompare(b.displayName)
      );

    return {
      rows
    };
  }

  getMutualFriendDetail({ userId } = {}) {
    if (!userId) {
      throw new Error('userId is required');
    }

    const meta = this.getAnalysisMeta();
    const rows = this.repository
      .getMutualGraphRows(userId)
      .filter(
        (row) =>
          row.isFriend &&
          row.userId &&
          row.userId !== meta.selfUserId &&
          row.userId !== userId
      )
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .map((row) => ({
        userId: row.userId,
        displayName: row.displayName
      }));

    return {
      userId,
      targetDisplayName: this.getCurrentDisplayNameMap(meta).get(userId) || userId,
      rows
    };
  }

  getRelationshipPair({ userIdA, userIdB, from, to } = {}) {
    if (!userIdA || !userIdB) {
      throw new Error('userIdA and userIdB are required');
    }

    const meta = this.getAnalysisMeta();
    const { fromMs, toMs } = toDateRangeMs({ from, to });
    const sessionsA = this.getUserSessions(userIdA, { fromMs, toMs });
    const sessionsB = this.getUserSessions(userIdB, { fromMs, toMs });

    const aByLocation = groupByLocation(sessionsA);
    const bByLocation = groupByLocation(sessionsB);

    const selfSessions =
      meta.selfUserId === userIdA || meta.selfUserId === userIdB
        ? []
        : this.getUserSessions(meta.selfUserId, { fromMs, toMs });
    const selfByLocation = groupByLocation(selfSessions);
    const overlappingLocations = Array.from(aByLocation.keys()).filter((location) => bByLocation.has(location));
    const locationSessions = this.getLocationSessions(overlappingLocations, { fromMs, toMs });
    const locationSessionsByLocation = groupByLocation(locationSessions);
    const displayNameMap = buildDisplayNameMap(this.getCurrentDisplayNameMap(meta), [
      ...sessionsA,
      ...sessionsB,
      ...locationSessions
    ]);

    const records = [];

    for (const [location, aLoc] of aByLocation.entries()) {
      const bLoc = bByLocation.get(location);
      if (!bLoc || bLoc.length === 0) {
        continue;
      }

      const summary = summarizeLocationOverlap(aLoc, bLoc);
      if (!summary) {
        continue;
      }

      const peakOccupancy = calculatePeakOccupancy(locationSessionsByLocation.get(location) || []);
      const host = parseLocationHost(location, displayNameMap);

      const selfPresent =
        meta.selfUserId === userIdA ||
        meta.selfUserId === userIdB ||
        isSelfPresentInSegments(selfByLocation.get(location) || [], summary.segments);

      const sampleSession = aLoc[0] || bLoc[0];

      records.push({
        location,
        worldId: sampleSession?.worldId || '',
        worldName: sampleSession?.worldName || '',
        groupName: sampleSession?.groupName || '',
        accessType: sampleSession?.accessType || '',
        accessTypeName: sampleSession?.accessTypeName || '',
        region: sampleSession?.region || '',
        groupId: sampleSession?.groupId || null,
        groupAccessType: sampleSession?.groupAccessType || null,
        overlapMs: summary.overlapMs,
        overlapStartAt: new Date(summary.overlapStartMs).toISOString(),
        overlapEndAt: new Date(summary.overlapEndMs).toISOString(),
        peakOccupancy,
        selfPresent,
        ...host,
        segments: summary.segments.map((item) => ({
          overlapMs: item.overlapMs,
          startAt: new Date(item.startMs).toISOString(),
          endAt: new Date(item.endMs).toISOString()
        }))
      });
    }

    records.sort((a, b) => b.overlapMs - a.overlapMs || a.location.localeCompare(b.location));

    return {
      userIdA,
      userIdB,
      displayNameA: displayNameMap.get(userIdA) || userIdA,
      displayNameB: displayNameMap.get(userIdB) || userIdB,
      totalOverlapMs: records.reduce((sum, row) => sum + row.overlapMs, 0),
      records
    };
  }
}
