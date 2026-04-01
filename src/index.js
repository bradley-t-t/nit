#!/usr/bin/env node

import { COLORS, SYMBOLS } from "./utils/constants.js";
import { ui } from "./cli/ui.js";
import { run as runCleanup } from "./cleanup/cleanup.js";
import { executeHook } from "./hooks/hooks.js";
import {
  checkGitInstalled,
  checkGitRepository,
  checkGitRemote,
  hasChanges,
  getGitDiff,
  getGitDiffStat,
  getChangedFiles,
  gitCommit,
  gitPush,
  runBuild,
  execCommand,
  stageChanges,
  createBranch,
  getCurrentBranch,
  gitPushNewBranch,
} from "./git/git.js";
import {
  loadEnv,
  getApiKeyForProvider,
  checkNodeModules,
  detectBuildCommand,
  detectFormatCommand,
  isNodeProject,
} from "./config/env.js";
import {
  validateApiKey,
  readNitConfig,
  incrementVersion,
  writeNitConfig,
  updateChangelog,
} from "./config/config.js";
import {
  generateReleaseCommitMessage,
  generateConventionalCommitMessage,
} from "./api/api.js";
import {
  parseArgs,
  interactiveMenu,
  checkForUpdates,
  performUpdate,
  reExecuteAfterUpdate,
  providerSetup,
} from "./cli/cli.js";

const args = process.argv.slice(2);
let originalNitConfig = null;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function rollbackVersion() {
  if (originalNitConfig) {
    try {
      writeNitConfig(originalNitConfig);
    } catch {}
  }
}

function exitWithRollback(code = 1) {
  rollbackVersion();
  process.exit(code);
}

/** Checks for nit updates and auto-updates if available. Returns true if process should exit. */
async function handleUpdateCheck(cliOptions) {
  if (cliOptions.update) {
    ui.printHeaderWithStatus("Checking for updates...");
    const updateInfo = await checkForUpdates();
    if (updateInfo.hasUpdate) {
      ui.printHeaderWithStatus(
        `Update available: v${updateInfo.currentVersion} ${SYMBOLS.arrow} v${updateInfo.latestVersion}`,
      );
      const updated = await performUpdate();
      ui.printHeaderWithStatus(
        updated ? `Updated to v${updateInfo.latestVersion}` : "Update failed",
      );
    } else {
      ui.printHeaderWithStatus(
        `Already on latest version (v${updateInfo.currentVersion})`,
      );
    }
    return true;
  }

  if (!cliOptions.skipUpdate) {
    ui.printHeaderWithStatus("Checking for updates...");
    const updateInfo = await checkForUpdates();
    if (updateInfo.hasUpdate) {
      ui.printHeaderWithStatus(
        `Update available: v${updateInfo.currentVersion} ${SYMBOLS.arrow} v${updateInfo.latestVersion}`,
      );
      ui.printHeaderWithStatus("Auto-updating nit...");
      const updated = await performUpdate();
      if (updated) {
        ui.printHeaderWithStatus(
          `Updated to v${updateInfo.latestVersion} - Restarting...`,
        );
        const restarted = reExecuteAfterUpdate();
        process.exit(restarted ? 0 : 1);
      }
      ui.printHeaderWithStatus(
        `Update failed, continuing with v${updateInfo.currentVersion}`,
      );
    }
  }

  return false;
}

