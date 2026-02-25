#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync, spawn } from "child_process";
import { run as runCleanup } from "./cleanup.js";

const PROJECT_ROOT = process.cwd();
const args = process.argv.slice(2);

const PACKAGE_VERSION = "3.2.0";
const PACKAGE_NAME = "turl-release";

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  white: "\x1b[37m",
  brightRed: "\x1b[91m",
  brightBlue: "\x1b[94m",
  brightWhite: "\x1b[97m",
  bgRed: "\x1b[41m",
  bgBlue: "\x1b[44m",
  bgWhite: "\x1b[47m",
};

const SYMBOLS = {
  check: "✓",
  cross: "✗",
  arrow: "→",
  arrowRight: "▸",
  dot: "●",
  star: "★",
  lightning: "⚡",
  rocket: "◉",
  gear: "⚙",
  warning: "⚠",
  info: "ℹ",
  block: "█",
  blockLight: "░",
  blockMed: "▒",
  line: "─",
  corner: "╭",
  cornerEnd: "╰",
  vertical: "│",
  spinner: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
};

const ui = {
  clear: () => process.stdout.write("\x1b[2J\x1b[H"),

  hideCursor: () => process.stdout.write("\x1b[?25l"),

  showCursor: () => process.stdout.write("\x1b[?25h"),

  moveTo: (x, y) => process.stdout.write(`\x1b[${y};${x}H`),

  clearLine: () => process.stdout.write("\x1b[2K"),

  color: (text, ...colors) => colors.join("") + text + COLORS.reset,

  box: (text, width = 50) => {
    const padding = Math.max(0, width - text.length - 4);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return (
      `${COLORS.brightBlue}╭${"─".repeat(width - 2)}╮${COLORS.reset}\n` +
      `${COLORS.brightBlue}│${COLORS.reset}${" ".repeat(leftPad + 1)}${text}${" ".repeat(rightPad + 1)}${COLORS.brightBlue}│${COLORS.reset}\n` +
      `${COLORS.brightBlue}╰${"─".repeat(width - 2)}╯${COLORS.reset}`
    );
  },

  header: () => {
    const lines = [
      ``,
      `  ${COLORS.brightRed}${COLORS.bright}████████╗${COLORS.brightWhite}██╗   ██╗${COLORS.brightBlue}██████╗ ${COLORS.brightWhite}██╗     ${COLORS.reset}`,
      `  ${COLORS.brightRed}${COLORS.bright}╚══██╔══╝${COLORS.brightWhite}██║   ██║${COLORS.brightBlue}██╔══██╗${COLORS.brightWhite}██║     ${COLORS.reset}`,
      `  ${COLORS.brightRed}${COLORS.bright}   ██║   ${COLORS.brightWhite}██║   ██║${COLORS.brightBlue}██████╔╝${COLORS.brightWhite}██║     ${COLORS.reset}`,
      `  ${COLORS.brightRed}${COLORS.bright}   ██║   ${COLORS.brightWhite}██║   ██║${COLORS.brightBlue}██╔══██╗${COLORS.brightWhite}██║     ${COLORS.reset}`,
      `  ${COLORS.brightRed}${COLORS.bright}   ██║   ${COLORS.brightWhite}╚██████╔╝${COLORS.brightBlue}██║  ██║${COLORS.brightWhite}███████╗${COLORS.reset}`,
      `  ${COLORS.brightRed}${COLORS.bright}   ╚═╝   ${COLORS.brightWhite} ╚═════╝ ${COLORS.brightBlue}╚═╝  ╚═╝${COLORS.brightWhite}╚══════╝${COLORS.reset}`,
      ``,
      `  ${COLORS.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`,
      `  ${COLORS.brightWhite}${COLORS.bright}Automated Release Management System${COLORS.reset}`,
      `  ${COLORS.dim}Version ${PACKAGE_VERSION}${COLORS.reset}`,
      `  ${COLORS.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`,
      ``,
    ];
    return lines.join("\n");
  },

  progressBar: (current, total, width = 40, label = "") => {
    const percentage = Math.min(100, Math.round((current / total) * 100));
    const filled = Math.round((current / total) * width);
    const empty = width - filled;
    const bar =
      COLORS.brightBlue +
      SYMBOLS.block.repeat(filled) +
      COLORS.dim +
      SYMBOLS.blockLight.repeat(empty) +
      COLORS.reset;
    const percentStr = `${percentage}%`.padStart(4);
    return `  ${COLORS.brightWhite}${label.padEnd(25)}${COLORS.reset} [${bar}] ${COLORS.bright}${percentStr}${COLORS.reset}`;
  },

  step: (num, total, text, status = "running") => {
    const statusIcons = {
      running: `${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset}`,
      success: `${COLORS.brightWhite}${SYMBOLS.check}${COLORS.reset}`,
      error: `${COLORS.brightRed}${SYMBOLS.cross}${COLORS.reset}`,
      skip: `${COLORS.dim}${SYMBOLS.dot}${COLORS.reset}`,
      warn: `${COLORS.brightRed}${SYMBOLS.warning}${COLORS.reset}`,
    };
    const icon = statusIcons[status] || statusIcons.running;
    return `\n  ${COLORS.dim}[${num}/${total}]${COLORS.reset} ${icon} ${text}`;
  },

  subStep: (text, status = "info") => {
    const statusStyles = {
      info: `${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset}`,
      success: `${COLORS.brightWhite}${SYMBOLS.check}${COLORS.reset}`,
      error: `${COLORS.brightRed}${SYMBOLS.cross}${COLORS.reset}`,
      warn: `${COLORS.brightRed}${SYMBOLS.warning}${COLORS.reset}`,
      skip: `${COLORS.dim}${SYMBOLS.dot}${COLORS.reset}`,
    };
    const icon = statusStyles[status] || statusStyles.info;
    return `\n       ${icon} ${COLORS.dim}${text}${COLORS.reset}`;
  },

  spinner: (text) => {
    let frame = 0;
    let interval;
    return {
      start: () => {
        ui.hideCursor();
        interval = setInterval(() => {
          process.stdout.write(
            `\r  ${COLORS.brightBlue}${SYMBOLS.spinner[frame]}${COLORS.reset} ${text}`,
          );
          frame = (frame + 1) % SYMBOLS.spinner.length;
        }, 80);
      },
      stop: (finalText, success = true) => {
        clearInterval(interval);
        ui.showCursor();
        const icon = success
          ? `${COLORS.brightWhite}${SYMBOLS.check}${COLORS.reset}`
          : `${COLORS.brightRed}${SYMBOLS.cross}${COLORS.reset}`;
        process.stdout.write(`\r  ${icon} ${finalText}\n`);
      },
    };
  },

  divider: (char = "─", width = 56) =>
    `  ${COLORS.dim}${char.repeat(width)}${COLORS.reset}`,

  highlight: (text) =>
    `${COLORS.bright}${COLORS.brightBlue}${text}${COLORS.reset}`,

  success: (text) => `${COLORS.brightWhite}${text}${COLORS.reset}`,

  error: (text) => `${COLORS.brightRed}${text}${COLORS.reset}`,

  warn: (text) => `${COLORS.brightRed}${text}${COLORS.reset}`,

  info: (text) => `${COLORS.brightBlue}${text}${COLORS.reset}`,
};

async function checkForUpdates() {
  try {
    const latestVersion = execSync(`npm view ${PACKAGE_NAME} version`, {
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();

    if (latestVersion && latestVersion !== PACKAGE_VERSION) {
      const [latestMajor, latestMinor, latestPatch] = latestVersion
        .split(".")
        .map(Number);
      const [currentMajor, currentMinor, currentPatch] =
        PACKAGE_VERSION.split(".").map(Number);

      const isNewer =
        latestMajor > currentMajor ||
        (latestMajor === currentMajor && latestMinor > currentMinor) ||
        (latestMajor === currentMajor &&
          latestMinor === currentMinor &&
          latestPatch > currentPatch);

      if (isNewer) {
        return {
          hasUpdate: true,
          currentVersion: PACKAGE_VERSION,
          latestVersion,
        };
      }
    }
    return {
      hasUpdate: false,
      currentVersion: PACKAGE_VERSION,
      latestVersion: PACKAGE_VERSION,
    };
  } catch {
    return {
      hasUpdate: false,
      currentVersion: PACKAGE_VERSION,
      latestVersion: PACKAGE_VERSION,
      error: true,
    };
  }
}

async function promptForUpdate(updateInfo) {
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    process.stdout.write(`\n`);
    process.stdout.write(
      `  ${COLORS.brightRed}${SYMBOLS.warning}${COLORS.reset} ${COLORS.bright}Update Available!${COLORS.reset}\n`,
    );
    process.stdout.write(
      `  ${COLORS.dim}Current: v${updateInfo.currentVersion} ${SYMBOLS.arrow} Latest: v${updateInfo.latestVersion}${COLORS.reset}\n\n`,
    );

    rl.question(
      `  ${COLORS.brightBlue}?${COLORS.reset} Update ${PACKAGE_NAME} now? (Y/n): `,
      (answer) => {
        rl.close();
        const normalized = answer.trim().toLowerCase();
        resolve(
          normalized === "" || normalized === "y" || normalized === "yes",
        );
      },
    );
  });
}

async function performUpdate() {
  const spin = ui.spinner("Updating turl-release...");
  spin.start();

  try {
    execSync(`npm install -g ${PACKAGE_NAME}@latest`, { stdio: "pipe" });
    spin.stop("Update complete! Please restart turl-release.", true);
    return true;
  } catch (err) {
    spin.stop(`Update failed: ${err.message}`, false);
    return false;
  }
}

function parseArgs() {
  const options = {
    branch: null,
    skipUpdate: false,
    interactive: false,
    verbose: false,
    dryRun: false,
    command: null,
    commandArgs: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--branch" || arg === "-b") {
      options.branch = args[i + 1];
      i++;
    } else if (arg.startsWith("--branch=")) {
      options.branch = arg.split("=")[1];
    } else if (arg === "--skip-update" || arg === "-s") {
      options.skipUpdate = true;
    } else if (arg === "--interactive" || arg === "-i") {
      options.interactive = true;
    } else if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    } else if (arg === "--dry-run" || arg === "-d") {
      options.dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg === "init") {
      options.command = "init";
      break;
    } else if (arg === "sync") {
      options.command = "sync";
      break;
    } else if (arg === "analyze") {
      options.command = "analyze";
      options.commandArgs = args.slice(i + 1);
      break;
    } else if (arg === "learn" || arg === "add-rule") {
      options.command = "learn";
      options.commandArgs = args.slice(i + 1);
      break;
    } else if (arg === "rules" || arg === "list-rules") {
      options.command = "rules";
      break;
    } else if (arg === "forget" || arg === "remove-rule") {
      options.command = "forget";
      options.commandArgs = args.slice(i + 1);
      break;
    } else if (arg === "_post-commit") {
      options.command = "_post-commit";
      break;
    } else if (arg === "--quiet" || arg === "-q") {
      options.quiet = true;
    }
  }

  return options;
}

