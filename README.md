<p align="center">
  <h1 align="center">nit</h1>
  <p align="center">
    <strong>The pedantic release tool your codebase deserves.</strong>
  </p>
  <p align="center">
    One command. Clean code, AI-generated changelogs, semantic versioning, and a perfect commit — every time.
  </p>
  <p align="center">
    <a href="#installation">Install</a> · <a href="#quick-start">Quick Start</a> · <a href="#how-it-works">How It Works</a> · <a href="#configuration">Config</a> · <a href="#jetbrains-plugin">IDE Plugin</a>
  </p>
</p>

---

## Why nit?

Every release is the same tedious ritual: strip out debug logs, format the code, bump the version, write a changelog, craft a commit message, build, push. You do it dozens of times. You still forget a `console.log`.

**nit** does all of it in a single command — and writes better commit messages than you do.

- **Zero config to start** → auto-generates everything on first run
- **AI-powered changelogs & commits** → describes _what actually changed_ in your code, not "version bump"
- **Multiple AI providers** → choose between Grok (xAI), OpenAI, or Anthropic (Claude)
- **Code cleanup built in** → strips `console.log()` calls and unused CSS classes before every release
- **Automatic formatting** → runs Prettier (or your configured formatter) so diffs stay clean
- **Fail-safe versioning** → automatic rollback if anything goes wrong mid-release
- **Self-updating** → checks for new versions and updates itself before each run
- **JetBrains plugin** → run releases directly from WebStorm/IntelliJ with a dedicated tool window

---

## Installation

```bash
npm install --save-dev nit
```

Then add a release script to your `package.json`:

```json
{
  "scripts": {
    "release": "nit"
  }
}
```

Or install globally:

```bash
npm install -g nit
```

---

## Quick Start

**1. Run your first release**

```bash
npm run release
```

On first run, nit will prompt you to select your AI provider:

```
  AI Provider Setup
  Choose which AI provider nit will use for changelogs and commit messages.

  1) Grok (xAI)          (env: GROK_API_KEY)
  2) OpenAI              (env: OPENAI_API_KEY)
  3) Anthropic (Claude)  (env: ANTHROPIC_API_KEY)

  Select provider (1-3):
```

Your choice is saved to `public/nit.json` and shared with the JetBrains plugin — you only set it once.

**2. Add your API key**

Create a `.env` file in your project root with the key for your chosen provider:

```env
# Grok (xAI)
GROK_API_KEY=xai-your-api-key-here

# OpenAI
OPENAI_API_KEY=sk-your-api-key-here

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

You only need the key for the provider you selected. Add `.env` to your `.gitignore`.

| Provider  | Get a key at                                                         |
| --------- | -------------------------------------------------------------------- |
| Grok      | [console.x.ai](https://console.x.ai)                                 |
| OpenAI    | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Anthropic | [console.anthropic.com](https://console.anthropic.com)               |

**3. Release**

```bash
npm run release
```

That's it. nit auto-generates a `public/nit.json` config on first run and handles everything else.

---

## How It Works

When you run `nit`, it executes a complete release pipeline — automatically, in order, with full error handling at every step:

| #   | Step                    | What happens                                                        |
| --- | ----------------------- | ------------------------------------------------------------------- |
| 1   | **Self-update**         | Checks npm for a newer version of nit and auto-updates if available |
| 2   | **Pre-flight**          | Verifies git is installed, repo exists, remote is configured        |
| 3   | **Load environment**    | Reads `.env`, validates your API key                                |
| 4   | **Read config**         | Loads `public/nit.json` (or creates it with sensible defaults)      |
| 5   | **Bump version**        | Increments version in `nit.json` and `package.json`                 |
| 6   | **Clean code**          | Removes all `console.log()` calls from `src/`                       |
| 7   | **Remove dead CSS**     | Strips unused CSS classes not referenced in any JS/TSX file         |
| 8   | **Format**              | Runs Prettier or your configured formatter                          |
| 9   | **Detect changes**      | If nothing changed, exits gracefully — no empty commits             |
| 10  | **Generate changelog**  | AI analyzes your actual diff and writes human-quality release notes |
| 11  | **Update CHANGELOG.md** | Prepends the new entry with proper formatting                       |
| 12  | **Production build**    | Runs your build command (`npm run build`, Vite, CRA, etc.)          |
| 13  | **Commit & push**       | Stages everything, generates an AI commit message, pushes to remote |

If _anything_ fails after the version bump, nit **automatically rolls back** `nit.json` to the previous version. Your project is never left in a broken state.

---

## CLI Options

```
nit [options]

Options:
  -b, --branch <name>    Push to a specific branch (overrides nit.json)
  -d, --dry-run          Preview the entire pipeline without making changes
  -i, --interactive      Prompt for options before running
  -s, --skip-update      Skip the self-update check
  -q, --quiet            Minimal output
      --setup            Re-run AI provider selection
  -h, --help             Show help
