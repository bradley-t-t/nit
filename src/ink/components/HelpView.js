import React from "react";
import { Text, Box, Newline } from "ink";
import {
  PACKAGE_VERSION,
  COMMIT_TYPES,
  SYMBOLS,
} from "../../utils/constants.js";

const { createElement: h } = React;

const SECTION_GAP = 1;

function Section({ title, children }) {
  return h(
    Box,
    { flexDirection: "column", marginBottom: SECTION_GAP },
    h(Text, { bold: true }, title),
    ...React.Children.toArray(children),
  );
}

function Option({ flag, description, dimNote }) {
  return h(
    Box,
    { paddingLeft: 2 },
    h(Text, { color: "blue" }, flag.padEnd(26)),
    h(Text, null, description),
    dimNote ? h(Text, { dimColor: true }, ` ${dimNote}`) : null,
  );
}

function Example({ command, description }) {
  return h(
    Box,
    { paddingLeft: 2 },
    h(Text, { dimColor: true }, command.padEnd(40)),
    description ? h(Text, null, description) : null,
  );
}

function ProviderLine({ label, hint }) {
  return h(
    Box,
    { paddingLeft: 2 },
    h(Text, { color: "blue" }, SYMBOLS.arrowRight),
    h(Text, null, ` ${label}   `),
    h(Text, { dimColor: true }, hint),
  );
}

export default function HelpView() {
  return h(
    Box,
    { flexDirection: "column", paddingLeft: 2 },

    h(
      Box,
      { marginBottom: SECTION_GAP },
      h(Text, { bold: true }, "Nit"),
      h(Text, { dimColor: true }, ` v${PACKAGE_VERSION}`),
    ),

    h(
      Section,
      { title: "Usage:" },
      h(Box, { paddingLeft: 2 }, h(Text, null, "nit [command] [options]")),
    ),

    h(
      Section,
      { title: "Commands:" },
      h(Option, {
        flag: "release",
        description: "Full release pipeline",
        dimNote: "(default)",
      }),
      h(Option, {
        flag: "commit",
        description: "Commit changes with conventional commit message",
      }),
      h(Option, {
        flag: "clean",
        description: "Run code cleanup only (no git)",
      }),
      h(Option, { flag: "status", description: "Print project info" }),
    ),

    h(
      Section,
      { title: "Release Options:" },
      h(Option, {
        flag: "    --patch",
        description: "Bump patch version",
        dimNote: "(default)",
      }),
      h(Option, { flag: "    --minor", description: "Bump minor version" }),
      h(Option, { flag: "    --major", description: "Bump major version" }),
      h(Option, {
        flag: "    --dry-run",
        description: "Preview release without making changes",
      }),
    ),

    h(
      Section,
      { title: "Commit Options:" },
      h(Option, {
        flag: "-t, --type <type>",
        description: `Commit type (${COMMIT_TYPES.join(", ")})`,
      }),
      h(Option, {
        flag: "-m, --message <msg>",
        description: "Custom commit message (skips AI)",
      }),
      h(Option, {
        flag: "    --branch-create <name>",
        description: "Create and switch to a new branch first",
      }),
      h(Option, {
        flag: "    --stage-all",
        description: "Stage all files (git add -A)",
      }),
      h(Option, {
        flag: "    --stage-tracked",
        description: "Stage tracked files only (git add -u)",
      }),
    ),

    h(
      Section,
      { title: "General Options:" },
      h(Option, {
        flag: "-b, --branch <name>",
        description: "Override branch to push to",
      }),
      h(Option, {
        flag: "-s, --skip-update",
        description: "Skip nit update check",
      }),
      h(Option, {
        flag: "-i, --interactive",
        description: "Interactive mode (prompts for options)",
      }),
      h(Option, { flag: "-v, --verbose", description: "Verbose output" }),
      h(Option, { flag: "-q, --quiet", description: "Minimal output" }),
      h(Option, {
        flag: "    --ci",
        description: "CI mode (quiet + skip update)",
      }),
      h(Option, {
        flag: "    --setup",
        description: "Re-run AI provider setup",
      }),
      h(Option, {
        flag: "    --update",
        description: "Manually update nit to the latest version",
      }),
      h(Option, {
        flag: "    --clean-logs",
        description: "Auto-answer Yes to remove console.log statements",
      }),
      h(Option, {
        flag: "    --no-clean-logs",
        description: "Auto-answer No to remove console.log statements",
      }),
      h(Option, {
        flag: "    --clean-css",
        description: "Auto-answer Yes to remove unused CSS classes",
      }),
      h(Option, {
        flag: "    --no-clean-css",
        description: "Auto-answer No to remove unused CSS classes",
      }),
      h(Option, {
        flag: "    --clean-all",
        description: "Auto-answer Yes to both cleanup prompts",
      }),
      h(Option, {
        flag: "    --no-clean",
        description: "Auto-answer No to both cleanup prompts",
      }),
      h(Option, { flag: "-h, --help", description: "Show this help" }),
    ),

    h(
      Section,
      { title: "Supported AI Providers:" },
      h(ProviderLine, {
        label: "Claude Code (CLI)",
        hint: "Uses your Claude subscription",
      }),
      h(ProviderLine, { label: "Grok (xAI)        ", hint: "GROK_API_KEY" }),
      h(ProviderLine, { label: "OpenAI (GPT-4o)   ", hint: "OPENAI_API_KEY" }),
      h(ProviderLine, {
        label: "Anthropic (Claude)",
        hint: "ANTHROPIC_API_KEY",
      }),
    ),

    h(
      Section,
      { title: "Examples:" },
      h(Example, {
        command: "nit",
        description: "Run a full release (patch bump)",
      }),
      h(Example, {
        command: "nit release --minor",
        description: "Release with minor version bump",
      }),
      h(Example, {
        command: "nit release --major --dry-run",
        description: "Preview a major release",
      }),
      h(Example, {
        command: "nit commit -t feat",
        description: 'Commit with "feat" type',
      }),
      h(Example, {
        command: 'nit commit -m "fix typo"',
        description: "Commit with a manual message",
      }),
      h(Example, { command: "nit commit --branch-create feature/login" }),
      h(Example, { command: "nit clean", description: "Run cleanup only" }),
      h(Example, { command: "nit status", description: "Show project info" }),
      h(Example, {
        command: "nit -b develop",
        description: "Release to develop branch",
      }),
      h(Example, {
        command: "nit --clean-all",
        description: "Release with all cleanup enabled",
      }),
      h(Example, {
        command: "nit --ci",
        description: "Quiet mode for CI pipelines",
      }),
      h(Example, {
        command: "nit --setup",
        description: "Choose your AI provider",
      }),
      h(Example, {
        command: "nit --update",
        description: "Update nit to latest version",
      }),
    ),

    h(Newline, null),
  );
}
