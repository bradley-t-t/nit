import { execSync, spawnSync } from "child_process";
import {
  COLORS,
  SYMBOLS,
  PACKAGE_NAME,
  PACKAGE_VERSION,
  GITHUB_REPO,
  GITHUB_BRANCH,
  AI_PROVIDERS,
  SUBCOMMANDS,
  DEFAULT_SUBCOMMAND,
  BUMP_TYPES,
  DEFAULT_BUMP,
  COMMIT_TYPES,
  ErrorCodes,
} from "../utils/constants.js";
import { NitError } from "../utils/errors.js";

/**
 * Parses CLI arguments into a structured options object.
 * Supports subcommand detection, bump type flags, commit type, message, branch creation,
 * staging modes, CI mode, dry-run, and all legacy flags.
 * @param {string[]} args - Raw process.argv.slice(2) arguments.
 * @returns {object} Parsed CLI options.
 */
export function parseArgs(args) {
  const options = {
    command: null,
    bump: DEFAULT_BUMP,
    branch: null,
    branchCreate: null,
    message: null,
    commitType: null,
    stageAll: false,
    stageTracked: false,
    dryRun: false,
    ci: false,
    skipUpdate: false,
    interactive: false,
    verbose: false,
    quiet: false,
    setup: false,
    update: false,
    cleanLogs: null,
    cleanCss: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Subcommand detection (first non-flag arg matching SUBCOMMANDS)
    if (!arg.startsWith("-") && !options.command && SUBCOMMANDS.includes(arg)) {
      options.command = arg;
      continue;
    }

    // Branch create
    if (arg === "--branch-create") {
      options.branchCreate = args[++i];
      continue;
    }
    if (arg.startsWith("--branch-create=")) {
      options.branchCreate = arg.split("=")[1];
      continue;
    }

    // Message
    if (arg === "--message" || arg === "-m") {
      options.message = args[++i];
      continue;
    }
    if (arg.startsWith("--message=")) {
      options.message = arg.split("=").slice(1).join("=");
      continue;
    }

    // Commit type
    if (arg === "--type" || arg === "-t") {
      const typeValue = args[++i];
      if (!COMMIT_TYPES.includes(typeValue)) {
        throw new NitError(
          `Invalid commit type: "${typeValue}". Valid types: ${COMMIT_TYPES.join(", ")}`,
          ErrorCodes.INVALID_ARGUMENT,
        );
      }
      options.commitType = typeValue;
      continue;
    }
    if (arg.startsWith("--type=")) {
      const typeValue = arg.split("=")[1];
      if (!COMMIT_TYPES.includes(typeValue)) {
        throw new NitError(
          `Invalid commit type: "${typeValue}". Valid types: ${COMMIT_TYPES.join(", ")}`,
          ErrorCodes.INVALID_ARGUMENT,
        );
      }
      options.commitType = typeValue;
      continue;
    }

    // Bump type flags
    if (arg === "--patch") {
      options.bump = "patch";
      continue;
    }
    if (arg === "--minor") {
      options.bump = "minor";
      continue;
    }
    if (arg === "--major") {
      options.bump = "major";
      continue;
    }

    // Staging modes
    if (arg === "--stage-all") {
      options.stageAll = true;
      continue;
    }
    if (arg === "--stage-tracked") {
      options.stageTracked = true;
      continue;
    }

    // CI mode
    if (arg === "--ci") {
      options.ci = true;
      options.quiet = true;
      options.skipUpdate = true;
      continue;
    }

    // Dry run
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    // Legacy flags
    if (arg === "--branch" || arg === "-b") {
      options.branch = args[++i];
      continue;
    }
    if (arg.startsWith("--branch=")) {
      options.branch = arg.split("=")[1];
      continue;
    }
    if (arg === "--skip-update" || arg === "-s") {
      options.skipUpdate = true;
      continue;
    }
    if (arg === "--interactive" || arg === "-i") {
      options.interactive = true;
      continue;
    }
    if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
      continue;
    }
    if (arg === "--quiet" || arg === "-q") {
      options.quiet = true;
      continue;
    }
    if (arg === "--setup") {
      options.setup = true;
      continue;
    }
    if (arg === "--update") {
      options.update = true;
      continue;
    }
    if (arg === "--clean-logs") {
      options.cleanLogs = true;
      continue;
    }
    if (arg === "--no-clean-logs") {
      options.cleanLogs = false;
      continue;
    }
    if (arg === "--clean-css") {
      options.cleanCss = true;
      continue;
    }
    if (arg === "--no-clean-css") {
      options.cleanCss = false;
      continue;
    }
    if (arg === "--clean-all") {
      options.cleanLogs = true;
      options.cleanCss = true;
      continue;
    }
    if (arg === "--no-clean") {
      options.cleanLogs = false;
      options.cleanCss = false;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  if (!options.command) options.command = DEFAULT_SUBCOMMAND;

  return options;
}

/** Prints the help text with all available commands, options, and examples. */
export function printHelp() {
  process.stdout.write(`
  ${COLORS.bright}Nit${COLORS.reset} ${COLORS.dim}v${PACKAGE_VERSION}${COLORS.reset}

  ${COLORS.bright}Usage:${COLORS.reset} nit [command] [options]

  ${COLORS.bright}Commands:${COLORS.reset}
    ${COLORS.brightBlue}release${COLORS.reset}              Full release pipeline ${COLORS.dim}(default)${COLORS.reset}
    ${COLORS.brightBlue}commit${COLORS.reset}               Commit changes with conventional commit message
    ${COLORS.brightBlue}clean${COLORS.reset}                Run code cleanup only (no git)
    ${COLORS.brightBlue}status${COLORS.reset}               Print project info

  ${COLORS.bright}Release Options:${COLORS.reset}
    ${COLORS.brightBlue}    --patch${COLORS.reset}           Bump patch version ${COLORS.dim}(default)${COLORS.reset}
    ${COLORS.brightBlue}    --minor${COLORS.reset}           Bump minor version
    ${COLORS.brightBlue}    --major${COLORS.reset}           Bump major version
    ${COLORS.brightBlue}    --dry-run${COLORS.reset}         Preview release without making changes

  ${COLORS.bright}Commit Options:${COLORS.reset}
    ${COLORS.brightBlue}-t, --type <type>${COLORS.reset}     Commit type (${COMMIT_TYPES.join(", ")})
    ${COLORS.brightBlue}-m, --message <msg>${COLORS.reset}   Custom commit message (skips AI)
    ${COLORS.brightBlue}    --branch-create <name>${COLORS.reset}  Create and switch to a new branch first
    ${COLORS.brightBlue}    --stage-all${COLORS.reset}       Stage all files (git add -A)
    ${COLORS.brightBlue}    --stage-tracked${COLORS.reset}   Stage tracked files only (git add -u)

  ${COLORS.bright}General Options:${COLORS.reset}
    ${COLORS.brightBlue}-b, --branch <name>${COLORS.reset}   Override branch to push to
    ${COLORS.brightBlue}-s, --skip-update${COLORS.reset}     Skip nit update check
    ${COLORS.brightBlue}-i, --interactive${COLORS.reset}     Interactive mode (prompts for options)
    ${COLORS.brightBlue}-v, --verbose${COLORS.reset}         Verbose output
    ${COLORS.brightBlue}-q, --quiet${COLORS.reset}           Minimal output
    ${COLORS.brightBlue}    --ci${COLORS.reset}              CI mode (quiet + skip update)
    ${COLORS.brightBlue}    --setup${COLORS.reset}           Re-run AI provider setup
    ${COLORS.brightBlue}    --update${COLORS.reset}          Manually update nit to the latest version
    ${COLORS.brightBlue}    --clean-logs${COLORS.reset}      Auto-answer Yes to remove console.log statements
    ${COLORS.brightBlue}    --no-clean-logs${COLORS.reset}   Auto-answer No to remove console.log statements
    ${COLORS.brightBlue}    --clean-css${COLORS.reset}       Auto-answer Yes to remove unused CSS classes
    ${COLORS.brightBlue}    --no-clean-css${COLORS.reset}    Auto-answer No to remove unused CSS classes
    ${COLORS.brightBlue}    --clean-all${COLORS.reset}       Auto-answer Yes to both cleanup prompts
    ${COLORS.brightBlue}    --no-clean${COLORS.reset}        Auto-answer No to both cleanup prompts
    ${COLORS.brightBlue}-h, --help${COLORS.reset}            Show this help

  ${COLORS.bright}Supported AI Providers:${COLORS.reset}
    ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} Claude Code (CLI)   ${COLORS.dim}Uses your Claude subscription${COLORS.reset}
    ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} Grok (xAI)          ${COLORS.dim}GROK_API_KEY${COLORS.reset}
    ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} OpenAI (GPT-4o)     ${COLORS.dim}OPENAI_API_KEY${COLORS.reset}
    ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} Anthropic (Claude)  ${COLORS.dim}ANTHROPIC_API_KEY${COLORS.reset}

  ${COLORS.bright}Examples:${COLORS.reset}
    ${COLORS.dim}nit${COLORS.reset}                            Run a full release (patch bump)
    ${COLORS.dim}nit release --minor${COLORS.reset}            Release with minor version bump
    ${COLORS.dim}nit release --major --dry-run${COLORS.reset}  Preview a major release
    ${COLORS.dim}nit commit -t feat${COLORS.reset}             Commit with "feat" type
    ${COLORS.dim}nit commit -m "fix typo"${COLORS.reset}       Commit with a manual message
    ${COLORS.dim}nit commit --branch-create feature/login${COLORS.reset}
    ${COLORS.dim}nit clean${COLORS.reset}                      Run cleanup only
    ${COLORS.dim}nit status${COLORS.reset}                     Show project info
    ${COLORS.dim}nit -b develop${COLORS.reset}                 Release to develop branch
    ${COLORS.dim}nit --clean-all${COLORS.reset}                Release with all cleanup enabled
    ${COLORS.dim}nit --ci${COLORS.reset}                       Quiet mode for CI pipelines
    ${COLORS.dim}nit --setup${COLORS.reset}                    Choose your AI provider
    ${COLORS.dim}nit --update${COLORS.reset}                   Update nit to latest version

`);
}

/**
 * Interactive prompt for selecting an AI provider.
 * @returns {Promise<string>} The selected provider ID string.
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
  ${COLORS.dim}Your choice is saved in public/nit.json.${COLORS.reset}
`);

  providerEntries.forEach(([, provider], index) => {
    const hint = provider.isCli
      ? "uses your Claude subscription"
      : `env: ${provider.envKeys[0]}`;
    process.stdout.write(
      `  ${COLORS.brightBlue}${index + 1}${COLORS.reset}) ${provider.name}  ${COLORS.dim}(${hint})${COLORS.reset}\n`,
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
  if (selectedProvider.isCli) {
    process.stdout.write(
      `  ${COLORS.dim}Make sure the 'claude' CLI is installed and authenticated.${COLORS.reset}\n\n`,
    );
  } else {
    process.stdout.write(
      `  ${COLORS.dim}Make sure ${selectedProvider.envKeys[0]} is set in your .env file.${COLORS.reset}\n`,
    );
    process.stdout.write(
      `  ${COLORS.dim}Get a key at: ${selectedProvider.signupUrl}${COLORS.reset}\n\n`,
    );
  }
  return selectedId;
}

/** Prompts the user for branch, build, and format preferences in interactive mode. */
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

/** Prompts the user whether to run console.log removal and unused CSS cleanup. */
export async function promptCleanup() {
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const question = (prompt) =>
    new Promise((resolve) => rl.question(prompt, resolve));

  process.stdout.write(
    `\n  ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} ${COLORS.bright}Code Cleanup${COLORS.reset}\n`,
  );

  const logsAnswer = await question(
    `    Remove console.log statements? ${COLORS.dim}(Y/n)${COLORS.reset} `,
  );
  const cleanLogs = logsAnswer.trim().toUpperCase() !== "N";

  const cssAnswer = await question(
    `    Remove unused CSS classes?      ${COLORS.dim}(Y/n)${COLORS.reset} `,
  );
  const cleanCss = cssAnswer.trim().toUpperCase() !== "N";

  process.stdout.write("\n");
  rl.close();
  return { cleanLogs, cleanCss };
}

/** Compares the installed version against the latest on GitHub to detect available updates. */
export async function checkForUpdates() {
  const currentVersion = PACKAGE_VERSION;
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/package.json`,
    );
    if (!response.ok) {
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        error: true,
      };
    }
    const remotePkg = await response.json();
    const latestVersion = remotePkg.version;

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

/** Detects whether nit is installed globally or locally in the project. */
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

/** Installs the latest nit from GitHub, respecting whether it's a global or local install. */
export async function performUpdate() {
  const installationType = detectInstallationType();
  const githubSpec = `github:${GITHUB_REPO}#${GITHUB_BRANCH}`;
  const updateCommand =
    installationType === "global"
      ? `npm install -g ${githubSpec}`
      : `npm install --save-dev ${githubSpec}`;

  try {
    execSync(updateCommand, { stdio: "pipe", cwd: process.cwd() });
    return true;
  } catch {
    return false;
  }
}

/** Re-runs nit after a self-update so the new version handles the release. */
export function reExecuteAfterUpdate() {
  const args = process.argv
    .slice(2)
    .filter((a) => a !== "--skip-update" && a !== "-s");
  const binPath = process.argv[1];
  // Use spawnSync with an explicit args array to avoid shell interpretation of
  // user-supplied arguments (CWE-78 command injection prevention).
  const result = spawnSync("node", [binPath, "--skip-update", ...args], {
    stdio: "inherit",
    cwd: process.cwd(),
  });
  return result.status === 0;
}
