# Windows Release And GitHub Actions Design

## Background

The application now runs as a local Electron desktop tool and uses read-only SQLite access through the built-in `node:sqlite` runtime. That solves the runtime dependency on the external `sqlite3` CLI, but it still leaves the project in a developer-oriented shape:

- users need the source tree
- users need Node.js and npm to start the app
- there is no Windows installer
- there is no portable Windows build
- there is no CI release pipeline

The target usage model is closer to VRCX: a standalone Windows desktop application that end users can install or run directly without setting up a JavaScript development environment.

## Goal

Add a Windows release pipeline so the project can be distributed to end users as a standalone desktop application through GitHub Actions.

The release system should:

- produce a Windows installer `.exe`
- produce a Windows portable `.exe`
- require no preinstalled Node.js on user machines
- require no external SQLite CLI on user machines
- support manual release builds
- support automated release builds on tags and GitHub Releases

## Hard Requirements

### 1. Windows standalone app

The delivered artifacts must behave as standalone Windows software:

- users download and run the installer or portable build
- users do not install Node.js
- users do not run `npm`
- users do not install `sqlite3`

### 2. Runtime remains read-only against VRCX data

The packaging change must not alter the current database contract:

- the app reads `VRCX.sqlite3`
- the app remains read-only
- the app does not bundle a database
- the app does not modify the VRCX source database

### 3. Keep the release pipeline simple

The release flow should follow the general spirit of VRCX GitHub Actions publishing, but it should not copy VRCX’s broader multi-platform complexity.

The project only needs a focused Windows release workflow.

## Non-Goals

- no macOS or Linux packaging in this iteration
- no auto-update system in this iteration
- no code-signing setup in this iteration unless already available
- no release-note generation beyond minimal artifact publishing
- no rewrite of the application runtime for packaging alone

## Recommended Approach

Use `electron-builder` for packaging and GitHub Actions for CI release automation.

Why this is the preferred approach:

- `electron-builder` supports Windows `nsis` and `portable` targets directly
- the configuration can live close to the Electron app in `package.json`
- the local build command and CI build command can stay aligned
- the project can produce user-ready `.exe` outputs without requiring a separate packaging toolchain at runtime

This keeps the release system smaller than VRCX’s broader workflow while still matching the user-facing delivery model.

## Distribution Targets

### 1. Installer build

Provide a standard Windows installer using `nsis`.

Expected behavior:

- user downloads an installer `.exe`
- installer writes the app under the usual Windows application path
- desktop/start-menu behavior follows default Electron Builder Windows conventions unless a small customization is clearly useful

### 2. Portable build

Provide a Windows portable executable.

Expected behavior:

- user downloads one `.exe`
- user can run it directly without a formal install step
- the app still prompts for or discovers the VRCX data directory at runtime

Both targets should be built from the same source revision in the same workflow.

## Packaging Architecture

### Build tool

Use `electron-builder`.

Configuration should live in `package.json` unless it becomes too large, in which case it can move to a small dedicated config file. For the current project size, inline configuration in `package.json` is preferred to avoid unnecessary indirection.

### Build scripts

Add explicit scripts for:

- Windows build
- Windows release build
- optional local unpacked smoke build if useful during development

Recommended direction:

- `build:win`
- `release:win`

`release:win` should be the CI-facing command and build both `nsis` and `portable` targets.

### Packaging inputs

The Windows package should include:

- Electron main process files
- preload script
- static renderer assets
- runtime JS modules
- package metadata needed by Electron Builder

The package should exclude:

- tests
- docs not needed at runtime
- local worktrees
- development-only artifacts

## Runtime Boundaries In Packaged App

The packaged app should continue to behave like the current desktop runtime:

- open the desktop window directly
- locate or ask for the VRCX data directory
- read `VRCX.sqlite3` through `node:sqlite`
- store only its own app config under Electron user data

The packaged app must not require:

- shell scripts
- external binaries
- system `sqlite3`
- source checkout paths

## GitHub Actions Workflow

