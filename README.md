<h1 align="center">nit</h1>

<p align="center"><strong>Zero-dependency release automation in a single command.</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/v11.7-release-1e3a5f" alt="Version 11.7" />
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white" alt="Node.js 18+" />
  <img src="https://img.shields.io/badge/ES%20Modules-native-f7df1e?logo=javascript&logoColor=black" alt="ES Modules" />
  <img src="https://img.shields.io/badge/dependencies-zero-brightgreen" alt="Zero dependencies" />
  <img src="https://img.shields.io/badge/install-GitHub-181717?logo=github&logoColor=white" alt="Install from GitHub" />
</p>

---

`nit` is a zero-dependency Node.js CLI that compresses an entire release workflow — cleanup, formatting, version bumping, AI-generated changelogs, building, and pushing — into a single command. It is designed to work on any git repository. Node-specific steps such as code cleanup, formatting, and builds are automatically detected and skipped when running against non-Node projects, making it universally applicable regardless of stack.

`nit` is not published to npm. It is installed directly from GitHub via `github:bradley-t-t/nit` and keeps itself current through an automatic self-update check on every run.

---

## 16-Step Release Pipeline

Every `nit` invocation runs a deterministic sequence of steps. Each step either completes, skips gracefully, or halts with a rollback — there is no partial state left behind.

**Step 1 — Self-update check.** On startup, `nit` fetches its own `package.json` from GitHub and compares the remote version against the running binary. If a newer version exists, it auto-installs and re-executes the original command transparently.

**Step 2 — Pre-flight validation.** Confirms that `git` is installed, the working directory is a git repository, and a remote is configured. Any failure here exits immediately with a clear diagnostic.

**Step 3 — Environment loading.** Reads `.env` from the project root if present and merges it into the process environment before any subsequent step needs it.

**Step 4 — Config resolution.** Reads `public/nit.json`. If the file does not exist, it is created with sensible defaults on first run so the project is immediately configured without manual setup.

**Step 5 — Provider setup.** Prompts the user to select an AI provider if one has not been configured, or if `--setup` was passed. Provider preference is persisted to `nit.json`.

**Step 6 — API key validation.** Validates that the configured provider's API key is at least 20 characters. This check is skipped entirely for the `claude-code` provider, which uses the local Claude Code CLI subprocess rather than a direct API key.

**Step 7 — Version bump.** Increments the MINOR version by one. When the minor component reaches `.9`, the next bump rolls over to the next MAJOR version and resets minor to `.0` (e.g. `2.9` → `3.0`).

**Step 8 — Code cleanup (Node only).** Scans `.js`, `.jsx`, `.ts`, and `.tsx` files under `src/` and removes `console.log()` statements. Separately, unused CSS classes are removed from `.css` files. Both cleanup passes are individually toggleable via CLI flags.

**Step 9 — Formatting (Node only).** Runs `npm run format`, falls back to `npx prettier --write .`, and silently skips if neither is available. Non-Node repositories skip this step entirely.

**Step 10 — Change detection.** Runs a git diff against the working tree. If nothing has changed since the last commit, `nit` exits cleanly with a message rather than creating an empty release.

**Step 11 — Version file updates.** Writes the new version to every applicable version file it detects in the repo: `nit.json`, `package.json` (formatted as semver `X.Y.0`), `gradle.properties`, and `plugin.xml`.

**Step 12 — Build (Node only).** Attempts `npm run build`, then `npx vite build`, then `npx react-scripts build`, in that order. Skips cleanly if none succeed or if the project is not a Node project.

**Step 13 — Stage all.** Runs `git add -A` to capture all changes including version file updates, cleanup results, and build output.

**Step 14 — AI commit message generation.** Filters the staged diff (strips lock files, `.next/`, `build/`, `dist/`, `node_modules/`) and truncates it to 30,000 characters before sending it to the configured AI provider. The resulting commit message is structured and descriptive.

**Step 15 — Changelog update.** Bullet points are extracted from the generated commit message and prepended to `CHANGELOG.md` under the new version heading.