function printHelp() {
  process.stdout.write(`
${ui.header()}

  ${COLORS.bright}Usage:${COLORS.reset} turl-release [command] [options]

  ${COLORS.bright}Commands:${COLORS.reset}
    ${COLORS.brightBlue}init${COLORS.reset}                  Set up automatic learning (git hooks + Copilot sync)
    ${COLORS.brightBlue}analyze${COLORS.reset}               Learn from your git history (past commits)
    ${COLORS.brightBlue}sync${COLORS.reset}                  Sync rules to .github/copilot-instructions.md
    ${COLORS.brightBlue}rules${COLORS.reset}                 List all project rules
    ${COLORS.brightBlue}learn <rule>${COLORS.reset}          Manually add a rule
    ${COLORS.brightBlue}forget <number>${COLORS.reset}       Remove a rule by number

  ${COLORS.bright}Options:${COLORS.reset}
    ${COLORS.brightBlue}-b, --branch <name>${COLORS.reset}   Override branch to push to
    ${COLORS.brightBlue}-s, --skip-update${COLORS.reset}    Skip update check
    ${COLORS.brightBlue}-i, --interactive${COLORS.reset}    Interactive mode
    ${COLORS.brightBlue}-d, --dry-run${COLORS.reset}        Preview without changes
    ${COLORS.brightBlue}-h, --help${COLORS.reset}           Show this help

  ${COLORS.bright}Quick Start (run once per project):${COLORS.reset}
    ${COLORS.brightBlue}turl-release init${COLORS.reset}     Sets up automatic learning

  ${COLORS.bright}How Automatic Learning Works:${COLORS.reset}
    ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} ${COLORS.bright}Git hooks:${COLORS.reset} Learns from every commit automatically
    ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} ${COLORS.bright}Copilot sync:${COLORS.reset} Rules auto-sync to .github/copilot-instructions.md
    ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} ${COLORS.bright}History analysis:${COLORS.reset} Run "analyze" to learn from past commits
    ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} ${COLORS.bright}Release checks:${COLORS.reset} Warns before committing rule violations

`);
}

async function interactiveMenu() {
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) =>
    new Promise((resolve) => rl.question(prompt, resolve));

  process.stdout.write(
    `\n  ${COLORS.bright}${COLORS.brightBlue}Interactive Mode${COLORS.reset}\n`,
  );
  process.stdout.write(`  ${ui.divider()}\n\n`);

  const options = {
    branch: null,
    skipBuild: false,
    skipFormat: false,
    skipRulesCheck: false,
  };

  const branchAnswer = await question(
    `  ${COLORS.brightBlue}?${COLORS.reset} Branch to push to (leave empty for default): `,
  );
  if (branchAnswer.trim()) options.branch = branchAnswer.trim();

  const buildAnswer = await question(
    `  ${COLORS.brightBlue}?${COLORS.reset} Run production build? (Y/n): `,
  );
  options.skipBuild = buildAnswer.trim().toLowerCase() === "n";

  const formatAnswer = await question(
    `  ${COLORS.brightBlue}?${COLORS.reset} Run code formatter? (Y/n): `,
  );
  options.skipFormat = formatAnswer.trim().toLowerCase() === "n";

  const rulesAnswer = await question(
    `  ${COLORS.brightBlue}?${COLORS.reset} Check project rules before commit? (Y/n): `,
  );
  options.skipRulesCheck = rulesAnswer.trim().toLowerCase() === "n";

  rl.close();
  return options;
}

const ErrorCodes = {
  GIT_NOT_INSTALLED: "GIT_NOT_INSTALLED",
  GIT_NOT_INITIALIZED: "GIT_NOT_INITIALIZED",
  GIT_NO_REMOTE: "GIT_NO_REMOTE",
  GIT_UNCOMMITTED_CHANGES: "GIT_UNCOMMITTED_CHANGES",
  GIT_COMMIT_FAILED: "GIT_COMMIT_FAILED",
  GIT_PUSH_FAILED: "GIT_PUSH_FAILED",
  API_KEY_MISSING: "API_KEY_MISSING",
  API_KEY_INVALID: "API_KEY_INVALID",
  API_NETWORK_ERROR: "API_NETWORK_ERROR",
  API_RATE_LIMITED: "API_RATE_LIMITED",
  API_SERVER_ERROR: "API_SERVER_ERROR",
  API_RESPONSE_INVALID: "API_RESPONSE_INVALID",
  FILE_READ_ERROR: "FILE_READ_ERROR",
  FILE_WRITE_ERROR: "FILE_WRITE_ERROR",
  FILE_PERMISSION_DENIED: "FILE_PERMISSION_DENIED",
  PACKAGE_JSON_MISSING: "PACKAGE_JSON_MISSING",
  PACKAGE_JSON_INVALID: "PACKAGE_JSON_INVALID",
  VERSION_JSON_INVALID: "VERSION_JSON_INVALID",
  BUILD_FAILED: "BUILD_FAILED",
  FORMATTER_FAILED: "FORMATTER_FAILED",
  PRETTIER_NOT_INSTALLED: "PRETTIER_NOT_INSTALLED",
  NODE_MODULES_MISSING: "NODE_MODULES_MISSING",
  ENV_FILE_MISSING: "ENV_FILE_MISSING",
  CLEANUP_FAILED: "CLEANUP_FAILED",
  RULES_VIOLATION: "RULES_VIOLATION",
};

class TurlError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = "TurlError";
    this.code = code;
    this.details = details;
  }
}

function checkGitInstalled() {
  try {
    execSync("git --version", { stdio: "pipe" });
    return true;
  } catch {
    throw new TurlError(
      "Git is not installed or not in PATH",
      ErrorCodes.GIT_NOT_INSTALLED,
      { suggestion: "Install git from https://git-scm.com/downloads" },
    );
  }
}

function checkGitRepository() {
  try {
    execSync("git rev-parse --git-dir", { cwd: PROJECT_ROOT, stdio: "pipe" });
    return true;
  } catch {
    throw new TurlError(
      "Not a git repository",
      ErrorCodes.GIT_NOT_INITIALIZED,
      {
        path: PROJECT_ROOT,
        suggestion: "Run 'git init' to initialize a git repository",
      },
    );
  }
}

function checkGitRemote() {
  try {
    const remotes = execSync("git remote", {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      stdio: "pipe",
    });
    if (!remotes.trim()) {
      throw new TurlError(
        "No git remote configured",
        ErrorCodes.GIT_NO_REMOTE,
        { suggestion: "Run 'git remote add origin <url>' to add a remote" },
      );
    }
    return true;
  } catch (err) {
    if (err instanceof TurlError) throw err;
    throw new TurlError(
      "Failed to check git remotes",
      ErrorCodes.GIT_NO_REMOTE,
      { originalError: err.message },
    );
  }
}

function checkNodeModules() {
  const nodeModulesPath = path.join(PROJECT_ROOT, "node_modules");
  if (!fs.existsSync(nodeModulesPath)) {
    return {
      exists: false,
      warning:
        "node_modules not found. Run 'npm install' first if you need dependencies.",
    };
  }
  return { exists: true };
}

function checkPrettierInstalled() {
  const nodeModulesPath = path.join(PROJECT_ROOT, "node_modules");
  const prettierPath = path.join(nodeModulesPath, "prettier");
  const globalCheck = () => {
    try {
      execSync("npx prettier --version", { cwd: PROJECT_ROOT, stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  };

  if (fs.existsSync(prettierPath)) {
    return { installed: true, location: "local" };
  }

  if (globalCheck()) {
    return { installed: true, location: "global" };
  }

  return {
    installed: false,
    warning:
      "Prettier not installed. Install with 'npm install --save-dev prettier' for code formatting.",
  };
}

function safeReadFile(filePath, description = "file") {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new TurlError(
        `${description} not found: ${filePath}`,
        ErrorCodes.FILE_READ_ERROR,
        { path: filePath },
      );
    }
    if (err.code === "EACCES") {
      throw new TurlError(
        `Permission denied reading ${description}: ${filePath}`,
        ErrorCodes.FILE_PERMISSION_DENIED,
        { path: filePath },
      );
    }
    throw new TurlError(
      `Failed to read ${description}: ${err.message}`,
      ErrorCodes.FILE_READ_ERROR,
      { path: filePath, originalError: err.message },
    );
  }
}

function safeWriteFile(filePath, content, description = "file") {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, "utf-8");
  } catch (err) {
    if (err.code === "EACCES") {
      throw new TurlError(
        `Permission denied writing ${description}: ${filePath}`,
        ErrorCodes.FILE_PERMISSION_DENIED,
        { path: filePath },
      );
    }
    if (err.code === "ENOSPC") {
      throw new TurlError(
        `No disk space left to write ${description}: ${filePath}`,
        ErrorCodes.FILE_WRITE_ERROR,
        { path: filePath },
      );
    }
    if (err.code === "EROFS") {
      throw new TurlError(
        `Read-only file system, cannot write ${description}: ${filePath}`,
        ErrorCodes.FILE_WRITE_ERROR,
        { path: filePath },
      );
    }
    throw new TurlError(
      `Failed to write ${description}: ${err.message}`,
      ErrorCodes.FILE_WRITE_ERROR,
      { path: filePath, originalError: err.message },
    );
  }
}

function safeParseJson(content, filePath, description = "JSON file") {
  try {
    return JSON.parse(content);
  } catch (err) {
    throw new TurlError(
      `Invalid JSON in ${description}: ${err.message}`,
      ErrorCodes.VERSION_JSON_INVALID,
      { path: filePath, originalError: err.message },
    );
  }
}

function loadEnvFromPath(envPath) {
  if (!fs.existsSync(envPath)) {
    return false;
  }

  const envContent = fs.readFileSync(envPath, "utf-8");
  const lines = envContent.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const equalsIndex = trimmed.indexOf("=");
      if (equalsIndex !== -1) {
        const key = trimmed.substring(0, equalsIndex).trim();
        let value = trimmed.substring(equalsIndex + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (key) {
          process.env[key] = value;
        }
      }
    }
  }

  return true;
}

function loadEnv() {
  const projectEnvPath = path.join(PROJECT_ROOT, ".env");
  const projectEnvLoaded = loadEnvFromPath(projectEnvPath);

  if (
    projectEnvLoaded &&
    (process.env.GROK_API_KEY || process.env.REACT_APP_GROK_API_KEY)
  ) {
    return "project";
  }

  return null;
}

function getApiKey() {
  return process.env.GROK_API_KEY || process.env.REACT_APP_GROK_API_KEY || null;
}

function validateApiKey(apiKey) {
  if (!apiKey) {
    throw new TurlError(
      "GROK_API_KEY not found. Add GROK_API_KEY=your-key to your project's .env file",
      ErrorCodes.API_KEY_MISSING,
      {
        suggestion:
          "Create a .env file in your project root with: GROK_API_KEY=xai-your-key-here",
        helpUrl: "https://console.x.ai",
      },
    );
  }

  if (!apiKey.startsWith("xai-") && !apiKey.startsWith("sk-")) {
    throw new TurlError(
      "Invalid API key format. Key should start with 'xai-' or 'sk-'",
      ErrorCodes.API_KEY_INVALID,
      {
        suggestion: "Check your API key at https://console.x.ai",
        keyPrefix: apiKey.substring(0, 4) + "...",
      },
    );
  }

  if (apiKey.length < 20) {
    throw new TurlError(
      "API key appears to be too short",
      ErrorCodes.API_KEY_INVALID,
      { suggestion: "Verify your API key at https://console.x.ai" },
    );
  }

  return true;
}

function readTurlConfig() {
  const turlPath = path.join(PROJECT_ROOT, "public", "turl.json");

  const defaultConfig = {
    version: "1.0",
    projectName: path.basename(PROJECT_ROOT),
    branch: "main",
  };

  if (!fs.existsSync(turlPath)) {
    const publicDir = path.join(PROJECT_ROOT, "public");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    safeWriteFile(
      turlPath,
      JSON.stringify(defaultConfig, null, 2),
      "turl.json",
    );
    return defaultConfig;
  }

  const content = safeReadFile(turlPath, "turl.json");
  const parsed = safeParseJson(content, turlPath, "turl.json");

  return {
    version: String(parsed.version || defaultConfig.version),
    projectName: parsed.projectName || defaultConfig.projectName,
    branch: parsed.branch || defaultConfig.branch,
  };
}

