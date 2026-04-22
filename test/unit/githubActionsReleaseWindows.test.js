import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.resolve(
  __dirname,
  '../../.github/workflows/release-windows.yml'
);

describe('release-windows workflow', () => {
  test('enforces trigger and release-attach contract for Windows artifacts', () => {
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    expect(workflow).toMatch(/on:\s*\n\s*workflow_dispatch:/);
    expect(workflow).toMatch(/push:\s*\n\s*tags:\s*\n\s*-\s*'v\*'/);
    expect(workflow).toMatch(/release:\s*\n\s*types:\s*\n\s*-\s*published/);

    expect(workflow).toMatch(
      /build-windows:\s*\n\s*if:\s*github\.event_name != 'release' \|\| startsWith\(github\.event\.release\.tag_name, 'v'\)/
    );
    expect(workflow).toContain('runs-on: windows-latest');
    expect(workflow).toContain('run: npm ci');
    expect(workflow).toContain('run: npm test');
    expect(workflow).toContain('run: npm run release:win');

    const uploadArtifactMatches = workflow.match(/uses:\s*actions\/upload-artifact@v4/g) ?? [];
    expect(uploadArtifactMatches).toHaveLength(2);
    expect(workflow).toMatch(/name:\s*windows-setup[\s\S]*path:\s*dist\/\*-setup\.exe/);
    expect(workflow).toMatch(/name:\s*windows-portable[\s\S]*path:\s*dist\/\*-portable\.exe/);

    expect(workflow).toContain('uses: softprops/action-gh-release@v2');
    expect(workflow).toContain(
      "if: github.event_name == 'release' && startsWith(github.event.release.tag_name, 'v')"
    );
    expect(workflow).not.toContain("startsWith(github.ref, 'refs/tags/')");
  });
});
