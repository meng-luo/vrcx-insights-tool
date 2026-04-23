import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appJsPath = path.resolve(__dirname, '../../src/static/app.js');
const stylesPath = path.resolve(__dirname, '../../src/static/styles.css');

describe('mutual friend dialog layout', () => {
  test('renders the mutual friend dialog content as a responsive three-column grid', () => {
    const appSource = fs.readFileSync(appJsPath, 'utf8');
    const cssSource = fs.readFileSync(stylesPath, 'utf8');

    expect(appSource).toContain('class="mutual-friend-grid"');
    expect(appSource).toContain('class="mutual-friend-card"');
    expect(cssSource).toContain('.mutual-friend-grid');
    expect(cssSource).toContain('grid-template-columns: repeat(3, minmax(0, 1fr));');
    expect(cssSource).not.toMatch(
      /@media[\s\S]*?\.mutual-friend-grid\s*\{[\s\S]*?grid-template-columns:/m
    );
  });
});