function incrementVersion(version) {
  const parts = version.split(".");
  let major = parseInt(parts[0], 10) || 1;
  let minor = parseInt(parts[1], 10) || 0;

  minor++;
  if (minor >= 10) {
    major++;
    minor = 0;
  }

  return `${major}.${minor}`;
}

function updatePackageJsonVersion(newVersion) {
  const packageJsonPath = path.join(PROJECT_ROOT, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    return { updated: false, reason: "package.json not found" };
  }

  try {
    const content = safeReadFile(packageJsonPath, "package.json");
    const packageJson = safeParseJson(content, packageJsonPath, "package.json");

    const semverVersion =
      newVersion.includes(".") && newVersion.split(".").length === 2
        ? `${newVersion}.0`
        : newVersion;

    if (packageJson.version === semverVersion) {
      return { updated: false, reason: "version already matches" };
    }

    packageJson.version = semverVersion;
    safeWriteFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + "\n",
      "package.json",
    );

    return {
      updated: true,
      oldVersion: content.match(/"version":\s*"([^"]+)"/)?.[1],
      newVersion: semverVersion,
    };
  } catch (err) {
    return { updated: false, reason: err.message };
  }
}

function writeTurlConfig(config) {
  const turlPath = path.join(PROJECT_ROOT, "public", "turl.json");
  safeWriteFile(turlPath, JSON.stringify(config, null, 2) + "\n", "turl.json");

  return updatePackageJsonVersion(config.version);
}

function execCommand(command, options = {}) {
  try {
    return execSync(command, {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      stdio: options.silent ? "pipe" : "inherit",
      ...options,
    });
  } catch (err) {
    if (options.ignoreError) {
      return err.stdout || "";
    }
    throw err;
  }
}

function execCommandSilent(command) {
  try {
    return execSync(command, {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      stdio: "pipe",
    });
  } catch (err) {
    return err.stdout || err.stderr || "";
  }
}

function hasChanges() {
  const status = execCommandSilent("git status --porcelain");
  return status.trim().length > 0;
}

function getGitDiff(excludeTurlJson = false) {
  if (excludeTurlJson) {
    const diff = execCommandSilent(
      "git diff HEAD -- . ':(exclude)public/turl.json'",
    );
    const stagedDiff = execCommandSilent(
      "git diff --cached -- . ':(exclude)public/turl.json'",
    );
    return diff + stagedDiff;
  }
  const diff = execCommandSilent("git diff HEAD");
  const stagedDiff = execCommandSilent("git diff --cached");
  return diff + stagedDiff;
}

function getGitDiffStat(excludeTurlJson = false) {
  if (excludeTurlJson) {
    const stat = execCommandSilent(
      "git diff HEAD --stat -- . ':(exclude)public/turl.json'",
    );
    const stagedStat = execCommandSilent(
      "git diff --cached --stat -- . ':(exclude)public/turl.json'",
    );
    return stat + stagedStat;
  }
  const stat = execCommandSilent("git diff HEAD --stat");
  const stagedStat = execCommandSilent("git diff --cached --stat");
  return stat + stagedStat;
}

function getChangedFiles(excludeTurlJson = false) {
  const files = execCommandSilent("git diff HEAD --name-only");
  const stagedFiles = execCommandSilent("git diff --cached --name-only");
  const combined = files + stagedFiles;
  let fileList = [...new Set(combined.split("\n").filter(Boolean))];

  if (excludeTurlJson) {
    fileList = fileList.filter(
      (f) => f !== "public/turl.json" && f !== "turl.json",
    );
  }

  return fileList;
}

async function callGrokApi(apiKey, prompt) {
  let response;

  try {
    response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-3-latest",
        messages: [
          {
            role: "system",
            content:
              "You are a precise technical assistant that generates changelog entries and commit messages. You ONLY describe changes that are explicitly visible in the provided diff. Never invent or assume changes. Be specific and accurate.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });
  } catch (err) {
    if (err.code === "ENOTFOUND" || err.code === "EAI_AGAIN") {
      throw new TurlError(
        "Network error: Unable to reach Grok API. Check your internet connection.",
        ErrorCodes.API_NETWORK_ERROR,
        { originalError: err.message },
      );
    }
    if (err.code === "ETIMEDOUT" || err.code === "ESOCKETTIMEDOUT") {
      throw new TurlError(
        "Network timeout: Grok API request timed out. Try again later.",
        ErrorCodes.API_NETWORK_ERROR,
        { originalError: err.message },
      );
    }
    if (err.code === "ECONNREFUSED") {
      throw new TurlError(
        "Connection refused: Unable to connect to Grok API.",
        ErrorCodes.API_NETWORK_ERROR,
        { originalError: err.message },
      );
    }
    throw new TurlError(
      `Network error calling Grok API: ${err.message}`,
      ErrorCodes.API_NETWORK_ERROR,
      { originalError: err.message },
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText };
    }

    if (response.status === 401 || response.status === 400) {
      if (
        errorText.includes("invalid argument") ||
        errorText.includes("Invalid API key") ||
        errorText.includes("Incorrect API key")
      ) {
        throw new TurlError(
          "Invalid API key. Please check your GROK_API_KEY in .env file.",
          ErrorCodes.API_KEY_INVALID,
          {
            status: response.status,
            suggestion: "Get a valid API key from https://console.x.ai",
            response: errorData,
          },
        );
      }
    }

    if (response.status === 429) {
      throw new TurlError(
        "Rate limited by Grok API. Please wait and try again.",
        ErrorCodes.API_RATE_LIMITED,
        {
          status: response.status,
          suggestion: "Wait a few minutes before trying again",
          response: errorData,
        },
      );
    }

    if (response.status >= 500) {
      throw new TurlError(
        "Grok API server error. The service may be temporarily unavailable.",
        ErrorCodes.API_SERVER_ERROR,
        {
          status: response.status,
          suggestion: "Try again in a few minutes",
          response: errorData,
        },
      );
    }

    throw new TurlError(
      `Grok API error: ${response.status} - ${errorText}`,
      ErrorCodes.API_SERVER_ERROR,
      { status: response.status, response: errorData },
    );
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new TurlError(
      "Invalid JSON response from Grok API",
      ErrorCodes.API_RESPONSE_INVALID,
      { originalError: err.message },
    );
  }

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new TurlError(
      "Unexpected response format from Grok API",
      ErrorCodes.API_RESPONSE_INVALID,
      { response: data },
    );
  }

  return data.choices[0].message.content || "";
}

async function generateChangelog(
  apiKey,
  newVersion,
  projectName,
  diff,
  stat,
  changedFiles,
) {
  const today = new Date().toISOString().split("T")[0];

  if (!diff.trim()) {
    throw new TurlError(
      "No diff available to generate changelog",
      ErrorCodes.API_RESPONSE_INVALID,
      { suggestion: "Make sure there are actual code changes to release" },
    );
  }

  const truncatedDiff =
    diff.length > 8000 ? diff.substring(0, 8000) + "\n... (truncated)" : diff;

  const prompt = `Generate a changelog entry for ${projectName} version ${newVersion}.

RULES:
1. ONLY describe changes that are EXPLICITLY visible in the diff below
2. Do NOT invent or assume any changes not shown in the diff
3. Write in a natural, human-friendly tone - like a developer explaining what they did
4. Be specific - mention actual features, fixes, or improvements by name
5. Group related changes together logically
6. Use bullet points starting with "-"
7. Include ALL meaningful changes visible in the diff
8. Keep it concise but complete
9. Do NOT use any emojis
10. Do NOT mention version bumps, version file updates, or turl.json changes
11. Focus on what actually changed in the code, not metadata

Changed files: ${changedFiles.join(", ")}

Diff statistics:
${stat}

Actual diff:
${truncatedDiff}

Output format (EXACTLY):
## [${newVersion}] - ${today}

- First change (written naturally)
- Second change
- (as many as needed)`;

  const response = await callGrokApi(apiKey, prompt);

  if (!response || !response.includes(`## [${newVersion}]`)) {
    throw new TurlError(
      "Grok API returned invalid changelog format",
      ErrorCodes.API_RESPONSE_INVALID,
      {
        response: response ? response.substring(0, 200) : "empty",
        suggestion: "The AI response did not match expected format",
      },
    );
  }

  return response.trim() + "\n";
}

async function generateCommitMessage(
  apiKey,
  newVersion,
  projectName,
  diff,
  stat,
  changedFiles,
) {
  const firstLine = `${projectName}: Release v${newVersion}`;

  if (!diff.trim()) {
    throw new TurlError(
      "No diff available to generate commit message",
      ErrorCodes.API_RESPONSE_INVALID,
      { suggestion: "Make sure there are actual code changes to commit" },
    );
  }

  const truncatedDiff =
    diff.length > 8000 ? diff.substring(0, 8000) + "\n... (truncated)" : diff;

  const prompt = `Generate a git commit message for ${projectName} version ${newVersion}.

CRITICAL RULES:
1. The FIRST line MUST be EXACTLY: "${projectName}: Release v${newVersion}"
2. The SECOND line MUST be blank
3. Then bullet points of changes starting with "-"
4. ONLY describe changes that are EXPLICITLY visible in the diff below
5. Do NOT invent or assume any changes not shown in the diff
6. Write in a natural, human-friendly tone
7. Be specific about what actually changed
8. Group related changes together
9. Include ALL meaningful changes visible in the diff
10. Do NOT use any emojis
11. Do NOT mention version bumps, version file updates, or turl.json changes
12. Focus on actual code changes, not metadata

Changed files: ${changedFiles.join(", ")}

Diff statistics:
${stat}

Actual diff:
${truncatedDiff}

Output format (EXACTLY):
${projectName}: Release v${newVersion}

- First change (written naturally)
- Second change
- (as many as needed)`;

  const response = await callGrokApi(apiKey, prompt);

  if (!response) {
    throw new TurlError(
      "Grok API returned empty commit message",
      ErrorCodes.API_RESPONSE_INVALID,
      { suggestion: "The AI did not generate a valid response" },
    );
  }

  if (response.startsWith(`${projectName}: Release v${newVersion}`)) {
    return response.trim();
  }

  if (response.includes("-")) {
    return `${firstLine}\n\n${response.trim()}`;
  }

  throw new TurlError(
    "Grok API returned invalid commit message format",
    ErrorCodes.API_RESPONSE_INVALID,
    {
      response: response.substring(0, 200),
      suggestion: "The AI response did not match expected format",
    },
  );
}

function updateChangelog(changelogEntry) {
  const changelogPath = path.join(PROJECT_ROOT, "CHANGELOG.md");
  let existingContent = "";

  if (fs.existsSync(changelogPath)) {
    existingContent = safeReadFile(changelogPath, "CHANGELOG.md");
  }

  const header =
    "# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n";

  if (!existingContent) {
    safeWriteFile(
      changelogPath,
      header + changelogEntry + "\n",
      "CHANGELOG.md",
    );
    return;
  }

  if (existingContent.startsWith("# Changelog")) {
    const headerEndIndex = existingContent.indexOf(
      "\n\n",
      existingContent.indexOf("\n") + 1,
    );
    if (headerEndIndex !== -1) {
      const existingHeader = existingContent.substring(0, headerEndIndex + 2);
      const existingEntries = existingContent.substring(headerEndIndex + 2);
      safeWriteFile(
        changelogPath,
        existingHeader + changelogEntry + "\n" + existingEntries,
        "CHANGELOG.md",
      );
      return;
    }
  }

  safeWriteFile(
    changelogPath,
    header + changelogEntry + "\n" + existingContent,
    "CHANGELOG.md",
  );
}

const COPILOT_INSTRUCTIONS_PATH = path.join(
  PROJECT_ROOT,
  ".github",
  "copilot-instructions.md",
);

