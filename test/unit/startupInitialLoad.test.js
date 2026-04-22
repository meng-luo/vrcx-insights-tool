import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appJsPath = path.resolve(__dirname, '../../src/static/app.js');

describe('startup initial load behavior', () => {
  test('defers applying analysis views until bootstrapping has finished', () => {
    const source = fs.readFileSync(appJsPath, 'utf8');
    const hydrateStart = source.indexOf('async function hydrateConfiguredState() {');
    const loadMetaStart = source.indexOf('async function loadMeta() {');
    const onMountedStart = source.indexOf('onMounted(async () => {');
    const returnStart = source.indexOf('    return {');
    const hydrateBlock = source.slice(hydrateStart, loadMetaStart);
    const onMountedBlock = source.slice(onMountedStart, returnStart);

    expect(hydrateBlock).not.toContain('await applyAllViews();');
    expect(onMountedBlock).toContain('state.bootstrapping = false;');
    expect(onMountedBlock).toContain('if (!state.appState.requiresOnboarding) {');
    expect(onMountedBlock).toContain('await applyAllViews();');
  });
});
