import { clipSessionToRange } from './dateRange.js';
import { parseLocationDetails } from './locationDetails.js';

function extractWorldId(location) {
  return parseLocationDetails(location).worldId || '';
}

function isTrackableLocation(location) {
  const details = parseLocationDetails(location);
  return details.isRealInstance && Boolean(details.worldId) && Boolean(details.instanceId);
}

function rememberLatestDisplayName(map, userId, displayName, observedAtMs) {
  if (!userId || !displayName || Number.isNaN(observedAtMs)) {
    return;
  }
  const prev = map.get(userId);
  if (!prev || observedAtMs >= prev.observedAtMs) {
    map.set(userId, { displayName, observedAtMs });
  }
}

function pushRawSession(rawSessions, row, location, endMs, durationMs) {
  if (!isTrackableLocation(location) || Number.isNaN(endMs) || !(durationMs > 0)) {
    return;
  }
  const userId = row.userId || `name:${row.displayName || 'unknown'}`;
  const displayName = row.displayName || userId;
  rawSessions.push({
    userId,
    displayName,
    location,
    worldName: row.worldName || '',
    groupName: row.groupName || '',
    startMs: Math.max(0, endMs - durationMs),
    endMs,
    source: row.source || 'local'
  });
}

function mergeRawSessions(rawSessions) {
  const sorted = [...rawSessions].sort((a, b) => {
    if (a.userId !== b.userId) {
      return a.userId.localeCompare(b.userId);
    }
    if (a.location !== b.location) {
      return a.location.localeCompare(b.location);
    }
    if (a.startMs !== b.startMs) {
      return a.startMs - b.startMs;
    }
    return a.endMs - b.endMs;
  });

  const merged = [];
  for (const row of sorted) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.userId === row.userId &&
      prev.location === row.location &&
      row.startMs <= prev.endMs &&
      (prev.source !== 'local' || row.source !== 'local')
    ) {
      if (row.endMs > prev.endMs) {
        prev.endMs = row.endMs;
      }
      if (!prev.displayName && row.displayName) {
        prev.displayName = row.displayName;
      }
      if (!prev.worldName && row.worldName) {
        prev.worldName = row.worldName;
      }
      if (!prev.groupName && row.groupName) {
        prev.groupName = row.groupName;
      }
      if (prev.source !== row.source) {
        prev.source = 'merged';
      }
      continue;
    }
    merged.push({ ...row });
  }
  return merged;
}

function getLocationDetails(location, locationParseCache) {
  if (locationParseCache.has(location)) {
    return locationParseCache.get(location);
  }
  const details = parseLocationDetails(location);
  locationParseCache.set(location, details);
  return details;
}

export function buildNormalizedSessions({
  localRows = [],
  feedGpsRows = [],
  feedOnlineOfflineRows = [],
  observedUntilMs = 0,
  fromMs = null,
  toMs = null,
  currentDisplayNameMap = new Map(),
  locationMetaByLocation = new Map(),
  locationParseCache = new Map()
}) {
  const rawSessions = [];
  const latestObservedDisplayNames = new Map();

  for (const row of localRows) {
    const endMs = Date.parse(row.createdAt || '');
    if (Number.isNaN(endMs)) {
      continue;
    }
    rememberLatestDisplayName(latestObservedDisplayNames, row.userId, row.displayName, endMs);
    pushRawSession(rawSessions, row, row.location, endMs, Number(row.time || 0));
  }

  const openFeedSessions = new Map();
  const feedEvents = [];
  for (const row of feedOnlineOfflineRows) {
    feedEvents.push({
      kind: row.type,
      createdAt: row.createdAt,
      userId: row.userId,
      displayName: row.displayName,
      location: row.location,
      worldName: row.worldName,
      groupName: row.groupName,
      time: row.time,
      source: 'feed'
    });
  }
  for (const row of feedGpsRows) {
    feedEvents.push({
      kind: 'GPS',
      createdAt: row.createdAt,
      userId: row.userId,
      displayName: row.displayName,
      location: row.location,
      worldName: row.worldName,
      groupName: row.groupName,
      previousLocation: row.previousLocation,
      time: row.time,
      source: 'feed'
    });
  }

  feedEvents.sort((a, b) => {
    const left = Date.parse(a.createdAt || '');
    const right = Date.parse(b.createdAt || '');
    if (left !== right) {
      return left - right;
    }
    const order = { Online: 0, GPS: 1, Offline: 2 };
    return (order[a.kind] ?? 9) - (order[b.kind] ?? 9);
  });

  for (const row of feedEvents) {
    const createdAtMs = Date.parse(row.createdAt || '');
    if (Number.isNaN(createdAtMs)) {
      continue;
    }
    rememberLatestDisplayName(latestObservedDisplayNames, row.userId, row.displayName, createdAtMs);

    if (row.kind === 'GPS') {
      pushRawSession(rawSessions, row, row.previousLocation, createdAtMs, Number(row.time || 0));
      if (isTrackableLocation(row.location)) {
        openFeedSessions.set(row.userId, {
          userId: row.userId,
          displayName: row.displayName || row.userId,
          location: row.location,
          worldName: row.worldName || '',
          groupName: row.groupName || '',
          startMs: createdAtMs,
          source: 'feed'
        });
      } else {
        openFeedSessions.delete(row.userId);
      }
      continue;
    }

    if (row.kind === 'Offline') {
      pushRawSession(rawSessions, row, row.location, createdAtMs, Number(row.time || 0));
      openFeedSessions.delete(row.userId);
      continue;
    }

    if (row.kind === 'Online' && isTrackableLocation(row.location)) {
      openFeedSessions.set(row.userId, {
        userId: row.userId,
        displayName: row.displayName || row.userId,
        location: row.location,
        worldName: row.worldName || '',
        groupName: row.groupName || '',
        startMs: createdAtMs,
        source: 'feed'
      });
    }
  }

  for (const row of openFeedSessions.values()) {
    if (observedUntilMs > row.startMs) {
      rawSessions.push({
        userId: row.userId,
        displayName: row.displayName,
        location: row.location,
        worldName: row.worldName || '',
        groupName: row.groupName || '',
        startMs: row.startMs,
        endMs: observedUntilMs,
        source: row.source || 'feed'
      });
    }
  }

  const displayNameMap = new Map(
    Array.from(latestObservedDisplayNames.entries()).map(([userId, value]) => [userId, value.displayName])
  );
  for (const [userId, displayName] of currentDisplayNameMap.entries()) {
    displayNameMap.set(userId, displayName);
  }

  return mergeRawSessions(rawSessions)
    .map((row) => {
      const clipped = clipSessionToRange(row, fromMs, toMs);
      if (!clipped) {
        return null;
      }
      const details = getLocationDetails(row.location, locationParseCache);
      const meta = locationMetaByLocation.get(row.location) || {};
      return {
        userId: row.userId,
        displayName: displayNameMap.get(row.userId) || row.displayName || row.userId,
        location: row.location,
        worldName: meta.worldName || row.worldName || '',
        groupName: meta.groupName || row.groupName || '',
        worldId: meta.worldId || details.worldId || extractWorldId(row.location),
        accessType: details.accessType,
        accessTypeName: details.accessTypeName,
        region: details.region,
        groupId: details.groupId,
        groupAccessType: details.groupAccessType,
        startMs: clipped.startMs,
        endMs: clipped.endMs,
        durationMs: clipped.durationMs,
        startAt: clipped.startAt,
        endAt: clipped.endAt
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
}