const TURL_SECTION_START = "<!-- TURL-RULES-START -->";
const TURL_SECTION_END = "<!-- TURL-RULES-END -->";

function readTurlRules() {
  if (!fs.existsSync(COPILOT_INSTRUCTIONS_PATH)) {
    return { rules: [], rawContent: "" };
  }

  const content = safeReadFile(
    COPILOT_INSTRUCTIONS_PATH,
    "copilot-instructions.md",
  );

  const startIdx = content.indexOf(TURL_SECTION_START);
  const endIdx = content.indexOf(TURL_SECTION_END);

  if (startIdx === -1 || endIdx === -1) {
    return { rules: [], rawContent: content };
  }

  const sectionContent = content.slice(
    startIdx + TURL_SECTION_START.length,
    endIdx,
  );
  const lines = sectionContent.split("\n");
  const rules = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      const cleanedRule = trimmed.slice(2).trim();
      if (cleanedRule && !cleanedRule.startsWith("_")) {
        rules.push(cleanedRule);
      }
    }
  }

  return { rules, rawContent: content };
}

function formatRule(rule) {
  let formatted = rule
    .replace(/^[-*]\s*/, "")
    .trim()
    .replace(/\s+/g, " ");

  if (!formatted) return "";

  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);

  if (!/[.!?]$/.test(formatted)) {
    formatted += ".";
  }

  return formatted;
}

function normalizeForComparison(rule) {
  return rule
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function deduplicateRules(rules) {
  const seen = new Map();
  const result = [];

  for (const rule of rules) {
    const normalized = normalizeForComparison(rule);
    if (!normalized) continue;

    if (!seen.has(normalized)) {
      seen.set(normalized, true);
      result.push(rule);
    }
  }

  return result;
}

function writeTurlRules(rules) {
  const githubDir = path.join(PROJECT_ROOT, ".github");
  if (!fs.existsSync(githubDir)) {
    fs.mkdirSync(githubDir, { recursive: true });
  }

  const formattedRules = rules.map(formatRule).filter(Boolean);
  const dedupedRules = deduplicateRules(formattedRules);

  let existingContent = "";
  if (fs.existsSync(COPILOT_INSTRUCTIONS_PATH)) {
    existingContent = fs.readFileSync(COPILOT_INSTRUCTIONS_PATH, "utf-8");
  }

  const rulesMarkdown =
    dedupedRules.length > 0
      ? dedupedRules.map((r) => `- ${r}`).join("\n")
      : "_No rules defined yet._";

  const turlSection = `${TURL_SECTION_START}
## Project Rules (Auto-managed by TURL)

These rules are automatically learned from project commits and enforced during releases.
Do not edit this section manually - it will be overwritten.

${rulesMarkdown}
${TURL_SECTION_END}`;

  let newContent;

  if (existingContent.includes(TURL_SECTION_START)) {
    const regex = new RegExp(
      `${TURL_SECTION_START}[\\s\\S]*?${TURL_SECTION_END}`,
      "g",
    );
    newContent = existingContent.replace(regex, turlSection);
  } else if (existingContent.trim()) {
    newContent = existingContent.trim() + "\n\n" + turlSection + "\n";
  } else {
    newContent = `# Copilot Instructions

This file provides context to GitHub Copilot for this project.

${turlSection}
`;
  }

  fs.writeFileSync(COPILOT_INSTRUCTIONS_PATH, newContent, "utf-8");
}

function appendTurlRule(newRule) {
  const { rules } = readTurlRules();
  const formattedNew = formatRule(newRule);

  if (!formattedNew) return false;

  const normalizedNew = normalizeForComparison(formattedNew);
  const isDuplicate = rules.some(
    (existing) => normalizeForComparison(existing) === normalizedNew,
  );

  if (!isDuplicate) {
    rules.push(formattedNew);
    writeTurlRules(rules);
    return true;
  }
  return false;
}

function removeTurlRule(ruleNumber) {
  const { rules } = readTurlRules();
  const index = ruleNumber - 1;

  if (index < 0 || index >= rules.length) {
    return { success: false, error: `Rule #${ruleNumber} does not exist` };
  }

  const removedRule = rules[index];
  rules.splice(index, 1);
  writeTurlRules(rules);
  return { success: true, removedRule };
}

async function handleLearnCommand(commandArgs) {
  process.stdout.write(ui.header());

  const rule = commandArgs.join(" ").trim();

  if (!rule) {
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    process.stdout.write(
      `\n  ${COLORS.bright}Add a Rule from Copilot Chat${COLORS.reset}\n`,
    );
    process.stdout.write(`  ${ui.divider()}\n\n`);
    process.stdout.write(
      `  ${COLORS.dim}What did you learn? (e.g., "Always use early returns")${COLORS.reset}\n\n`,
    );

    const answer = await new Promise((resolve) => {
      rl.question(
        `  ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} `,
        resolve,
      );
    });
    rl.close();

    if (!answer.trim()) {
      process.stdout.write(
        `\n  ${COLORS.brightRed}${SYMBOLS.cross}${COLORS.reset} No rule provided. Cancelled.\n\n`,
      );
      process.exit(0);
    }

    const formattedRule = formatRule(answer.trim());
    const added = appendTurlRule(answer.trim());
    if (added) {
      process.stdout.write(
        `\n  ${COLORS.brightWhite}${SYMBOLS.check}${COLORS.reset} Rule added to copilot-instructions.md:\n`,
      );
      process.stdout.write(
        `  ${COLORS.dim}"${formattedRule}"${COLORS.reset}\n\n`,
      );
    } else {
      process.stdout.write(
        `\n  ${COLORS.brightRed}${SYMBOLS.warning}${COLORS.reset} Rule already exists or is invalid.\n\n`,
      );
    }
    return;
  }

  const formattedRule = formatRule(rule);
  const added = appendTurlRule(rule);
  if (added) {
    process.stdout.write(
      `\n  ${COLORS.brightWhite}${SYMBOLS.check}${COLORS.reset} Rule added to copilot-instructions.md:\n`,
    );
    process.stdout.write(
      `  ${COLORS.dim}"${formattedRule}"${COLORS.reset}\n\n`,
    );
  } else {
    process.stdout.write(
      `\n  ${COLORS.brightRed}${SYMBOLS.warning}${COLORS.reset} Rule already exists or is invalid.\n\n`,
    );
  }
}

function handleRulesCommand() {
  process.stdout.write(ui.header());

  const { rules } = readTurlRules();

  if (!rules.length) {
    process.stdout.write(
      `\n  ${COLORS.dim}No rules defined yet.${COLORS.reset}\n`,
    );
    process.stdout.write(
      `  ${COLORS.dim}Rules are learned automatically from commits, or add manually:${COLORS.reset}\n`,
    );
    process.stdout.write(
      `  ${COLORS.brightBlue}turl-release learn "Your rule here"${COLORS.reset}\n\n`,
    );
    return;
  }

  const BOX_WIDTH = 84;

  process.stdout.write(`\n`);
  process.stdout.write(
    `  ${COLORS.brightBlue}${COLORS.bright}┌${"─".repeat(BOX_WIDTH - 2)}┐${COLORS.reset}\n`,
  );
  process.stdout.write(
    `  ${COLORS.brightBlue}${COLORS.bright}│${COLORS.reset}  ${COLORS.bright}PROJECT RULES${COLORS.reset} ${COLORS.dim}(${rules.length} total)${COLORS.reset}${" ".repeat(BOX_WIDTH - 24 - String(rules.length).length)}${COLORS.brightBlue}${COLORS.bright}│${COLORS.reset}\n`,
  );
  process.stdout.write(
    `  ${COLORS.brightBlue}${COLORS.bright}├${"─".repeat(BOX_WIDTH - 2)}┤${COLORS.reset}\n`,
  );

  const wrapText = (text, maxWidth) => {
    const words = text.split(" ");
    const lines = [];
    let currentLine = "";
    for (const word of words) {
      if ((currentLine + " " + word).trim().length <= maxWidth) {
        currentLine = (currentLine + " " + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine =
          word.length > maxWidth ? word.substring(0, maxWidth) : word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const num = `${i + 1}.`;
    const ruleLines = wrapText(rule, BOX_WIDTH - 10);

    process.stdout.write(
      `  ${COLORS.brightBlue}${COLORS.bright}│${COLORS.reset}${" ".repeat(BOX_WIDTH - 2)}${COLORS.brightBlue}${COLORS.bright}│${COLORS.reset}\n`,
    );

    const firstLine = ruleLines[0] || "";
    const firstLinePadding = BOX_WIDTH - num.length - firstLine.length - 6;
    process.stdout.write(
      `  ${COLORS.brightBlue}${COLORS.bright}│${COLORS.reset}  ${COLORS.brightBlue}${num}${COLORS.reset} ${firstLine}${" ".repeat(Math.max(0, firstLinePadding))}${COLORS.brightBlue}${COLORS.bright}│${COLORS.reset}\n`,
    );

    for (let j = 1; j < ruleLines.length; j++) {
      const line = ruleLines[j];
      const padding = BOX_WIDTH - line.length - 7;
      process.stdout.write(
        `  ${COLORS.brightBlue}${COLORS.bright}│${COLORS.reset}     ${COLORS.dim}${line}${COLORS.reset}${" ".repeat(Math.max(0, padding))}${COLORS.brightBlue}${COLORS.bright}│${COLORS.reset}\n`,
      );
    }
  }

  process.stdout.write(
    `  ${COLORS.brightBlue}${COLORS.bright}│${COLORS.reset}${" ".repeat(BOX_WIDTH - 2)}${COLORS.brightBlue}${COLORS.bright}│${COLORS.reset}\n`,
  );
  process.stdout.write(
    `  ${COLORS.brightBlue}${COLORS.bright}└${"─".repeat(BOX_WIDTH - 2)}┘${COLORS.reset}\n`,
  );

  process.stdout.write(`\n  ${COLORS.dim}Commands:${COLORS.reset}\n`);
  process.stdout.write(
    `  ${COLORS.brightBlue}turl-release learn "rule"${COLORS.reset}  ${COLORS.dim}Add a new rule${COLORS.reset}\n`,
  );
  process.stdout.write(
    `  ${COLORS.brightBlue}turl-release forget 3${COLORS.reset}      ${COLORS.dim}Remove rule #3${COLORS.reset}\n\n`,
  );
}

async function handleForgetCommand(commandArgs) {
  process.stdout.write(ui.header());

  const ruleNum = parseInt(commandArgs[0], 10);

  if (isNaN(ruleNum)) {
    const { rules } = readTurlRules();

    if (!rules.length) {
      process.stdout.write(
        `\n  ${COLORS.dim}No rules to remove.${COLORS.reset}\n\n`,
      );
      return;
    }

    process.stdout.write(
      `\n  ${COLORS.brightRed}${SYMBOLS.warning}${COLORS.reset} Specify a rule number to remove.\n\n`,
    );
    process.stdout.write(`  ${COLORS.bright}Current rules:${COLORS.reset}\n`);

    for (let i = 0; i < rules.length; i++) {
      const preview =
        rules[i].length > 60 ? rules[i].substring(0, 60) + "..." : rules[i];
      process.stdout.write(
        `  ${COLORS.brightBlue}${i + 1}.${COLORS.reset} ${COLORS.dim}${preview}${COLORS.reset}\n`,
      );
    }

    process.stdout.write(
      `\n  ${COLORS.dim}Usage: turl-release forget <number>${COLORS.reset}\n\n`,
    );
    return;
  }

  const result = removeTurlRule(ruleNum);

  if (result.success) {
    process.stdout.write(
      `\n  ${COLORS.brightWhite}${SYMBOLS.check}${COLORS.reset} Removed rule #${ruleNum}:\n`,
    );
    process.stdout.write(
      `  ${COLORS.dim}"${result.removedRule}"${COLORS.reset}\n\n`,
    );
  } else {
    process.stdout.write(
      `\n  ${COLORS.brightRed}${SYMBOLS.cross}${COLORS.reset} ${result.error}\n\n`,
    );
  }
}

const POST_COMMIT_HOOK_CONTENT = `#!/bin/sh
# TURL Auto-Learning Hook - learns from each commit
# Installed by turl-release init

# Run turl learning in background (non-blocking)
if command -v turl-release &> /dev/null; then
  (turl-release _post-commit &> /dev/null &)
fi
`;

const PRE_PUSH_HOOK_CONTENT = `#!/bin/sh
# TURL Pre-Push Hook - syncs rules to Copilot instructions
# Installed by turl-release init

if command -v turl-release &> /dev/null; then
  turl-release sync --quiet
fi
`;

function syncRulesToCopilotInstructions() {
  const { rules } = readTurlRules();
  writeTurlRules(rules);
  return { rulesCount: rules.length, path: COPILOT_INSTRUCTIONS_PATH };
}

function handleSyncCommand(quiet = false) {
  if (!quiet) {
    process.stdout.write(ui.header());
    process.stdout.write(
      `\n  ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} Syncing rules to Copilot instructions...\n`,
    );
  }

  const result = syncRulesToCopilotInstructions(quiet);

  if (!quiet) {
    process.stdout.write(
      `\n  ${COLORS.brightWhite}${SYMBOLS.check}${COLORS.reset} Synced ${result.rulesCount} rules to:\n`,
    );
    process.stdout.write(`  ${COLORS.dim}${result.path}${COLORS.reset}\n\n`);
    process.stdout.write(
      `  ${COLORS.dim}Copilot will now see your project rules when generating code.${COLORS.reset}\n\n`,
    );
  }
}

async function handleInitCommand() {
  process.stdout.write(ui.header());

  process.stdout.write(
    `\n  ${COLORS.bright}Setting up Automatic Learning${COLORS.reset}\n`,
  );
  process.stdout.write(`  ${ui.divider()}\n\n`);

  const hooksDir = path.join(PROJECT_ROOT, ".git", "hooks");

  if (fs.existsSync(hooksDir)) {
    const postCommitPath = path.join(hooksDir, "post-commit");
    const prePushPath = path.join(hooksDir, "pre-push");

    let postCommitContent = POST_COMMIT_HOOK_CONTENT;
    let prePushContent = PRE_PUSH_HOOK_CONTENT;

    if (fs.existsSync(postCommitPath)) {
      const existing = fs.readFileSync(postCommitPath, "utf-8");
      if (!existing.includes("turl-release")) {
        postCommitContent = existing.trim() + "\n\n" + POST_COMMIT_HOOK_CONTENT;
      } else {
        postCommitContent = existing;
      }
    }

    if (fs.existsSync(prePushPath)) {
      const existing = fs.readFileSync(prePushPath, "utf-8");
      if (!existing.includes("turl-release")) {
        prePushContent = existing.trim() + "\n\n" + PRE_PUSH_HOOK_CONTENT;
      } else {
        prePushContent = existing;
      }
    }

    fs.writeFileSync(postCommitPath, postCommitContent, { mode: 0o755 });
    fs.writeFileSync(prePushPath, prePushContent, { mode: 0o755 });

    process.stdout.write(
      `  ${COLORS.brightWhite}${SYMBOLS.check}${COLORS.reset} Git hooks installed\n`,
    );
    process.stdout.write(
      `    ${COLORS.dim}post-commit: Auto-learns from each commit${COLORS.reset}\n`,
    );
    process.stdout.write(
      `    ${COLORS.dim}pre-push: Syncs rules to Copilot${COLORS.reset}\n\n`,
    );
  } else {
    process.stdout.write(
      `  ${COLORS.brightRed}${SYMBOLS.warning}${COLORS.reset} No .git/hooks directory found\n`,
    );
    process.stdout.write(
      `    ${COLORS.dim}Initialize git first: git init${COLORS.reset}\n\n`,
    );
  }

  const { rules } = readTurlRules();
  if (!fs.existsSync(COPILOT_INSTRUCTIONS_PATH)) {
    writeTurlRules(rules);
    process.stdout.write(
      `  ${COLORS.brightWhite}${SYMBOLS.check}${COLORS.reset} Created .github/copilot-instructions.md\n\n`,
    );
  } else {
    process.stdout.write(
      `  ${COLORS.brightWhite}${SYMBOLS.check}${COLORS.reset} .github/copilot-instructions.md exists\n\n`,
    );
  }

  process.stdout.write(`  ${COLORS.bright}What happens now:${COLORS.reset}\n`);
  process.stdout.write(
    `  ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} Every commit ${SYMBOLS.arrow} TURL analyzes changes and learns patterns\n`,
  );
  process.stdout.write(
    `  ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} Every push ${SYMBOLS.arrow} Rules sync to Copilot instructions\n`,
  );
  process.stdout.write(
    `  ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} turl-release ${SYMBOLS.arrow} Checks rules before committing\n\n`,
  );

  process.stdout.write(
    `  ${COLORS.dim}Run "turl-release analyze" to learn from your git history.${COLORS.reset}\n\n`,
  );
}

async function handleAnalyzeCommand(commandArgs) {
  process.stdout.write(ui.header());

  process.stdout.write(
    `\n  ${COLORS.bright}Analyzing Git History${COLORS.reset}\n`,
  );
  process.stdout.write(`  ${ui.divider()}\n\n`);

  const commitCount = parseInt(commandArgs[0], 10) || 20;

  process.stdout.write(
    `  ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} Loading last ${commitCount} commits...\n`,
  );

  let commits;
  try {
    const log = execSync(
      `git log --oneline -${commitCount} --pretty=format:"%h|%s"`,
      {
        cwd: PROJECT_ROOT,
        encoding: "utf-8",
        stdio: "pipe",
      },
    );
    commits = log
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, ...msgParts] = line.split("|");
        return { hash, message: msgParts.join("|") };
      });
  } catch {
    process.stdout.write(
      `  ${COLORS.brightRed}${SYMBOLS.cross}${COLORS.reset} Could not read git history\n\n`,
    );
    return;
  }

  if (!commits.length) {
    process.stdout.write(
      `  ${COLORS.dim}No commits found in history.${COLORS.reset}\n\n`,
    );
    return;
  }

  process.stdout.write(
    `  ${COLORS.brightWhite}${SYMBOLS.check}${COLORS.reset} Found ${commits.length} commits\n\n`,
  );

  loadEnv();
  const apiKey = getApiKey();

  if (!apiKey) {
    process.stdout.write(
      `  ${COLORS.brightRed}${SYMBOLS.cross}${COLORS.reset} API key required for analysis\n`,
    );
    process.stdout.write(
      `  ${COLORS.dim}Add GROK_API_KEY to your .env file${COLORS.reset}\n\n`,
    );
    return;
  }

  process.stdout.write(
    `  ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} Analyzing commit patterns with AI...\n`,
  );

  const { rules: existingRules } = readTurlRules();

  const commitSummary = commits
    .map((c) => `- ${c.hash}: ${c.message}`)
    .join("\n");

  const prompt = `Analyze these git commits from a project and identify coding patterns, conventions, or lessons that should be remembered for future development.

COMMITS:
${commitSummary}

EXISTING RULES (do not duplicate):
${existingRules.length ? existingRules.map((r, i) => `${i + 1}. ${r}`).join("\n") : "(none)"}

INSTRUCTIONS:
1. Look for patterns in commit messages that suggest conventions (e.g., "fix:", "refactor:", patterns in naming)
2. Identify repeated types of fixes that suggest rules to prevent issues
3. Notice any structural patterns (file organization, naming conventions)
4. Only suggest rules that are:
   - Specific and actionable
   - Not already covered by existing rules
   - Based on clear evidence from the commits
5. Keep rules concise (one sentence each)

If no meaningful new rules can be identified, respond: NO_NEW_RULES

Output format:
RULE: [concise, actionable rule]
RULE: [another rule]
...`;

  try {
    const response = await callGrokApi(apiKey, prompt);

    if (!response || response.trim() === "NO_NEW_RULES") {
      process.stdout.write(
        `\n  ${COLORS.dim}No new patterns identified from commit history.${COLORS.reset}\n\n`,
      );
      return;
    }

    const newRules = [];
    const lines = response.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("RULE:")) {
        const rule = trimmed.replace("RULE:", "").trim();
        if (rule) newRules.push(rule);
      }
    }

    if (!newRules.length) {
      process.stdout.write(
        `\n  ${COLORS.dim}No new patterns identified from commit history.${COLORS.reset}\n\n`,
      );
      return;
    }

    process.stdout.write(
      `\n  ${COLORS.brightWhite}${SYMBOLS.check}${COLORS.reset} Found ${newRules.length} patterns:\n\n`,
    );

    let addedCount = 0;
    for (const rule of newRules) {
      const added = appendTurlRule(rule);
      if (added) {
        addedCount++;
        process.stdout.write(
          `  ${COLORS.brightBlue}+${COLORS.reset} ${rule}\n`,
        );
      } else {
        process.stdout.write(
          `  ${COLORS.dim}~ ${rule} (already exists)${COLORS.reset}\n`,
        );
      }
    }

    process.stdout.write(`\n`);

    if (addedCount > 0) {
      syncRulesToCopilotInstructions(true);
      process.stdout.write(
        `  ${COLORS.brightWhite}${SYMBOLS.check}${COLORS.reset} Added ${addedCount} new rules and synced to Copilot\n\n`,
      );
    }
  } catch (err) {
    process.stdout.write(
      `\n  ${COLORS.brightRed}${SYMBOLS.cross}${COLORS.reset} Analysis failed: ${err.message}\n\n`,
    );
  }
}