```

**Examples:**

```bash
nit                     # Full release to configured branch
nit -d                  # Dry run — see what would happen
nit -b develop          # Release to the develop branch
nit -i                  # Interactive mode — choose options
nit --setup             # Re-select your AI provider
```

---

## Configuration

### `public/nit.json`

Auto-generated on first run. You can also create or edit it manually:

```json
{
  "version": "1.0",
  "projectName": "my-app",
  "branch": "main",
  "provider": "grok"
}
```

| Field         | Type     | Description                                | Default          |
| ------------- | -------- | ------------------------------------------ | ---------------- |
| `version`     | `string` | Current version (auto-incremented)         | `"1.0"`          |
| `projectName` | `string` | Name used in commit messages & changelogs  | Your folder name |
| `branch`      | `string` | Default branch to push to                  | `"main"`         |
| `provider`    | `string` | AI provider: `grok`, `openai`, `anthropic` | Set on first run |

### Environment Variables

Set in your project's `.env` file. Only the key for your selected provider is required:

| Variable            | Provider  | Description              |
| ------------------- | --------- | ------------------------ |
| `GROK_API_KEY`      | Grok      | xAI Grok API key         |
| `OPENAI_API_KEY`    | OpenAI    | OpenAI API key           |
| `ANTHROPIC_API_KEY` | Anthropic | Anthropic Claude API key |

---

## AI-Generated Output

### Commit Messages

nit reads the actual diff of your changes and generates a meaningful, structured commit message:

```
my-app: Release v2.3

- Added dark mode toggle to settings page
- Fixed overflow bug in mobile navigation drawer
- Replaced hardcoded API URL with environment variable
```

No more "misc changes" or "update stuff". Every commit tells a story.

### Changelogs

Changelog entries are appended to `CHANGELOG.md` in a clean, standard format — based on real code changes, never metadata:

```markdown
## [2.3] - 2026-03-04

- Added dark mode toggle to settings page
- Fixed overflow bug in mobile navigation drawer
- Replaced hardcoded API URL with environment variable
```

---

## Error Handling

nit fails loudly and clearly — no silent corruption, no half-finished releases.

| Category    | What's covered                                                     |
| ----------- | ------------------------------------------------------------------ |
| **Git**     | Not installed, not a repo, no remote, push rejected, auth failures |
| **API**     | Missing/invalid key, network errors, rate limits, server errors    |
| **Files**   | Permission denied, not found, no disk space, invalid JSON          |
| **Build**   | Missing formatter, build command failures                          |
| **Cleanup** | Directory access errors, file read/write errors                    |

**Strict by design:** nit will _never_ fall back to a generic "Version bump" commit. If AI generation fails, the release stops. Your git history stays clean.

---

## JetBrains Plugin

nit ships with an optional **WebStorm / IntelliJ IDEA plugin** that gives you a dedicated tool window to run releases without leaving your IDE.

- One-click **Publish** from the sidebar
- Real-time pipeline status as each step executes — styled log output, not raw terminal text
- Changelog preview on successful completion
- Error reporting with context
- **Automatic AI provider setup** — if no provider is configured, a native dialog appears automatically so you can pick one without touching a terminal
- **AI provider selection** in Settings → Tools → Nit Release (Grok, OpenAI, or Anthropic)
- Provider choice is shared with the CLI via `public/nit.json` — configure once, use everywhere

The plugin is included in the `plugin/` directory and can be built with Gradle or installed from a local `.zip`.

> **First run:** if `public/nit.json` has no `provider` set, the plugin will automatically show a provider selection dialog before continuing the release. Your choice is saved immediately to `nit.json` and the release restarts.

---

## Supported Projects

| Framework               | Detected automatically? |
| ----------------------- | ----------------------- |
| Vite + React            | Yes                     |
| Create React App        | Yes                     |
| Any project with `src/` | Yes                     |

nit auto-detects your build command, formatter, and project structure. No manual setup required.

---

## Version Format

Versions use a simple `MAJOR.MINOR` pattern:

```
1.0 → 1.1 → 1.2 → ... → 1.9 → 2.0 → 2.1 → ...
```

Both `nit.json` and `package.json` are kept in sync automatically.

---

## Project Structure

Minimum required:

```
my-project/
  .env               ← API key for your chosen provider (required, gitignored)
  public/
    nit.json          ← Auto-generated config (includes provider selection)
  src/                ← Code cleanup targets this directory
  package.json
```

---

## Contributing

nit is free, open source, and MIT licensed. Contributions, issues, and feature requests are welcome.

---

## License

[MIT](LICENSE.md) — free for personal and commercial use.
