import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import {
  getWorldLabel,
  getWorldMetaLabel,
  getWorldTooltip
} from '../../src/static/hiddenIdentifiers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appJsPath = path.resolve(__dirname, '../../src/static/app.js');

describe('world instance meta display', () => {
  test('formats room type and region labels for display', () => {
    expect(getWorldMetaLabel({ accessTypeName: 'friends', region: 'jp' })).toBe('好友 / JP');
    expect(getWorldMetaLabel({ accessTypeName: 'groupPlus', region: 'us' })).toBe('群组+ / US');
    expect(getWorldMetaLabel({ accessTypeName: 'invite+', region: 'eu' })).toBe('邀请+ / EU');
    expect(getWorldMetaLabel({ accessTypeName: 'public', region: '' })).toBe('公开');
  });

  test('falls back to parsed world id instead of full location tags when no world name is known', () => {
    const location =
      'wrld_6aa7e36a-1449-4033-aaa0-3470a8460cfa:60241~hidden(usr_d6613ded-d8b2-4e08-9967-2ed990d5fc58)~region(jp)';

    expect(getWorldLabel({ worldName: '', location })).toBe(
      'wrld_6aa7e36a-1449-4033-aaa0-3470a8460cfa'
    );
    expect(getWorldTooltip({ worldName: '', location })).toBe(location);
  });

  test('renders world instance meta in both timeline and pair tables', () => {
    const source = fs.readFileSync(appJsPath, 'utf8');

    expect((source.match(/class="stacked-text world-cell"/g) || []).length).toBe(2);
    expect((source.match(/class="world-meta"/g) || []).length).toBe(2);
  });
});