async function handlePostCommitHook() {
  loadEnv();
  const apiKey = getApiKey();
  if (!apiKey) return;

  try {
    const diff = execSync("git diff HEAD~1 HEAD", {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      stdio: "pipe",
      maxBuffer: 1024 * 1024,
    });

    if (!diff.trim()) return;

    const stat = execSync("git diff HEAD~1 HEAD --stat", {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      stdio: "pipe",
    });

    const changedFiles = execSync("git diff HEAD~1 HEAD --name-only", {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      stdio: "pipe",
    })
      .split("\n")
      .filter(Boolean);

    const { rules: existingRules } = readTurlRules();

    const newRules = await generateNewRules(
      apiKey,
      diff,
      stat,
      changedFiles,
      existingRules,
    );

    if (newRules.length > 0) {
      for (const rule of newRules) {
        appendTurlRule(rule);
      }
      syncRulesToCopilotInstructions(true);
    }
  } catch {
    // Silent fail for background hook
  }
}

async function checkRulesViolations(apiKey, diff, stat, changedFiles, rules) {
  if (!rules.length || !diff.trim()) {
    return { violations: [], passed: true };
  }

  const truncatedDiff =
    diff.length > 6000 ? diff.substring(0, 6000) + "\n... (truncated)" : diff;

  const rulesText = rules.map((r, i) => `${i + 1}. ${r}`).join("\n");

  const prompt = `You are analyzing code changes to determine if they ACTIVELY BREAK project guidelines.

PROJECT GUIDELINES (for context only - most will NOT apply):
${rulesText}

Changed files: ${changedFiles.join(", ")}
Diff statistics:
${stat}

Code diff:
${truncatedDiff}

ANALYSIS FRAMEWORK - Think step by step:

STEP 1: What is actually being changed in this diff?
- Identify the actual files modified and the nature of changes (new code, refactoring, fixes, etc.)

STEP 2: For each guideline, ask: "Does this diff INTRODUCE something that contradicts this guideline?"
- A guideline is ONLY violated if the diff ADDS code that directly contradicts it
- Guidelines about organization only apply if NEW files of that type are being created
- Guidelines about documentation are AUTOMATICALLY handled by this release tool
- Guidelines about consistency only apply if the changes BREAK existing patterns

STEP 3: Apply the "New Developer Test"
- If a new developer reviewed this diff, would they clearly see a rule being broken?
- If it requires speculation, assumption, or deep context to see a violation, it is NOT a violation

AUTOMATIC PASS CONDITIONS (respond NO_VIOLATIONS immediately if ANY apply):
- The diff is primarily updating existing patterns/code consistently
- The diff uses existing infrastructure (constants, utilities, components) from the codebase
- The changes are version bumps, changelog updates, or metadata changes
- The guideline is about "documenting" something (this tool handles documentation)
- The guideline requires subjective judgment ("enough", "sufficient", "comprehensive")
- The guideline is aspirational/best-practice rather than a hard rule
- You would need to see code NOT in the diff to determine a violation

VIOLATION THRESHOLD - ALL must be true:
1. The diff ADDS or MODIFIES code in a way that DIRECTLY contradicts a specific guideline
2. The violation is OBJECTIVELY verifiable from the diff alone (no assumptions)
3. A reasonable developer would agree this is a clear violation
4. The guideline is actionable for THIS specific change (not a general best practice)

If ANY doubt exists, respond: NO_VIOLATIONS

Output format (ONLY if 100% certain of clear violation):
VIOLATION: [Rule number] - [One sentence explaining what specific code in the diff breaks the rule]

Output format (default - use this unless absolutely certain):
NO_VIOLATIONS`;

  const response = await callGrokApi(apiKey, prompt);

  if (!response || response.trim() === "NO_VIOLATIONS") {
    return { violations: [], passed: true };
  }

  const violations = [];
  const lines = response.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("VIOLATION:")) {
      const violationText = trimmed.replace("VIOLATION:", "").trim();
      const ruleMatch = violationText.match(/^(\d+)\s*-\s*/);
      if (ruleMatch) {
        const ruleIndex = parseInt(ruleMatch[1], 10) - 1;
        const explanation = violationText.replace(/^\d+\s*-\s*/, "").trim();
        if (ruleIndex >= 0 && ruleIndex < rules.length) {
          violations.push({
            ruleNumber: ruleIndex + 1,
            rule: rules[ruleIndex],
            explanation,
          });
        } else {
          violations.push({
            ruleNumber: null,
            rule: null,
            explanation: violationText,
          });
        }
      } else {
        violations.push({
          ruleNumber: null,
          rule: null,
          explanation: violationText,
        });
      }
    }
  }

  return { violations, passed: violations.length === 0 };
}

