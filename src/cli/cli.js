import { execSync, spawnSync } from "child_process";
import {
  PACKAGE_NAME,
  PACKAGE_VERSION,
  GITHUB_REPO,
  GITHUB_BRANCH,
  SUBCOMMANDS,
  DEFAULT_SUBCOMMAND,
  DEFAULT_BUMP,
  COMMIT_TYPES,
  ErrorCodes,
} from "../utils/constants.js";
import { NitError } from "../utils/errors.js";
import {
  renderProviderSelect,
  renderInteractiveMenu,
  renderCleanupPrompt,
  renderHelp,
} from "../ink/render.js";

/**
 * Parses CLI arguments into a structured options object.
 * @param {string[]} args
 * @returns {object}
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

    if (!arg.startsWith("-") && !options.command && SUBCOMMANDS.includes(arg)) {
      options.command = arg;
      continue;
    }

    if (arg === "--branch-create") {
      options.branchCreate = args[++i];
      continue;
    }
    if (arg.startsWith("--branch-create=")) {
      options.branchCreate = arg.split("=")[1];
      continue;
    }

    if (arg === "--message" || arg === "-m") {
      options.message = args[++i];
      continue;
    }
    if (arg.startsWith("--message=")) {
      options.message = arg.split("=").slice(1).join("=");
      continue;
    }

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
    if (arg === "--stage-all") {
      options.stageAll = true;
      continue;
    }
    if (arg === "--stage-tracked") {
      options.stageTracked = true;
      continue;
    }

    if (arg === "--ci") {
      options.ci = true;
      options.quiet = true;
      options.skipUpdate = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

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
      renderHelp();
      process.exit(0);
    }
  }

  if (!options.command) options.command = DEFAULT_SUBCOMMAND;
  return options;
}

/**
 * Interactive AI provider selection via Ink.
 * @returns {Promise<string>} Selected provider ID.
 */
export async function providerSetup() {
  return renderProviderSelect();
}

/**
 * Interactive menu for branch, build, and format preferences via Ink.
 * @returns {Promise<{ branch: string|null, skipBuild: boolean, skipFormat: boolean }>}
 */
export async function interactiveMenu() {
  return renderInteractiveMenu();
}

/**
 * Interactive cleanup prompt via Ink.
 * @returns {Promise<{ cleanLogs: boolean, cleanCss: boolean }>}
 */
export async function promptCleanup() {
  return renderCleanupPrompt();
}

/** Compares installed version against latest on GitHub. */
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

/** Detects whether nit is installed globally or locally. */
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

/** Installs the latest nit from GitHub. */
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
  // Explicit args array to prevent CWE-78 command injection
  const result = spawnSync("node", [binPath, "--skip-update", ...args], {
    stdio: "inherit",
    cwd: process.cwd(),
  });
  return result.status === 0;
}