/** Runs git pre-flight checks: installed, repository, remote. */
function runPreflightChecks() {
  ui.printHeaderWithStatus("Running pre-flight checks...");
  try {
    checkGitInstalled();
    checkGitRepository();
    checkGitRemote();
  } catch (err) {
    ui.printHeaderWithStatus(`Pre-flight failed: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Loads environment, reads nit config, handles provider setup.
 * @returns {{ nitConfig: object, providerId: string, apiKey: string }}
 */
async function loadConfigAndEnv(cliOptions) {
  const nodeProject = isNodeProject();
  if (nodeProject) checkNodeModules();

  ui.printHeaderWithStatus("Loading environment...");
  loadEnv();

  ui.printHeaderWithStatus("Reading project config...");
  let nitConfig;
  try {
    nitConfig = readNitConfig();
    originalNitConfig = { ...nitConfig };
  } catch (err) {
    ui.printHeaderWithStatus(`Config error: ${err.message}`);
    process.exit(1);
  }

  let providerId = nitConfig.provider;
  if (cliOptions.setup || !providerId) {
    providerId = await providerSetup();
    nitConfig.provider = providerId;
    try {
      writeNitConfig(nitConfig);
      originalNitConfig = { ...nitConfig };
    } catch {}
    if (cliOptions.setup) {
      ui.printHeaderWithStatus("Provider setup complete");
      process.exit(0);
    }
  }

  const apiKey = getApiKeyForProvider(providerId);
  try {
    validateApiKey(apiKey, providerId);
  } catch (err) {
    ui.printHeaderWithStatus(`Environment error: ${err.message}`);
    process.exit(1);
  }

  return { nitConfig, providerId, apiKey, nodeProject };
}

/**
 * Resolves the AI provider id and api key from config.
 * @returns {{ providerId: string, apiKey: string }}
 */
function resolveProvider(nitConfig) {
  const providerId = nitConfig.provider;
  const apiKey = getApiKeyForProvider(providerId);
  return { providerId, apiKey };
}

/** Runs code cleanup (log removal, CSS pruning) for Node projects. */
async function runCodeCleanup(
  cliOptions,
  nitConfig,
  nodeProject,
  interactiveOptions = {},
) {
  if (!nodeProject) {
    ui.printHeaderWithStatus(
      "Non-Node project detected, skipping cleanup and format",
    );
    return;
  }

  const logsPreset = cliOptions.cleanLogs;
  const cssPreset = cliOptions.cleanCss;
  const cleanLogs = logsPreset !== null ? logsPreset : !!nitConfig.cleanLogs;
  const cleanCss = cssPreset !== null ? cssPreset : !!nitConfig.cleanCss;

  if (cleanLogs || cleanCss) {
    ui.printHeaderWithStatus("Running code cleanup...");
    try {
      const cleanupResult = await runCleanup(process.cwd(), {
        cleanLogs,
        cleanCss,
      });
      if (cleanupResult.consoleLogsRemoved > 0) {
        ui.printHeaderWithStatus(
          `Removed ${cleanupResult.consoleLogsRemoved} console.log statement(s)`,
        );
      }
      if (cleanupResult.cssClassesRemoved > 0) {
        ui.printHeaderWithStatus(
          `Removed ${cleanupResult.cssClassesRemoved} unused CSS class(es)`,
        );
      }
    } catch {}
  } else {
    ui.printHeaderWithStatus("Skipping code cleanup");
  }

  ui.printHeaderWithStatus("Running code formatter...");
  if (!interactiveOptions.skipFormat) {
    const formatResult = detectFormatCommand();
    if (formatResult.command) {
      try {
        execCommand(formatResult.command, { silent: true, ignoreError: false });
      } catch {}
    }
  }
}

/** Runs only the code formatter for Node projects. */
async function runCodeFormatter(nodeProject, interactiveOptions = {}) {
  if (!nodeProject) return;
  if (interactiveOptions.skipFormat) return;

  ui.printHeaderWithStatus("Running code formatter...");
  const formatResult = detectFormatCommand();
  if (formatResult.command) {
    try {
      execCommand(formatResult.command, { silent: true, ignoreError: false });
    } catch {}
  }
}

/**
 * Resolves which staging mode to use.
 * @param {object} cliOptions
 * @param {"all" | "tracked"} defaultMode
 * @returns {"all" | "tracked"}
 */
function resolveStagingMode(cliOptions, defaultMode = "all") {
  if (cliOptions.stageAll) return "all";
  if (cliOptions.stageTracked) return "tracked";
  return defaultMode;
}

// ---------------------------------------------------------------------------
// Subcommand implementations
// ---------------------------------------------------------------------------

/** Full release pipeline: cleanup, format, version bump, changelog, build, AI message, commit, push. */
async function runRelease(cliOptions) {
  let interactiveOptions = {};
  if (cliOptions.interactive) {
    interactiveOptions = await interactiveMenu();
  }

  runPreflightChecks();

  const { nitConfig, providerId, apiKey, nodeProject } =
    await loadConfigAndEnv(cliOptions);

  const projectName = nitConfig.projectName;
  const branch =
    interactiveOptions.branch || cliOptions.branch || nitConfig.branch;
  const newVersion = incrementVersion(nitConfig.version, cliOptions.bump);

  ui.printHeaderWithStatus(
    `Preparing release: v${nitConfig.version} ${SYMBOLS.arrow} v${newVersion}`,
  );

  const hooks = nitConfig.hooks || {};
  const hookOptions = { dryRun: cliOptions.dryRun };

  executeHook("preRelease", hooks, hookOptions);

  // Cleanup + format
  await runCodeCleanup(cliOptions, nitConfig, nodeProject, interactiveOptions);

  ui.printHeaderWithStatus("Checking for changes...");
  const diff = getGitDiff();

  if (!hasChanges() && !diff.trim()) {
    ui.printHeaderWithStatus("No changes detected - Release skipped");
    process.exit(0);
  }

  if (cliOptions.dryRun) {
    ui.dryRun(`Would bump version to v${newVersion}`);
    ui.dryRun(`Would commit and push to ${branch}`);
    executeHook("postRelease", hooks, hookOptions);
    ui.printHeaderWithStatus(`Dry run complete for v${newVersion}`);
    return;
  }

  // Update version files
  ui.printHeaderWithStatus("Updating version files...");
  try {
    const updatedConfig = {
      version: newVersion,
      projectName,
      branch: nitConfig.branch,
      provider: providerId,
      cleanLogs: nitConfig.cleanLogs,
      cleanCss: nitConfig.cleanCss,
      hooks,
    };
    writeNitConfig(updatedConfig);
  } catch (err) {
    ui.printHeaderWithStatus(`Version update failed: ${err.message}`);
    process.exit(1);
  }

  // Build
  if (nodeProject && !interactiveOptions.skipBuild) {
    ui.printHeaderWithStatus("Running production build...");
    const buildCommand = detectBuildCommand();
    if (buildCommand) {
      try {
        await runBuild(buildCommand);
      } catch (err) {
        const errorOutput = err.details?.output || err.message;
        ui.printHeaderWithError("Build failed", errorOutput);
        exitWithRollback(1);
      }
    }
  }

  // Stage
  ui.printHeaderWithStatus("Staging all changes...");
  stageChanges(resolveStagingMode(cliOptions, "all"));

  const finalDiff = getGitDiff(true);
  const finalStat = getGitDiffStat(true);
  const finalChangedFiles = getChangedFiles(true);

  // AI release message
  ui.printHeaderWithStatus("Generating release notes with AI...");
  const today = new Date().toISOString().split("T")[0];
  let commitMessage;
  try {
    commitMessage = await generateReleaseCommitMessage(
      apiKey,
      newVersion,
      projectName,
      finalDiff,
      finalStat,
      finalChangedFiles,
      providerId,
    );
  } catch (err) {
    ui.printHeaderWithStatus(`AI unavailable, using fallback: ${err.message}`);
    commitMessage = `${projectName}: Release v${newVersion}`;
  }

  // Changelog
  const bulletLines = commitMessage
    .split("\n")
    .filter((line) => line.trimStart().startsWith("-"));
  const changelogBody =
    bulletLines.length > 0
      ? bulletLines.join("\n")
      : `- ${projectName} Release v${newVersion}`;
  const changelogEntry = `## [${newVersion}] - ${today}\n\n${changelogBody}\n`;

  process.stdout.write(`\n${changelogEntry}\n`);

  ui.printHeaderWithStatus("Updating CHANGELOG.md...");
  try {
    updateChangelog(changelogEntry);
  } catch (err) {
    ui.printHeaderWithStatus(`Changelog update failed: ${err.message}`);
    exitWithRollback(1);
  }

  // Re-stage after changelog
  stageChanges("all");

  // Commit + push
  executeHook("preCommit", hooks, hookOptions);

  ui.printHeaderWithStatus("Committing and pushing...");
  try {
    gitCommit(commitMessage);
  } catch (err) {
    ui.printHeaderWithStatus(`Commit failed: ${err.message}`);
    exitWithRollback(1);
  }

  executeHook("postCommit", hooks, hookOptions);
  executeHook("prePush", hooks, hookOptions);

  try {
    gitPush(branch);
  } catch (err) {
    ui.printHeaderWithStatus(`Push failed: ${err.message}`);
    exitWithRollback(1);
  }

  executeHook("postPush", hooks, hookOptions);
  executeHook("postRelease", hooks, hookOptions);

  ui.printHeaderWithStatus(`Release Complete! v${newVersion}`);
}

/** Lighter commit pipeline: stage, optional cleanup, conventional commit, push. */
async function runCommitCommand(cliOptions) {
  runPreflightChecks();

  const { nitConfig, providerId, apiKey, nodeProject } =
    await loadConfigAndEnv(cliOptions);

  const projectName = nitConfig.projectName;
  const commitType = cliOptions.commitType || "chore";
  const hooks = nitConfig.hooks || {};
  const hookOptions = { dryRun: cliOptions.dryRun };

  // Branch creation
  if (cliOptions.branchCreate) {
    ui.printHeaderWithStatus(`Creating branch: ${cliOptions.branchCreate}`);
    if (!cliOptions.dryRun) {
      createBranch(cliOptions.branchCreate);
    } else {
      ui.dryRun(`Would create branch "${cliOptions.branchCreate}"`);
    }
  }

  // Optional cleanup (only if explicitly requested via flags)
  if (cliOptions.cleanLogs !== null || cliOptions.cleanCss !== null) {
    await runCodeCleanup(cliOptions, nitConfig, nodeProject);
  }

  // Format
  await runCodeFormatter(nodeProject);

  // Stage
  const stagingMode = resolveStagingMode(cliOptions, "tracked");
  ui.printHeaderWithStatus(`Staging changes (${stagingMode})...`);
  if (!cliOptions.dryRun) {
    stageChanges(stagingMode);
  } else {
    ui.dryRun(`Would stage changes with mode "${stagingMode}"`);
  }

  // Check for changes
  if (!cliOptions.dryRun && !hasChanges()) {
    ui.printHeaderWithStatus("No changes to commit");
    process.exit(0);
  }

  // Resolve commit message
  let commitMessage;
  if (cliOptions.message) {
    commitMessage = cliOptions.message;
  } else {
    const diff = getGitDiff(true);
    const stat = getGitDiffStat(true);
    const changedFiles = getChangedFiles(true);

    ui.printHeaderWithStatus("Generating commit message with AI...");
    try {
      commitMessage = await generateConventionalCommitMessage(
        apiKey,
        projectName,
        commitType,
        diff,
        stat,
        changedFiles,
        providerId,
      );
    } catch (err) {
      ui.printHeaderWithStatus(
        `AI unavailable, using fallback: ${err.message}`,
      );
      commitMessage = `${commitType}(general): update`;
    }
  }

  if (cliOptions.dryRun) {
    ui.dryRun(`Would commit with message: ${commitMessage.split("\n")[0]}`);
    ui.printHeaderWithStatus("Dry run complete");
    return;
  }

  // Commit
  executeHook("preCommit", hooks, hookOptions);

  ui.printHeaderWithStatus("Committing...");
  try {
    gitCommit(commitMessage);
  } catch (err) {
    ui.printHeaderWithStatus(`Commit failed: ${err.message}`);
    process.exit(1);
  }

  executeHook("postCommit", hooks, hookOptions);

  // Push
  executeHook("prePush", hooks, hookOptions);

  const branch =
    cliOptions.branch || cliOptions.branchCreate || getCurrentBranch();
  ui.printHeaderWithStatus(`Pushing to ${branch}...`);
  try {
    if (cliOptions.branchCreate) {
      gitPushNewBranch(branch);
    } else {
      gitPush(branch);
    }
  } catch (err) {
    ui.printHeaderWithStatus(`Push failed: ${err.message}`);
    process.exit(1);
  }

  executeHook("postPush", hooks, hookOptions);

  ui.printHeaderWithStatus("Commit complete!");
}

/** Runs code cleanup only, no git operations. */
async function runCleanCommand(cliOptions) {
  const nodeProject = isNodeProject();
  if (!nodeProject) {
    ui.printHeaderWithStatus("Non-Node project detected, nothing to clean");
    return;
  }

  if (nodeProject) checkNodeModules();

  let nitConfig;
  try {
    nitConfig = readNitConfig();
  } catch (err) {
    ui.printHeaderWithStatus(`Config error: ${err.message}`);
    process.exit(1);
  }

  // Default to cleaning everything when run standalone
  const cleanLogs =
    cliOptions.cleanLogs !== null
      ? cliOptions.cleanLogs
      : !!nitConfig.cleanLogs;
  const cleanCss =
    cliOptions.cleanCss !== null ? cliOptions.cleanCss : !!nitConfig.cleanCss;

  if (!cleanLogs && !cleanCss) {
    ui.printHeaderWithStatus("No cleanup tasks enabled");
    return;
  }

  if (cliOptions.dryRun) {
    if (cleanLogs) ui.dryRun("Would remove console.log statements");
    if (cleanCss) ui.dryRun("Would remove unused CSS classes");
    ui.printHeaderWithStatus("Dry run complete");
    return;
  }

  ui.printHeaderWithStatus("Running code cleanup...");
  try {
    const result = await runCleanup(process.cwd(), { cleanLogs, cleanCss });
    if (result.consoleLogsRemoved > 0) {
      ui.printHeaderWithStatus(
        `Removed ${result.consoleLogsRemoved} console.log statement(s)`,
      );
    }
    if (result.cssClassesRemoved > 0) {
      ui.printHeaderWithStatus(
        `Removed ${result.cssClassesRemoved} unused CSS class(es)`,
      );
    }
  } catch (err) {
    ui.printHeaderWithStatus(`Cleanup failed: ${err.message}`);
  }

  ui.printHeaderWithStatus("Cleanup complete");
}

/** Prints project info: name, version, branch, provider. */
async function runStatusCommand() {
  let nitConfig;
  try {
    nitConfig = readNitConfig();
  } catch (err) {
    ui.printHeaderWithStatus(`Config error: ${err.message}`);
    process.exit(1);
  }

  const nodeProject = isNodeProject();
  let currentBranch = "unknown";
  try {
    currentBranch = getCurrentBranch();
  } catch {}

  process.stdout.write(`
  ${COLORS.bright}Project Status${COLORS.reset}
  ${COLORS.dim}${"─".repeat(35)}${COLORS.reset}
  ${COLORS.brightBlue}Project${COLORS.reset}     ${nitConfig.projectName}
  ${COLORS.brightBlue}Version${COLORS.reset}     v${nitConfig.version}
  ${COLORS.brightBlue}Branch${COLORS.reset}      ${currentBranch} ${COLORS.dim}(config: ${nitConfig.branch})${COLORS.reset}
  ${COLORS.brightBlue}Provider${COLORS.reset}    ${nitConfig.provider || "not configured"}
  ${COLORS.brightBlue}Node${COLORS.reset}        ${nodeProject ? "yes" : "no"}
  ${COLORS.brightBlue}Clean Logs${COLORS.reset}  ${nitConfig.cleanLogs ? "enabled" : "disabled"}
  ${COLORS.brightBlue}Clean CSS${COLORS.reset}   ${nitConfig.cleanCss ? "enabled" : "disabled"}
  ${COLORS.brightBlue}Hooks${COLORS.reset}       ${Object.keys(nitConfig.hooks || {}).length > 0 ? Object.keys(nitConfig.hooks).join(", ") : "none"}
  ${COLORS.dim}${"─".repeat(35)}${COLORS.reset}
`);
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

async function main() {
  const cliOptions = parseArgs(args);

  // Set output level before anything else
  if (cliOptions.ci || cliOptions.quiet) {
    ui.setOutputLevel("quiet");
  } else if (cliOptions.verbose) {
    ui.setOutputLevel("verbose");
  }

  ui.printHeader();

  // Handle --update early exit
  const shouldExit = await handleUpdateCheck(cliOptions);
  if (shouldExit) process.exit(0);

  ui.printHeaderWithStatus("Initializing...");

  switch (cliOptions.command) {
    case "release":
      await runRelease(cliOptions);
      break;
    case "commit":
      await runCommitCommand(cliOptions);
      break;
    case "clean":
      await runCleanCommand(cliOptions);
      break;
    case "status":
      await runStatusCommand();
      break;
    default:
      await runRelease(cliOptions);
  }
}

main().catch((err) => {
  ui.showCursor();
  const errorOutput = err.details?.output;
  if (errorOutput) {
    ui.printHeaderWithError(`Failed: ${err.message}`, errorOutput);
  } else {
    ui.printHeaderWithStatus(`Failed: ${err.message}`);
  }
  rollbackVersion();
  process.exit(1);
});