async function generateNewRules(
  apiKey,
  diff,
  stat,
  changedFiles,
  existingRules,
) {
  if (!diff.trim()) {
    return [];
  }

  const truncatedDiff =
    diff.length > 6000 ? diff.substring(0, 6000) + "\n... (truncated)" : diff;

  const existingRulesText = existingRules.length
    ? existingRules.map((r, i) => `${i + 1}. ${r}`).join("\n")
    : "(No existing rules yet)";

  const prompt = `Analyze these code changes to identify valuable lessons for future development.

This project uses GitHub Copilot for code generation. Rules you identify will help Copilot generate better, more consistent code in the future.

EXISTING PROJECT RULES (avoid duplicates):
${existingRulesText}

Changed files: ${changedFiles.join(", ")}
Diff statistics:
${stat}

Code changes:
${truncatedDiff}

IDENTIFY RULES ONLY IF the diff shows:
1. A BUG FIX - What pattern caused the bug? How to prevent it?
2. A REFACTOR - What pattern was improved? What's the better approach?
3. A NEW PATTERN - Is a new convention being established worth codifying?
4. A SAFETY IMPROVEMENT - What edge case was handled? Should it always be handled?
5. A CONSISTENCY FIX - Was something made consistent that should stay consistent?

RULE QUALITY CRITERIA:
- Specific and actionable (not vague best practices)
- Relevant to this specific codebase and tech stack
- Would help an AI (like Copilot) generate better code
- Not already covered by existing rules (even partially)
- Based on actual changes in the diff, not assumptions

DO NOT create rules for:
- General programming best practices (Copilot already knows these)
- Version/changelog updates (handled automatically)
- Code formatting (handled by formatters)
- Things that are just "good to do" but not project-specific
- Anything speculative or not clearly evidenced in the diff

If no meaningful, non-duplicate rules can be extracted, respond: NO_NEW_RULES

Output format (only for genuinely valuable rules):
RULE: [Specific, actionable rule that helps future development]

Output format (default):
NO_NEW_RULES`;

  const response = await callGrokApi(apiKey, prompt);

  if (!response || response.trim() === "NO_NEW_RULES") {
    return [];
  }

  const newRules = [];
  const lines = response.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("RULE:")) {
      const rule = trimmed.replace("RULE:", "").trim();
      if (rule) {
        newRules.push(rule);
      }
    }
  }

  return newRules;
}

async function promptUserForViolations(violations) {
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const BOX_WIDTH = 84;
  const CONTENT_WIDTH = BOX_WIDTH - 6;

  const wrapText = (text, maxWidth) => {
    const words = text.split(" ");
    const lines = [];
    let currentLine = "";

    for (const word of words) {
      if ((currentLine + " " + word).trim().length <= maxWidth) {
        currentLine = (currentLine + " " + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine =
          word.length > maxWidth ? word.substring(0, maxWidth) : word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  return new Promise((resolve) => {
    process.stdout.write(`\n\n`);
    process.stdout.write(
      `  ${COLORS.brightRed}${COLORS.bright}┌${"─".repeat(BOX_WIDTH - 2)}┐${COLORS.reset}\n`,
    );
    const headerText = `${SYMBOLS.warning} RULE VIOLATIONS DETECTED`;
    process.stdout.write(
      `  ${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}  ${COLORS.brightRed}${headerText}${COLORS.reset}${" ".repeat(BOX_WIDTH - headerText.length - 4)}${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}\n`,
    );
    process.stdout.write(
      `  ${COLORS.brightRed}${COLORS.bright}├${"─".repeat(BOX_WIDTH - 2)}┤${COLORS.reset}\n`,
    );

    for (let i = 0; i < violations.length; i++) {
      const violation = violations[i];
      const ruleNum = violation.ruleNumber || "?";

      process.stdout.write(
        `  ${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}${" ".repeat(BOX_WIDTH - 2)}${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}\n`,
      );

      const ruleLabel = `${SYMBOLS.arrowRight} Rule ${ruleNum}:`;
      process.stdout.write(
        `  ${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}  ${COLORS.brightBlue}${COLORS.bright}${ruleLabel}${COLORS.reset}${" ".repeat(BOX_WIDTH - ruleLabel.length - 4)}${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}\n`,
      );

      if (violation.rule) {
        const ruleLines = wrapText(violation.rule, CONTENT_WIDTH);
        for (const line of ruleLines) {
          const padding = BOX_WIDTH - line.length - 6;
          process.stdout.write(
            `  ${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}    ${COLORS.white}${line}${COLORS.reset}${" ".repeat(Math.max(0, padding))}${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}\n`,
          );
        }
      }

      if (violation.explanation) {
        process.stdout.write(
          `  ${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}${" ".repeat(BOX_WIDTH - 2)}${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}\n`,
        );
        const issueLabel = "Issue:";
        process.stdout.write(
          `  ${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}    ${COLORS.brightRed}${issueLabel}${COLORS.reset}${" ".repeat(BOX_WIDTH - issueLabel.length - 6)}${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}\n`,
        );
        const explanationLines = wrapText(violation.explanation, CONTENT_WIDTH);
        for (const line of explanationLines) {
          const padding = BOX_WIDTH - line.length - 6;
          process.stdout.write(
            `  ${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}    ${COLORS.brightRed}${line}${COLORS.reset}${" ".repeat(Math.max(0, padding))}${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}\n`,
          );
        }
      }

      if (i < violations.length - 1) {
        process.stdout.write(
          `  ${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}  ${COLORS.dim}${"─".repeat(BOX_WIDTH - 6)}${COLORS.reset}  ${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}\n`,
        );
      }
    }

    process.stdout.write(
      `  ${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}${" ".repeat(BOX_WIDTH - 2)}${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}\n`,
    );
    process.stdout.write(
      `  ${COLORS.brightRed}${COLORS.bright}├${"─".repeat(BOX_WIDTH - 2)}┤${COLORS.reset}\n`,
    );
    const footerLine1 = "Review these issues before releasing.";
    const footerLine2 = "Fix violations or continue at your own risk.";
    process.stdout.write(
      `  ${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}  ${COLORS.dim}${footerLine1}${COLORS.reset}${" ".repeat(BOX_WIDTH - footerLine1.length - 4)}${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}\n`,
    );
    process.stdout.write(
      `  ${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}  ${COLORS.dim}${footerLine2}${COLORS.reset}${" ".repeat(BOX_WIDTH - footerLine2.length - 4)}${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}\n`,
    );
    process.stdout.write(
      `  ${COLORS.brightRed}${COLORS.bright}└${"─".repeat(BOX_WIDTH - 2)}┘${COLORS.reset}\n\n`,
    );

    rl.question(
      `  ${COLORS.brightBlue}?${COLORS.reset} Continue anyway? (y/N): `,
      (answer) => {
        rl.close();
        const normalized = answer.trim().toLowerCase();
        resolve(normalized === "y" || normalized === "yes");
      },
    );
  });
}

function detectBuildCommand() {
  const packageJsonPath = path.join(PROJECT_ROOT, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  const content = safeReadFile(packageJsonPath, "package.json");
  const packageJson = safeParseJson(content, packageJsonPath, "package.json");
  const scripts = packageJson.scripts || {};

  if (scripts.build) {
    return "npm run build";
  }

  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  if (deps.vite) {
    return "npx vite build";
  }

  if (deps["react-scripts"]) {
    return "npx react-scripts build";
  }

  return null;
}

function detectFormatCommand() {
  const packageJsonPath = path.join(PROJECT_ROOT, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    return { command: null, warning: "No package.json found" };
  }

  const content = safeReadFile(packageJsonPath, "package.json");
  const packageJson = safeParseJson(content, packageJsonPath, "package.json");
  const scripts = packageJson.scripts || {};

  if (scripts.format) {
    return { command: "npm run format", type: "script" };
  }

  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const prettierCheck = checkPrettierInstalled();

  if (deps.prettier || prettierCheck.installed) {
    return { command: "npx prettier --write .", type: "prettier" };
  }

  return {
    command: null,
    warning: prettierCheck.warning || "No formatter configured",
    suggestion:
      "Add prettier as dev dependency or add a 'format' script to package.json",
  };
}

function runBuild(buildCommand) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = buildCommand.split(" ");
    const child = spawn(cmd, args, {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
      shell: true,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new TurlError(
            `Build failed with exit code ${code}`,
            ErrorCodes.BUILD_FAILED,
            { command: buildCommand, exitCode: code },
          ),
        );
      }
    });

    child.on("error", (err) => {
      reject(
        new TurlError(
          `Build process error: ${err.message}`,
          ErrorCodes.BUILD_FAILED,
          { command: buildCommand, originalError: err.message },
        ),
      );
    });
  });
}

