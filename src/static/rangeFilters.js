function formatDateValue(date) {
  return date.toISOString().slice(0, 10);
}

function isCompleteDateRange(dateRange) {
  return (
    Array.isArray(dateRange) &&
    dateRange.length === 2 &&
    typeof dateRange[0] === 'string' &&
    dateRange[0] &&
    typeof dateRange[1] === 'string' &&
    dateRange[1]
  );
}

export function getPresetRangeValues(preset, now = new Date()) {
  if (preset === 'all') {
    return null;
  }

  const to = formatDateValue(now);
  let fromDate = null;

  if (preset === 'week') {
    fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (preset === 'month') {
    fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (preset === 'year') {
    fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  }

  if (!fromDate) {
    return null;
  }

  return [formatDateValue(fromDate), to];
}

export function normalizeDateRangeChange(value) {
  if (!isCompleteDateRange(value)) {
    return {
      dateRange: null,
      rangePreset: 'all'
    };
  }

  return {
    dateRange: value,
    rangePreset: 'custom'
  };
}

export function buildRangeQueryObject({ rangePreset, dateRange }) {
  if (rangePreset === 'all' || !isCompleteDateRange(dateRange)) {
    return { all: '1' };
  }

  return {
    from: dateRange[0],
    to: dateRange[1]
  };
}