Create a dedicated Windows release workflow, for example:

- `.github/workflows/release-windows.yml`

### Triggers

The workflow must support all three:

- `workflow_dispatch`
- tag push
- GitHub Release publish

This gives:

- manual builds for testing and internal release checks
- automatic builds for versioned tags
- automatic attachment behavior for formal GitHub Releases

### Job shape

Prefer a single focused Windows build job unless the workflow grows meaningfully.

Recommended sequence:

1. checkout repository
2. setup Node.js
3. install dependencies with `npm ci`
4. run test suite
5. run Windows packaging command
6. upload artifacts
7. if triggered by tag/release, publish or attach artifacts to the GitHub Release

This is intentionally much simpler than VRCX’s broader workflow.

## Release Behavior

### Manual trigger

For `workflow_dispatch`:

- run the full Windows build
- upload artifacts to the workflow run
- optionally support a version input later, but not required now

### Tag trigger

For tag pushes:

- run the same build path
- create or attach release artifacts in a predictable way

### GitHub Release trigger

For published releases:

- build the same Windows artifacts
- attach them to the release entry

The key requirement is not to fork the build logic across different triggers. One shared build path should feed all three entry points.

## Artifact Naming

Artifacts should be easy for end users to distinguish.

They should clearly indicate:

- app name
- version
- target type (`setup` / `portable`)
- architecture where relevant

Example direction:

- `VRCX-Insights-Tool-<version>-setup.exe`
- `VRCX-Insights-Tool-<version>-portable.exe`

Exact naming can follow Electron Builder conventions with light customization.

## Project Changes Required

### `package.json`

Add:

- packaging scripts
- `electron-builder` dependency
- build metadata for Windows packaging

### Assets

Add:

- Windows app icon if missing

If no custom icon exists yet, provide a placeholder packaging-safe icon now and treat visual polish as follow-up.

### README

Document:

- how to build Windows artifacts locally
- what artifacts are produced
- how end users should run installer vs portable versions
- confirmation that runtime does not depend on `sqlite3` CLI

### GitHub Actions

Add:

- Windows release workflow under `.github/workflows/`

## Testing Strategy

### Local validation

Before relying on CI, validate locally that:

- packaging command succeeds
- output artifacts are created
- the app launches from packaged output in at least one Windows-compatible test path when practical

### CI validation

The workflow must at minimum verify:

- dependency install succeeds
- tests pass before packaging
- installer artifact is generated
- portable artifact is generated

### Runtime smoke expectations

Even if full GUI automation is out of scope, the packaged app should be smoke-checked for:

- startup
- settings/onboarding access
- VRCX data directory selection path
- ability to read a valid `VRCX.sqlite3`

## Simplicity Guardrails

To keep the packaging work from becoming over-engineered:

- use one Windows workflow, not many
- use one packaging tool, not multiple competing build systems
- keep build config close to the app unless it becomes unwieldy
- keep local and CI build commands aligned
- avoid optional release extras such as auto-update and signing until the baseline packaging flow is stable

## Risks

### `node:sqlite` in packaged runtime

The current runtime uses the built-in `node:sqlite` module. Packaging must preserve compatibility with the target Electron/Node runtime on Windows. This is the most important runtime packaging risk and should be validated explicitly.

### Missing Windows icon/resources

If the app lacks a proper `.ico`, the packaged output may still work but look unfinished. This is a release-quality issue, not a functional blocker.

### GitHub Release attachment differences by trigger

`workflow_dispatch`, tag pushes, and release publication have different GitHub event contexts. The workflow should share one build path and only vary the final publish/attach step.

## Success Criteria

The work is successful when:

- the repository can build Windows installer and portable artifacts
- GitHub Actions can produce those artifacts on manual trigger
- GitHub Actions can produce and publish those artifacts on tag/release triggers
- the packaged app does not require Node.js on user machines
- the packaged app does not require external `sqlite3` CLI
- the app still reads `VRCX.sqlite3` in read-only mode
