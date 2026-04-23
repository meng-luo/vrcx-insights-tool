import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appJsPath = path.resolve(__dirname, '../../src/static/app.js');

describe('relationship subtabs template', () => {
  test('defines top, mutual and pair relationship subtabs', () => {
    const source = fs.readFileSync(appJsPath, 'utf8');

    expect(source).toContain('name="top"');
    expect(source).toContain('name="mutual"');
    expect(source).toContain('name="pair"');
    expect(source).toContain('label="单好友关系排行"');
    expect(source).toContain('label="共同好友排行"');
    expect(source).toContain('label="双人关系查询"');
    expect(source).toContain('@row-click="showMutualFriendDetail"');
    expect(source).toContain('v-model="state.mutualFriendDetailVisible"');
    expect(source).toContain(`:title="'我和 ' + (state.mutualFriendDetail.targetDisplayName || '') + ' 的共同好友'"`);
  });
});