function gitCommit(commitMessage) {
  const tempFile = path.join(PROJECT_ROOT, ".commit-msg-temp");

  try {
    safeWriteFile(tempFile, commitMessage, "commit message temp file");
    execCommand(`git commit -F "${tempFile}"`, { silent: true });

    try {
      fs.unlinkSync(tempFile);
    } catch {}
  } catch (err) {
    try {
      fs.unlinkSync(tempFile);
    } catch {}

    if (err.message && err.message.includes("nothing to commit")) {
      throw new TurlError(
        "Nothing to commit - all changes may have been reverted",
        ErrorCodes.GIT_COMMIT_FAILED,
        { suggestion: "Make sure there are actual changes to commit" },
      );
    }

    throw new TurlError(
      `Git commit failed: ${err.message}`,
      ErrorCodes.GIT_COMMIT_FAILED,
      { originalError: err.message },
    );
  }
}

function gitPush(branch = "main") {
  try {
    execCommand(`git push origin ${branch}`, { silent: true });
  } catch (err) {
    const errorMsg = err.message || err.stderr || "";

    if (
      errorMsg.includes("rejected") ||
      errorMsg.includes("non-fast-forward")
    ) {
      throw new TurlError(
        `Push rejected. Remote has changes not present locally.`,
        ErrorCodes.GIT_PUSH_FAILED,
        {
          branch,
          suggestion:
            "Pull the latest changes with 'git pull origin " +
            branch +
            "' and try again",
        },
      );
    }

    if (
      errorMsg.includes("Permission denied") ||
      errorMsg.includes("authentication")
    ) {
      throw new TurlError(
        "Git push failed: Authentication error",
        ErrorCodes.GIT_PUSH_FAILED,
        {
          branch,
          suggestion: "Check your git credentials or SSH keys",
        },
      );
    }

    if (
      errorMsg.includes("does not exist") ||
      errorMsg.includes("Could not read from remote")
    ) {
      throw new TurlError(
        "Git push failed: Remote repository not found",
        ErrorCodes.GIT_PUSH_FAILED,
        {
          branch,
          suggestion: "Check your remote URL with 'git remote -v'",
        },
      );
    }

    throw new TurlError(
      `Git push failed: ${errorMsg}`,
      ErrorCodes.GIT_PUSH_FAILED,
      { branch, originalError: errorMsg },
    );
  }
}

let originalTurlConfig = null;

function rollbackVersion() {
  if (originalTurlConfig) {
    try {
      writeTurlConfig(originalTurlConfig);
      process.stdout.write(
        `  ${COLORS.brightRed}${SYMBOLS.warning}${COLORS.reset} Rolled back version in turl.json\n`,
      );
    } catch (err) {
      process.stdout.write(
        `  ${COLORS.brightRed}${SYMBOLS.cross}${COLORS.reset} Failed to rollback version: ${err.message}\n`,
      );
    }
  }
}

function exitWithRollback(code = 1) {
  rollbackVersion();
  process.exit(code);
}

