import { execSync } from "child_process";
import { createRequire } from "module";
import {
  COLORS,
  SYMBOLS,
  PACKAGE_NAME,
  PACKAGE_VERSION,
  AI_PROVIDERS,
} from "./constants.js";

function getInstalledVersion() {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("../package.json");
    return pkg.version;
  } catch {
    return PACKAGE_VERSION;
  }
}

export function parseArgs(args) {
  const options = {
    branch: null,
    skipUpdate: false,
    interactive: false,
    verbose: false,
    dryRun: false,
    quiet: false,
    setup: false,
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
    } else if (arg === "--quiet" || arg === "-q") {
      options.quiet = true;
    } else if (arg === "--setup") {
      options.setup = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

export function printHelp() {
  process.stdout.write(`
  ${COLORS.bright}Nit${COLORS.reset} ${COLORS.dim}v${PACKAGE_VERSION}${COLORS.reset}

  ${COLORS.bright}Usage:${COLORS.reset} nit [options]

  ${COLORS.bright}What it does (all automatic):${COLORS.reset}
    ${COLORS.brightBlue}${SYMBOLS.check}${COLORS.reset} Checks for nit updates and auto-updates
    ${COLORS.brightBlue}${SYMBOLS.check}${COLORS.reset} Runs code cleanup (removes console.logs)
    ${COLORS.brightBlue}${SYMBOLS.check}${COLORS.reset} Formats code with Prettier
    ${COLORS.brightBlue}${SYMBOLS.check}${COLORS.reset} Increments version in nit.json + package.json
    ${COLORS.brightBlue}${SYMBOLS.check}${COLORS.reset} Generates AI changelog and commit message
    ${COLORS.brightBlue}${SYMBOLS.check}${COLORS.reset} Runs production build
    ${COLORS.brightBlue}${SYMBOLS.check}${COLORS.reset} Commits and pushes to git

  ${COLORS.bright}Supported AI Providers:${COLORS.reset}
    ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} Grok (xAI)          ${COLORS.dim}GROK_API_KEY${COLORS.reset}
    ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} OpenAI (GPT-4o)     ${COLORS.dim}OPENAI_API_KEY${COLORS.reset}
    ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} Anthropic (Claude)  ${COLORS.dim}ANTHROPIC_API_KEY${COLORS.reset}

  ${COLORS.bright}Options:${COLORS.reset}
    ${COLORS.brightBlue}-b, --branch <name>${COLORS.reset}   Override branch to push to
    ${COLORS.brightBlue}-s, --skip-update${COLORS.reset}     Skip nit update check
    ${COLORS.brightBlue}-i, --interactive${COLORS.reset}     Interactive mode (prompts for options)
    ${COLORS.brightBlue}-d, --dry-run${COLORS.reset}         Preview without making changes
    ${COLORS.brightBlue}-q, --quiet${COLORS.reset}           Minimal output
    ${COLORS.brightBlue}    --setup${COLORS.reset}           Re-run AI provider setup
    ${COLORS.brightBlue}-h, --help${COLORS.reset}            Show this help

  ${COLORS.bright}Examples:${COLORS.reset}
    ${COLORS.dim}nit${COLORS.reset}              Run a full release
    ${COLORS.dim}nit -d${COLORS.reset}           Preview what would happen
    ${COLORS.dim}nit -b develop${COLORS.reset}   Release to develop branch
    ${COLORS.dim}nit --setup${COLORS.reset}      Choose your AI provider

`);
}

/**
 * Interactive prompt for selecting an AI provider.
 * Only runs on first use (no provider in nit.json) or when --setup is passed.
 * Returns the selected provider ID.
 */
export async function providerSetup() {
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const question = (prompt) =>
    new Promise((resolve) => rl.question(prompt, resolve));

  const providerEntries = Object.entries(AI_PROVIDERS);

  process.stdout.write(`
  ${COLORS.bright}AI Provider Setup${COLORS.reset}
  ${COLORS.dim}Choose which AI provider nit will use for changelogs and commit messages.${COLORS.reset}
  ${COLORS.dim}This choice is saved in public/nit.json and shared with the JetBrains plugin.${COLORS.reset}
`);

  providerEntries.forEach(([key, provider], index) => {
    process.stdout.write(
      `  ${COLORS.brightBlue}${index + 1}${COLORS.reset}) ${provider.name}  ${COLORS.dim}(env: ${provider.envKeys[0]})${COLORS.reset}\n`,
    );
  });

  const answer = await question(
    `\n  ${COLORS.bright}Select provider (1-${providerEntries.length}):${COLORS.reset} `,
  );
  rl.close();

  const index = parseInt(answer.trim(), 10) - 1;
  if (index < 0 || index >= providerEntries.length) {
    process.stdout.write(
      `\n  ${COLORS.brightYellow}Invalid selection, defaulting to Grok.${COLORS.reset}\n\n`,
    );
    return "grok";
  }

  const [selectedId, selectedProvider] = providerEntries[index];
  process.stdout.write(
    `\n  ${COLORS.brightGreen}${SYMBOLS.check}${COLORS.reset} Selected: ${selectedProvider.name}\n`,
  );
  process.stdout.write(
    `  ${COLORS.dim}Make sure ${selectedProvider.envKeys[0]} is set in your .env file.${COLORS.reset}\n`,
  );
  process.stdout.write(
    `  ${COLORS.dim}Get a key at: ${selectedProvider.signupUrl}${COLORS.reset}\n\n`,
  );
  return selectedId;
}

export async function interactiveMenu() {
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const question = (prompt) =>
    new Promise((resolve) => rl.question(prompt, resolve));

  const options = {
    branch: null,
    skipBuild: false,
    skipFormat: false,
  };

  const branchAnswer = await question(`\n  Branch (default): `);
  if (branchAnswer.trim()) options.branch = branchAnswer.trim();

  const buildAnswer = await question(`  Run build? (Y/n): `);
  options.skipBuild = buildAnswer.trim().toLowerCase() === "n";

  const formatAnswer = await question(`  Run formatter? (Y/n): `);
  options.skipFormat = formatAnswer.trim().toLowerCase() === "n";

  rl.close();
  return options;
}

export async function checkForUpdates() {
  const currentVersion = getInstalledVersion();
  try {
    const latestVersion = execSync(`npm view ${PACKAGE_NAME} version`, {
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();

    if (latestVersion && latestVersion !== currentVersion) {
      const [latestMajor, latestMinor, latestPatch] = latestVersion
        .split(".")
        .map(Number);
      const [currentMajor, currentMinor, currentPatch] = currentVersion
        .split(".")
        .map(Number);

      const isNewer =
        latestMajor > currentMajor ||
        (latestMajor === currentMajor && latestMinor > currentMinor) ||
        (latestMajor === currentMajor &&
          latestMinor === currentMinor &&
          latestPatch > currentPatch);

      if (isNewer) return { hasUpdate: true, currentVersion, latestVersion };
    }
    return { hasUpdate: false, currentVersion, latestVersion: currentVersion };
  } catch {
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      error: true,
    };
  }
}

function detectInstallationType() {
  try {
    const globalList = execSync(`npm list -g ${PACKAGE_NAME} --depth=0`, {
      encoding: "utf-8",
      stdio: "pipe",
    });
    if (globalList.includes(PACKAGE_NAME)) return "global";
  } catch {}

  try {
    const localList = execSync(`npm list ${PACKAGE_NAME} --depth=0`, {
      encoding: "utf-8",
      stdio: "pipe",
      cwd: process.cwd(),
    });
    if (localList.includes(PACKAGE_NAME)) return "local";
  } catch {}

  return "global";
}

export async function performUpdate() {
  const installationType = detectInstallationType();
  const updateCommand =
    installationType === "global"
      ? `npm install -g ${PACKAGE_NAME}@latest`
      : `npm install --save-dev ${PACKAGE_NAME}@latest`;

  try {
    execSync(updateCommand, { stdio: "pipe", cwd: process.cwd() });
    return true;
  } catch {
    return false;
  }
}

export function reExecuteAfterUpdate() {
  const args = process.argv
    .slice(2)
    .filter((a) => a !== "--skip-update" && a !== "-s");
  const binPath = process.argv[1];
  try {
    execSync(`node "${binPath}" --skip-update ${args.join(" ")}`, {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    return true;
  } catch {
    return false;
  }
}
