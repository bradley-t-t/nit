import { execSync } from "child_process";
import { COLORS, SYMBOLS, PACKAGE_NAME, PACKAGE_VERSION } from "./constants.js";

export function parseArgs(args) {
  const options = {
    branch: null,
    skipUpdate: false,
    interactive: false,
    verbose: false,
    dryRun: false,
    quiet: false,
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
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

export function printHelp() {
  process.stdout.write(`
  ${COLORS.bright}TURL Release Tool${COLORS.reset} ${COLORS.dim}v${PACKAGE_VERSION}${COLORS.reset}

  ${COLORS.bright}Usage:${COLORS.reset} turl-release [options]

  ${COLORS.bright}What it does (all automatic):${COLORS.reset}
    ${COLORS.brightBlue}${SYMBOLS.check}${COLORS.reset} Checks for turl-release updates and auto-updates
    ${COLORS.brightBlue}${SYMBOLS.check}${COLORS.reset} Runs code cleanup (removes console.logs)
    ${COLORS.brightBlue}${SYMBOLS.check}${COLORS.reset} Formats code with Prettier
    ${COLORS.brightBlue}${SYMBOLS.check}${COLORS.reset} Checks changes against project rules
    ${COLORS.brightBlue}${SYMBOLS.check}${COLORS.reset} Increments version in turl.json + package.json
    ${COLORS.brightBlue}${SYMBOLS.check}${COLORS.reset} Generates AI changelog and commit message
    ${COLORS.brightBlue}${SYMBOLS.check}${COLORS.reset} Runs production build
    ${COLORS.brightBlue}${SYMBOLS.check}${COLORS.reset} Commits and pushes to git
    ${COLORS.brightBlue}${SYMBOLS.check}${COLORS.reset} Learns new rules from changes (like Claude's lessons.md)
    ${COLORS.brightBlue}${SYMBOLS.check}${COLORS.reset} Syncs rules to .github/copilot-instructions.md

  ${COLORS.bright}Options:${COLORS.reset}
    ${COLORS.brightBlue}-b, --branch <name>${COLORS.reset}   Override branch to push to
    ${COLORS.brightBlue}-s, --skip-update${COLORS.reset}     Skip turl-release update check
    ${COLORS.brightBlue}-i, --interactive${COLORS.reset}     Interactive mode (prompts for options)
    ${COLORS.brightBlue}-d, --dry-run${COLORS.reset}         Preview without making changes
    ${COLORS.brightBlue}-q, --quiet${COLORS.reset}           Minimal output
    ${COLORS.brightBlue}-h, --help${COLORS.reset}            Show this help

  ${COLORS.bright}Examples:${COLORS.reset}
    ${COLORS.dim}turl-release${COLORS.reset}              Run a full release
    ${COLORS.dim}turl-release -d${COLORS.reset}           Preview what would happen
    ${COLORS.dim}turl-release -b develop${COLORS.reset}   Release to develop branch

`);
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
    skipRulesCheck: false,
  };

  const branchAnswer = await question(`\n  Branch (default): `);
  if (branchAnswer.trim()) options.branch = branchAnswer.trim();

  const buildAnswer = await question(`  Run build? (Y/n): `);
  options.skipBuild = buildAnswer.trim().toLowerCase() === "n";

  const formatAnswer = await question(`  Run formatter? (Y/n): `);
  options.skipFormat = formatAnswer.trim().toLowerCase() === "n";

  const rulesAnswer = await question(`  Check rules? (Y/n): `);
  options.skipRulesCheck = rulesAnswer.trim().toLowerCase() === "n";

  rl.close();
  return options;
}

export async function promptUserForViolations(violations) {
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    process.stdout.write(`\n  Rule violations found: ${violations.length}\n`);
    rl.question(`  Continue anyway? (y/N): `, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === "y" || normalized === "yes");
    });
  });
}

export async function checkForUpdates() {
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

      if (isNewer)
        return {
          hasUpdate: true,
          currentVersion: PACKAGE_VERSION,
          latestVersion,
        };
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

export async function performUpdate() {
  try {
    execSync(`npm install -g ${PACKAGE_NAME}@latest`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}