**Step 16 — Commit, push, and rollback.** Re-stages all changes including the updated changelog, writes the commit message to a temp file to support multiline messages, commits, and pushes to the configured branch. If the push fails, `nit` performs a full rollback to restore the repository to its pre-release state.

---

## AI Providers

`nit` supports four AI providers for commit message and changelog generation. The active provider is stored in `nit.json` and can be changed at any time with `--setup`.

| Provider      | Model            | Authentication                                        |
| ------------- | ---------------- | ----------------------------------------------------- |
| `claude-code` | Claude (via CLI) | Spawns a `claude -p` subprocess — no API key required |
| `grok`        | grok-3-latest    | `GROK_API_KEY` environment variable                   |
| `openai`      | gpt-4o           | `OPENAI_API_KEY` environment variable                 |
| `anthropic`   | claude-sonnet-4  | `ANTHROPIC_API_KEY` environment variable              |

All providers share the same retry logic: up to 3 attempts on `429` or `5xx` responses, with exponential backoff at 2s, 4s, and 8s intervals. `Retry-After` response headers are respected when present.

---

## Developer Context Injection

Projects can place a `.nit-context` file in their root directory. The contents of this file are injected directly into the AI prompt as developer context before the diff, allowing teams to give the AI background knowledge about the project — its conventions, terminology, architecture decisions, or anything else that produces better commit messages.

---

## CLI Flags

`nit` exposes a hand-rolled argument parser with no third-party dependency. The full flag surface:

| Flag                               | Description                                                      |
| ---------------------------------- | ---------------------------------------------------------------- |
| `--branch` / `-b`                  | Override the git branch that changes are pushed to               |
| `--interactive` / `-i`             | Prompt for preferences at runtime rather than using saved config |
| `--skip-update` / `-s`             | Bypass the self-update check                                     |
| `--setup`                          | Re-run provider selection regardless of saved config             |
| `--update`                         | Force-install the latest version from GitHub                     |
| `--clean-logs` / `--no-clean-logs` | Toggle console.log removal                                       |
| `--clean-css` / `--no-clean-css`   | Toggle unused CSS class removal                                  |
| `--clean-all` / `--no-clean`       | Enable or disable all cleanup passes at once                     |
| `--help` / `-h`                    | Print usage and exit                                             |

---

## Security

Branch names provided via `--branch` are validated against a strict regex before any shell interpolation occurs. The self-update re-execution uses `spawnSync` with an explicit args array rather than shell string construction, eliminating injection surface entirely.

---

## Architecture

`nit` is organized into six modules, each with a single clear responsibility:

| Module     | Responsibility                                                                   |
| ---------- | -------------------------------------------------------------------------------- |
| `api/`     | AI provider clients, retry logic, prompt construction                            |
| `cleanup/` | console.log removal, unused CSS class detection and removal                      |
| `cli/`     | Argument parsing, help output, interactive menu, self-update, ASCII banner       |
| `config/`  | nit.json read/write, version bumping, version file updates, changelog management |
| `git/`     | Pre-flight checks, diff retrieval, commit authoring, push, rollback              |
| `utils/`   | Shared constants, typed error classes, file system helpers                       |

```
nit invoked
  └─ cli/        → parse args, show banner, handle --help / --update / --setup
  └─ self-update → fetch remote version, reinstall if newer
  └─ pre-flight  → validate git, remote
  └─ config/     → load .env, read nit.json, bump version
  └─ cleanup/    → remove console.logs, prune unused CSS
  └─ git/        → diff, detect changes
  └─ config/     → write version files
  └─ build       → npm run build / vite / react-scripts
  └─ git/        → stage all
  └─ api/        → generate commit message from diff
  └─ config/     → update CHANGELOG.md
  └─ git/        → commit via temp file, push
                    → rollback on push failure
```

---

## Project Stats

| Metric                           | Value           |
| -------------------------------- | --------------- |
| Pipeline steps                   | 16              |
| AI providers                     | 4               |
| Runtime dependencies             | 0               |
| Source modules                   | 6               |
| Diff character limit             | 30,000          |
| Retry attempts per provider call | 3               |
| Version rollover threshold       | .9 → next major |

---

<p align="center"><sub>Built by <strong>Trenton Taylor</strong></sub></p>
