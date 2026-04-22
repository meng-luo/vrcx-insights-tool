import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appJsPath = path.resolve(__dirname, '../../src/static/app.js');

describe('api world name hydration', () => {
  test('hydrates missing world names for timeline and pair rows through the desktop bridge', () => {
    const source = fs.readFileSync(appJsPath, 'utf8');

    expect(source).toContain('async function hydrateMissingWorldNames(rows)');
    expect(source).toContain('await getInsightsApi().resolveWorldNames(worldIds)');
    expect(source).toContain('state.timeline.sessions = await hydrateMissingWorldNames(data.sessions || []);');
    expect(source).toContain('records: await hydrateMissingWorldNames(data.records || []),');
  });
});
