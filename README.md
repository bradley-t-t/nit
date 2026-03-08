# nit

Automated release management for Node.js projects. Handles version bumping, code cleanup, formatting, AI-generated changelogs, builds, and git operations in a single command.

---

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Release Pipeline](#release-pipeline)
- [CLI Reference](#cli-reference)
- [Versioning](#versioning)
- [AI Changelog Generation](#ai-changelog-generation)
- [Code Cleanup](#code-cleanup)
- [Formatting](#formatting)
- [Error Handling & Rollback](#error-handling--rollback)
- [Self-Update](#self-update)
- [License](#license)

---

## Installation

Install as a dev dependency:

```bash
npm install --save-dev github:bradley-t-t/nit#main
```

Add a release script to `package.json`:

```json
{
  "scripts": {
    "release": "nit"
  }
}
```

Or install globally:

```bash
npm install -g github:bradley-t-t/nit#main
```

### Prerequisites

- Node.js >= 18.0.0
- Git with at least one configured remote
- An API key for one of the supported AI providers

---

## Configuration

### `public/nit.json`

Created automatically on first run. Contains all project-level settings:

```json
{
  "version": "1.0",
  "projectName": "my-app",
  "branch": "main",
  "provider": "grok"
}
```

| Field         | Type   | Default        | Description                                      |
| ------------- | ------ | -------------- | ------------------------------------------------ |
| `version`     | string | `"1.0"`        | Current release version (`MAJOR.MINOR` format)   |
| `projectName` | string | Directory name | Used in commit messages and changelog headers    |
| `branch`      | string | `"main"`       | Target branch for `git push`                     |
| `provider`    | string | —              | AI provider ID: `grok`, `openai`, or `anthropic` |

On first run (or with `--setup`), nit prompts for provider selection and saves it here.

### API Keys

Store your API key in a `.env` file at the project root. Only the key matching your selected provider is required.

| Provider   | Environment Variable | Signup                       |
| ---------- | -------------------- | ---------------------------- |
| Grok (xAI) | `GROK_API_KEY`       | console.x.ai                 |
| OpenAI     | `OPENAI_API_KEY`     | platform.openai.com/api-keys |
| Anthropic  | `ANTHROPIC_API_KEY`  | console.anthropic.com        |

Grok also checks `REACT_APP_GROK_API_KEY` as a fallback.

### Version Syncing

When nit writes a version, it updates multiple files automatically:

- `public/nit.json` — canonical version (`MAJOR.MINOR`)
- `package.json` — converted to semver (`MAJOR.MINOR.0`)
- `plugin/gradle.properties` — `pluginVersion` field (if file exists)
- `plugin/src/main/resources/META-INF/plugin.xml` — `<version>` tag (if file exists)

---

## Release Pipeline

Running `nit` (or `npm run release`) executes the following steps in order:

| #   | Phase              | Description                                                                                                                                                                      |
| --- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Self-update        | Checks GitHub for a newer version of nit. Updates and re-executes if found.                                                                                                      |
| 2   | Pre-flight checks  | Verifies git is installed, the directory is a git repo, and a remote exists.                                                                                                     |
| 3   | Load environment   | Reads `.env`, loads `public/nit.json` (creates with defaults if missing).                                                                                                        |
| 4   | Provider setup     | Prompts for AI provider selection if not yet configured.                                                                                                                         |
| 5   | API key validation | Confirms the key exists and meets minimum length (20 chars).                                                                                                                     |
| 6   | Version bump       | Increments the version and writes to all version files.                                                                                                                          |
| 7   | Code cleanup       | Removes `console.log()` and/or unused CSS if `--clean-logs` / `--clean-css` flags are set.                                                                                       |
| 8   | Format             | Runs Prettier or the project's configured `format` script.                                                                                                                       |
| 9   | Change detection   | If no changes exist after all modifications, exits cleanly — no empty commits.                                                                                                   |
| 10  | Stage              | Runs `git add -A` to stage all changes.                                                                                                                                          |
| 11  | AI commit message  | Sends the diff (excluding lock files and build artifacts) to the configured AI provider. Generates a structured commit message with bullet-point descriptions of actual changes. |
| 12  | Changelog          | Extracts bullet points from the commit message and prepends a dated entry to `CHANGELOG.md`.                                                                                     |
| 13  | Re-stage           | Runs `git add -A` again to include the updated changelog.                                                                                                                        |
| 14  | Build              | Runs the detected build command (`npm run build`, `npx vite build`, or `npx react-scripts build`).                                                                               |
| 15  | Commit             | Creates a commit using a temp file (`git commit -F`) to handle multiline messages safely.                                                                                        |
| 16  | Push               | Pushes to the configured branch via `git push origin <branch>`.                                                                                                                  |

If any step after the version bump fails, nit rolls back `public/nit.json` and `package.json` to their previous versions before exiting.

---

## CLI Reference

```
nit [options]
```

| Flag              | Short | Description                                                     |
| ----------------- | ----- | --------------------------------------------------------------- |
| `--branch <name>` | `-b`  | Override the push branch (ignores `nit.json` setting)           |
| `--interactive`   | `-i`  | Prompt for branch, build, and format preferences before running |
| `--skip-update`   | `-s`  | Skip the automatic self-update check                            |
| `--clean-logs`    | —     | Remove all `console.log()` statements from `src/`               |
| `--clean-css`     | —     | Remove unused CSS classes from `src/`                           |
| `--setup`         | —     | Re-run AI provider selection, save to config, then exit         |
| `--update`        | —     | Check for and install the latest version of nit, then exit      |
| `--help`          | `-h`  | Print usage information                                         |

### Examples

```bash
nit                              # Standard release
nit -b develop                   # Push to develop instead of configured branch
nit -i                           # Interactive mode
nit --clean-logs --clean-css     # Release with code cleanup
nit --setup                      # Change AI provider
nit --update                     # Update nit to latest
nit -s                           # Release without checking for nit updates
```

---

## Versioning

Versions follow a `MAJOR.MINOR` format. Each release increments the minor version by 1. When minor exceeds 9, it rolls over to the next major version:

```
1.0 → 1.1 → 1.2 → ... → 1.9 → 2.0 → 2.1 → ... → 2.9 → 3.0
```

The version stored in `package.json` is converted to semver by appending `.0` (e.g., `2.3` becomes `2.3.0`).

---

## AI Changelog Generation

nit generates commit messages and changelog entries by sending the actual code diff to your configured AI provider.

### Supported Providers

| Provider   | Model                      | Endpoint                             |
| ---------- | -------------------------- | ------------------------------------ |
| Grok (xAI) | `grok-3-latest`            | `api.x.ai/v1/chat/completions`       |
| OpenAI     | `gpt-4o`                   | `api.openai.com/v1/chat/completions` |
| Anthropic  | `claude-sonnet-4-20250514` | `api.anthropic.com/v1/messages`      |

### How It Works

1. nit collects the staged diff, diff stats, and changed file list.
2. Lock files (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`) and build artifacts (`.next/`, `build/`, `dist/`, `node_modules/`) are stripped from the diff.
3. The diff is truncated to 30,000 characters if needed to stay within token limits.
4. The AI is instructed to describe only changes visible in the diff — no assumptions, no metadata descriptions, no version bump mentions.
5. The response must follow a strict format:

```
project-name: Release vX.Y

- Description of change 1
- Description of change 2
```

6. If the response doesn't match the expected format, nit falls back to a generic commit message and continues the release.

### Retry Logic

API calls retry up to 3 times on rate limits (429) and server errors (5xx) with exponential backoff starting at 2 seconds. All other errors fail immediately.

### Changelog Format

Bullet points from the commit message are extracted and written to `CHANGELOG.md`:

```markdown
## [2.3] - 2026-03-08

- Added dark mode toggle to settings page
- Fixed overflow bug in mobile navigation drawer
```

New entries are inserted after the `# Changelog` header, preserving all previous entries.

---

## Code Cleanup

Cleanup is opt-in via flags. Neither runs by default.

### `--clean-logs`

Scans all `.js`, `.jsx`, `.ts`, and `.tsx` files in `src/` and removes `console.log()` statements. Handles nested parentheses, optional semicolons, and trailing newlines. Consolidates resulting blank lines.

### `--clean-css`

Scans `.css` files in `src/` and removes class definitions that are not referenced in any JavaScript/TypeScript file. Checks for references across string literals, `className` attributes, `styles` object access, `classList` API calls, and array bracket notation.

### Ignored Directories

Both cleanup passes skip `node_modules`, `dist`, `build`, `.git`, `coverage`, `.next`, and `.cache`.

Cleanup errors are logged but do not block the release.

---

## Formatting

nit auto-detects a formatter using the following priority:

1. A `"format"` script in `package.json` → runs `npm run format`
2. Prettier in dependencies → runs `npx prettier --write .`
3. Prettier installed globally → runs `npx prettier --write .`

If no formatter is found, the step is skipped. Formatter errors are logged but do not block the release.

In interactive mode (`-i`), you can skip formatting when prompted.

---

## Error Handling & Rollback

nit exits immediately on pre-flight failures (git not installed, not a repo, no remote, missing API key). For failures that occur after the version has been written — build errors, commit failures, push rejections — nit restores `nit.json` and `package.json` to their previous versions before exiting.

Push failures include specific guidance:

- **Rejected (non-fast-forward):** suggests pulling the branch first
- **Authentication error:** suggests checking credentials or SSH keys
- **Remote not found:** suggests verifying `git remote -v`

Git changes (staged files, formatted code, cleanup modifications) are not reverted automatically. If a release fails mid-pipeline, you can inspect and revert those changes manually.

---

## Self-Update

On every release (unless `--skip-update` is set), nit fetches `package.json` from GitHub and compares versions. If a newer version exists, it installs the update via npm and re-executes itself with the new version.

To update manually without running a release:

```bash
nit --update
```

---

## Project Structure

Expected layout:

```
project/
  .env                ← API key (gitignored)
  public/
    nit.json          ← Release config (auto-generated)
  src/                ← Cleanup target directory
  package.json
  CHANGELOG.md        ← Created if missing
```

---

## License

MIT