async function main() {
  const cliOptions = parseArgs();

  if (cliOptions.command === "_post-commit") {
    await handlePostCommitHook();
    process.exit(0);
  }

  if (cliOptions.command === "init") {
    await handleInitCommand();
    process.exit(0);
  }

  if (cliOptions.command === "sync") {
    handleSyncCommand(cliOptions.quiet);
    process.exit(0);
  }

  if (cliOptions.command === "analyze") {
    await handleAnalyzeCommand(cliOptions.commandArgs);
    process.exit(0);
  }

  if (cliOptions.command === "learn") {
    await handleLearnCommand(cliOptions.commandArgs);
    process.exit(0);
  }

  if (cliOptions.command === "rules") {
    handleRulesCommand();
    process.exit(0);
  }

  if (cliOptions.command === "forget") {
    await handleForgetCommand(cliOptions.commandArgs);
    process.exit(0);
  }

  const TOTAL_STEPS = 15;

  process.stdout.write(ui.header());
  process.stdout.write("\n");

  if (!cliOptions.skipUpdate) {
    process.stdout.write(
      ui.step(0, TOTAL_STEPS, "Checking for updates...", "running"),
    );
    const updateInfo = await checkForUpdates();
    if (updateInfo.hasUpdate) {
      const shouldUpdate = await promptForUpdate(updateInfo);
      if (shouldUpdate) {
        const updated = await performUpdate();
        if (updated) {
          process.exit(0);
        }
      }
      process.stdout.write(
        ui.subStep("Continuing with current version", "info"),
      );
    } else if (updateInfo.error) {
      process.stdout.write(
        ui.subStep("Could not check for updates (offline?)", "warn"),
      );
    } else {
      process.stdout.write(
        ui.subStep(`v${PACKAGE_VERSION} is the latest version`, "success"),
      );
    }
  }

  let interactiveOptions = {};
  if (cliOptions.interactive) {
    interactiveOptions = await interactiveMenu();
  }

  process.stdout.write(
    ui.step(1, TOTAL_STEPS, "Running pre-flight checks...", "running"),
  );

  try {
    checkGitInstalled();
    process.stdout.write(ui.subStep("Git is installed", "success"));
  } catch (err) {
    process.stdout.write(ui.subStep(`${err.message}`, "error"));
    if (err.details?.suggestion)
      process.stdout.write(ui.subStep(err.details.suggestion, "info"));
    process.exit(1);
  }

  try {
    checkGitRepository();
    process.stdout.write(ui.subStep("Git repository initialized", "success"));
  } catch (err) {
    process.stdout.write(ui.subStep(`${err.message}`, "error"));
    if (err.details?.suggestion)
      process.stdout.write(ui.subStep(err.details.suggestion, "info"));
    process.exit(1);
  }

  try {
    checkGitRemote();
    process.stdout.write(ui.subStep("Git remote configured", "success"));
  } catch (err) {
    process.stdout.write(ui.subStep(`${err.message}`, "error"));
    if (err.details?.suggestion)
      process.stdout.write(ui.subStep(err.details.suggestion, "info"));
    process.exit(1);
  }

  const nodeModulesCheck = checkNodeModules();
  if (!nodeModulesCheck.exists) {
    process.stdout.write(ui.subStep(nodeModulesCheck.warning, "warn"));
  } else {
    process.stdout.write(ui.subStep("node_modules found", "success"));
  }

  process.stdout.write(
    ui.step(2, TOTAL_STEPS, "Loading environment variables...", "running"),
  );
  loadEnv();
  const apiKey = getApiKey();

  try {
    validateApiKey(apiKey);
    process.stdout.write(ui.subStep("API key loaded and validated", "success"));
  } catch (err) {
    process.stdout.write(ui.subStep(`${err.message}`, "error"));
    if (err.details?.suggestion)
      process.stdout.write(ui.subStep(err.details.suggestion, "info"));
    if (err.details?.helpUrl)
      process.stdout.write(
        ui.subStep(`More info: ${err.details.helpUrl}`, "info"),
      );
    process.exit(1);
  }

  process.stdout.write(
    ui.step(3, TOTAL_STEPS, "Reading turl.json config...", "running"),
  );
  let turlConfig;
  try {
    turlConfig = readTurlConfig();
    originalTurlConfig = { ...turlConfig };
    process.stdout.write(
      ui.subStep(`Project: ${ui.highlight(turlConfig.projectName)}`, "info"),
    );
    process.stdout.write(
      ui.subStep(
        `Current version: ${ui.highlight(turlConfig.version)}`,
        "info",
      ),
    );
    process.stdout.write(
      ui.subStep(
        `Branch: ${ui.highlight(interactiveOptions.branch || cliOptions.branch || turlConfig.branch)}`,
        "info",
      ),
    );
  } catch (err) {
    process.stdout.write(ui.subStep(`${err.message}`, "error"));
    process.exit(1);
  }

  const projectName = turlConfig.projectName;
  const branch =
    interactiveOptions.branch || cliOptions.branch || turlConfig.branch;

  process.stdout.write(
    ui.step(4, TOTAL_STEPS, "Calculating new version...", "running"),
  );
  const newVersion = incrementVersion(turlConfig.version);
  process.stdout.write(
    ui.subStep(
      `${turlConfig.version} ${SYMBOLS.arrow} ${ui.highlight(newVersion)}`,
      "success",
    ),
  );

  if (cliOptions.dryRun) {
    process.stdout.write(
      `\n\n  ${COLORS.brightBlue}${SYMBOLS.info}${COLORS.reset} ${COLORS.bright}DRY RUN MODE${COLORS.reset}\n`,
    );
    process.stdout.write(
      `  ${COLORS.dim}No changes will be made to your repository.${COLORS.reset}\n\n`,
    );
  }

  process.stdout.write(
    ui.step(5, TOTAL_STEPS, "Running code cleanup...", "running"),
  );
  try {
    const cleanupStats = await runCleanup(PROJECT_ROOT);
    process.stdout.write(
      ui.subStep(
        `Removed ${cleanupStats.consoleLogsRemoved} console.log calls`,
        "success",
      ),
    );
    process.stdout.write(
      ui.subStep(
        `Removed ${cleanupStats.cssClassesRemoved} unused CSS classes`,
        "success",
      ),
    );

    if (cleanupStats.errors?.length > 0) {
      process.stdout.write(
        ui.subStep(
          `${cleanupStats.errors.length} cleanup errors (non-fatal)`,
          "warn",
        ),
      );
    }
  } catch (err) {
    process.stdout.write(
      ui.subStep(`Cleanup error (non-fatal): ${err.message}`, "warn"),
    );
  }

  process.stdout.write(
    ui.step(6, TOTAL_STEPS, "Running code formatter...", "running"),
  );
  if (!interactiveOptions.skipFormat) {
    const formatResult = detectFormatCommand();

    if (formatResult.command) {
      try {
        if (!cliOptions.dryRun) {
          execCommand(formatResult.command, {
            silent: true,
            ignoreError: false,
          });
        }
        process.stdout.write(
          ui.subStep(`Formatted with: ${formatResult.command}`, "success"),
        );
      } catch (err) {
        const errorMsg = err.message || "";
        if (errorMsg.includes("ENOENT") || errorMsg.includes("not found")) {
          process.stdout.write(
            ui.subStep("Formatter not found, skipping...", "warn"),
          );
        } else {
          process.stdout.write(
            ui.subStep(`Format failed: ${err.message}`, "warn"),
          );
        }
      }
    } else {
      process.stdout.write(
        ui.subStep(formatResult.warning || "No formatter detected", "skip"),
      );
    }
  } else {
    process.stdout.write(ui.subStep("Skipped by user", "skip"));
  }

  process.stdout.write(
    ui.step(7, TOTAL_STEPS, "Checking for changes...", "running"),
  );
  const diff = getGitDiff();
  const changedFiles = getChangedFiles();

  if (!hasChanges() && !diff.trim()) {
    process.stdout.write(
      ui.subStep("No changes detected. Nothing to release.", "warn"),
    );
    process.stdout.write(
      `\n\n  ${ui.box("Release skipped - no changes", 40)}\n\n`,
    );
    process.exit(0);
  }
  process.stdout.write(
    ui.subStep(
      `Found ${ui.highlight(changedFiles.length.toString())} changed files`,
      "success",
    ),
  );

  process.stdout.write(
    ui.step(8, TOTAL_STEPS, "Checking project rules...", "running"),
  );
  const { rules: projectRules } = readTurlRules();

  if (!interactiveOptions.skipRulesCheck && projectRules.length > 0) {
    process.stdout.write(
      ui.subStep(`Found ${projectRules.length} project rules`, "info"),
    );
    try {
      const stat = getGitDiffStat();
      const violationCheck = await checkRulesViolations(
        apiKey,
        diff,
        stat,
        changedFiles,
        projectRules,
      );
      if (!violationCheck.passed) {
        const shouldContinue = await promptUserForViolations(
          violationCheck.violations,
        );
        if (!shouldContinue) {
          process.stdout.write(
            `\n  ${COLORS.brightRed}${SYMBOLS.cross}${COLORS.reset} Release aborted. Fix violations and try again.\n\n`,
          );
          process.exit(0);
        }
        process.stdout.write(
          ui.subStep("Proceeding despite rule violations", "warn"),
        );
      } else {
        process.stdout.write(
          ui.subStep("No rule violations detected", "success"),
        );
      }
    } catch (err) {
      process.stdout.write(
        ui.subStep(`Could not check rules: ${err.message}`, "warn"),
      );
    }
  } else if (interactiveOptions.skipRulesCheck) {
    process.stdout.write(ui.subStep("Skipped by user", "skip"));
  } else {
    process.stdout.write(ui.subStep("No project rules defined yet", "skip"));
  }

  process.stdout.write(
    ui.step(9, TOTAL_STEPS, "Updating version files...", "running"),
  );
  try {
    const updatedConfig = {
      version: newVersion,
      projectName,
      branch: turlConfig.branch,
    };
    let packageSyncResult = { updated: false };
    if (!cliOptions.dryRun) {
      packageSyncResult = writeTurlConfig(updatedConfig);
    }
    process.stdout.write(
      ui.subStep(
        `turl.json ${SYMBOLS.arrow} v${ui.highlight(newVersion)}`,
        "success",
      ),
    );
    if (packageSyncResult.updated) {
      process.stdout.write(
        ui.subStep(
          `package.json ${SYMBOLS.arrow} v${packageSyncResult.newVersion}`,
          "success",
        ),
      );
    } else if (cliOptions.dryRun) {
      process.stdout.write(
        ui.subStep(`package.json would be updated (dry run)`, "skip"),
      );
    }
  } catch (err) {
    process.stdout.write(ui.subStep(`${err.message}`, "error"));
    process.exit(1);
  }

  process.stdout.write(
    ui.step(10, TOTAL_STEPS, "Generating changelog with AI...", "running"),
  );
  let changelogEntry;
  const changelogDiff = getGitDiff(true);
  const changelogStat = getGitDiffStat(true);
  const changelogFiles = getChangedFiles(true);
  try {
    changelogEntry = await generateChangelog(
      apiKey,
      newVersion,
      projectName,
      changelogDiff,
      changelogStat,
      changelogFiles,
    );
    process.stdout.write(
      ui.subStep("Changelog generated successfully", "success"),
    );
  } catch (err) {
    process.stdout.write(ui.subStep(`${err.message}`, "error"));
    exitWithRollback(1);
  }

  process.stdout.write(
    ui.step(11, TOTAL_STEPS, "Updating CHANGELOG.md...", "running"),
  );
  try {
    if (!cliOptions.dryRun) {
      updateChangelog(changelogEntry);
    }
    process.stdout.write(ui.subStep("CHANGELOG.md updated", "success"));
  } catch (err) {
    process.stdout.write(ui.subStep(`${err.message}`, "error"));
    exitWithRollback(1);
  }

  process.stdout.write(
    ui.step(12, TOTAL_STEPS, "Running production build...", "running"),
  );
  if (!interactiveOptions.skipBuild) {
    const buildCommand = detectBuildCommand();
    if (buildCommand) {
      try {
        if (!cliOptions.dryRun) {
          await runBuild(buildCommand);
        }
        process.stdout.write(
          ui.subStep("Build completed successfully", "success"),
        );
      } catch (err) {
        process.stdout.write(
          ui.subStep(`Build failed: ${err.message}`, "warn"),
        );
        process.stdout.write(ui.subStep("Continuing with release...", "info"));
      }
    } else {
      process.stdout.write(ui.subStep("No build command detected", "skip"));
    }
  } else {
    process.stdout.write(ui.subStep("Skipped by user", "skip"));
  }

  process.stdout.write(
    ui.step(13, TOTAL_STEPS, "Staging all changes...", "running"),
  );
  try {
    if (!cliOptions.dryRun) {
      execCommand("git add -A", { silent: true });
    }
    process.stdout.write(ui.subStep("All changes staged", "success"));
  } catch (err) {
    process.stdout.write(
      ui.subStep(`Failed to stage changes: ${err.message}`, "error"),
    );
    exitWithRollback(1);
  }

  const finalDiff = getGitDiff(true);
  const finalStat = getGitDiffStat(true);
  const finalChangedFiles = getChangedFiles(true);

  process.stdout.write(
    ui.step(14, TOTAL_STEPS, "Committing and pushing...", "running"),
  );
  process.stdout.write(
    ui.subStep("Generating commit message with AI...", "info"),
  );

  let commitMessage;
  try {
    commitMessage = await generateCommitMessage(
      apiKey,
      newVersion,
      projectName,
      finalDiff,
      finalStat,
      finalChangedFiles,
    );
    process.stdout.write(ui.subStep("Commit message generated", "success"));
  } catch (err) {
    process.stdout.write(ui.subStep(`${err.message}`, "error"));
    exitWithRollback(1);
  }

  if (!cliOptions.dryRun) {
    try {
      gitCommit(commitMessage);
      process.stdout.write(ui.subStep("Committed successfully", "success"));
    } catch (err) {
      process.stdout.write(ui.subStep(`${err.message}`, "error"));
      exitWithRollback(1);
    }

    process.stdout.write(ui.subStep(`Pushing to origin/${branch}...`, "info"));
    try {
      gitPush(branch);
      process.stdout.write(ui.subStep("Pushed successfully", "success"));
    } catch (err) {
      process.stdout.write(ui.subStep(`${err.message}`, "error"));
      exitWithRollback(1);
    }
  } else {
    process.stdout.write(ui.subStep("Commit skipped (dry run)", "skip"));
    process.stdout.write(ui.subStep("Push skipped (dry run)", "skip"));
  }

  process.stdout.write(
    ui.step(15, TOTAL_STEPS, "Learning from this release...", "running"),
  );
  try {
    const newRules = await generateNewRules(
      apiKey,
      finalDiff,
      finalStat,
      finalChangedFiles,
      projectRules,
    );
    if (newRules.length > 0) {
      let addedCount = 0;
      for (const rule of newRules) {
        if (!cliOptions.dryRun && appendTurlRule(rule)) {
          addedCount++;
          process.stdout.write(ui.subStep(`NEW: ${rule}`, "success"));
        } else if (cliOptions.dryRun) {
          process.stdout.write(ui.subStep(`Would add: ${rule}`, "info"));
          addedCount++;
        }
      }
      if (addedCount > 0 && !cliOptions.dryRun) {
        process.stdout.write(
          ui.subStep(
            `Added ${addedCount} new rule(s) to copilot-instructions.md`,
            "success",
          ),
        );
        execCommand("git add .github/copilot-instructions.md", {
          silent: true,
          ignoreError: true,
        });
        execCommand("git commit --amend --no-edit", {
          silent: true,
          ignoreError: true,
        });
        execCommand(`git push origin ${branch} --force-with-lease`, {
          silent: true,
          ignoreError: true,
        });
      }
    } else {
      process.stdout.write(
        ui.subStep("No new rules identified from this release", "info"),
      );
    }
  } catch (err) {
    process.stdout.write(
      ui.subStep(`Could not learn rules: ${err.message}`, "warn"),
    );
  }

  process.stdout.write("\n\n");

  const BOX_WIDTH = 60;
  const pad = (str, len) => str.padEnd(len);

  process.stdout.write(
    `  ${COLORS.brightWhite}${COLORS.bright}╔${"═".repeat(BOX_WIDTH - 2)}╗${COLORS.reset}\n`,
  );
  process.stdout.write(
    `  ${COLORS.brightWhite}${COLORS.bright}║${COLORS.reset}${" ".repeat(BOX_WIDTH - 2)}${COLORS.brightWhite}${COLORS.bright}║${COLORS.reset}\n`,
  );
  process.stdout.write(
    `  ${COLORS.brightWhite}${COLORS.bright}║${COLORS.reset}   ${COLORS.brightWhite}${SYMBOLS.check}${COLORS.reset} ${COLORS.bright}Release Complete!${COLORS.reset}${" ".repeat(BOX_WIDTH - 24)}${COLORS.brightWhite}${COLORS.bright}║${COLORS.reset}\n`,
  );
  process.stdout.write(
    `  ${COLORS.brightWhite}${COLORS.bright}║${COLORS.reset}${" ".repeat(BOX_WIDTH - 2)}${COLORS.brightWhite}${COLORS.bright}║${COLORS.reset}\n`,
  );
  process.stdout.write(
    `  ${COLORS.brightWhite}${COLORS.bright}║${COLORS.reset}   ${COLORS.dim}Project:${COLORS.reset} ${COLORS.brightBlue}${pad(projectName, BOX_WIDTH - 15)}${COLORS.reset}${COLORS.brightWhite}${COLORS.bright}║${COLORS.reset}\n`,
  );
  process.stdout.write(
    `  ${COLORS.brightWhite}${COLORS.bright}║${COLORS.reset}   ${COLORS.dim}Version:${COLORS.reset} ${COLORS.brightBlue}${pad("v" + newVersion, BOX_WIDTH - 15)}${COLORS.reset}${COLORS.brightWhite}${COLORS.bright}║${COLORS.reset}\n`,
  );
  process.stdout.write(
    `  ${COLORS.brightWhite}${COLORS.bright}║${COLORS.reset}   ${COLORS.dim}Branch:${COLORS.reset}  ${COLORS.brightBlue}${pad(branch, BOX_WIDTH - 15)}${COLORS.reset}${COLORS.brightWhite}${COLORS.bright}║${COLORS.reset}\n`,
  );
  process.stdout.write(
    `  ${COLORS.brightWhite}${COLORS.bright}║${COLORS.reset}${" ".repeat(BOX_WIDTH - 2)}${COLORS.brightWhite}${COLORS.bright}║${COLORS.reset}\n`,
  );
  process.stdout.write(
    `  ${COLORS.brightWhite}${COLORS.bright}╚${"═".repeat(BOX_WIDTH - 2)}╝${COLORS.reset}\n\n`,
  );
}

main().catch((err) => {
  ui.showCursor();
  const BOX_WIDTH = 60;
  process.stdout.write(`\n\n`);
  process.stdout.write(
    `  ${COLORS.brightRed}${COLORS.bright}╔${"═".repeat(BOX_WIDTH - 2)}╗${COLORS.reset}\n`,
  );
  process.stdout.write(
    `  ${COLORS.brightRed}${COLORS.bright}║${COLORS.reset}  ${COLORS.brightRed}${SYMBOLS.cross}${COLORS.reset} ${COLORS.bright}Release Failed${COLORS.reset}${" ".repeat(BOX_WIDTH - 21)}${COLORS.brightRed}${COLORS.bright}║${COLORS.reset}\n`,
  );
  process.stdout.write(
    `  ${COLORS.brightRed}${COLORS.bright}╚${"═".repeat(BOX_WIDTH - 2)}╝${COLORS.reset}\n\n`,
  );

  if (err instanceof TurlError) {
    process.stdout.write(
      `  ${COLORS.brightRed}${SYMBOLS.cross}${COLORS.reset} ${err.message}\n`,
    );
    if (err.details?.suggestion) {
      process.stdout.write(
        `  ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} ${err.details.suggestion}\n`,
      );
    }
    if (err.code) {
      process.stdout.write(
        `  ${COLORS.dim}Error code: ${err.code}${COLORS.reset}\n`,
      );
    }
  } else {
    process.stdout.write(
      `  ${COLORS.brightRed}${SYMBOLS.cross}${COLORS.reset} ${err.message}\n`,
    );
    if (err.stack && process.env.DEBUG) {
      process.stdout.write(
        `\n  ${COLORS.dim}Stack trace:\n${err.stack}${COLORS.reset}\n`,
      );
    }
  }

  process.stdout.write("\n");
  rollbackVersion();
  process.exit(1);
});
