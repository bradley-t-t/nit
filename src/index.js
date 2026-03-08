#!/usr/bin/env node

import { SYMBOLS } from "./utils/constants.js";
import { ui } from "./cli/ui.js";
import { run as runCleanup } from "./cleanup/cleanup.js";
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
} from "./git/git.js";
import {
  loadEnv,
  getApiKeyForProvider,
  checkNodeModules,
  detectBuildCommand,
  detectFormatCommand,
} from "./config/env.js";
import {
  validateApiKey,
  readNitConfig,
  incrementVersion,
  writeNitConfig,
  updateChangelog,
} from "./config/config.js";
import { generateCommitMessage } from "./api/api.js";
import {
  parseArgs,
  interactiveMenu,
  promptCleanup,
  checkForUpdates,
  performUpdate,
  reExecuteAfterUpdate,
  providerSetup,
} from "./cli/cli.js";

const args = process.argv.slice(2);
let originalNitConfig = null;

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

async function main() {
  const cliOptions = parseArgs(args);

  ui.printHeader();

  // Handle --update: update nit and exit
  if (cliOptions.update) {
    ui.printHeaderWithStatus("Checking for updates...");
    const updateInfo = await checkForUpdates();
    if (updateInfo.hasUpdate) {
      ui.printHeaderWithStatus(
        `Update available: v${updateInfo.currentVersion} ${SYMBOLS.arrow} v${updateInfo.latestVersion}`,
      );
      const updated = await performUpdate();
      if (updated) {
        ui.printHeaderWithStatus(`Updated to v${updateInfo.latestVersion}`);
      } else {
        ui.printHeaderWithStatus("Update failed");
      }
    } else {
      ui.printHeaderWithStatus(
        `Already on latest version (v${updateInfo.currentVersion})`,
      );
    }
    process.exit(0);
  }

  ui.printHeaderWithStatus("Checking for updates...");

  if (!cliOptions.skipUpdate) {
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

  ui.printHeaderWithStatus("Initializing...");

  let interactiveOptions = {};
  if (cliOptions.interactive) {
    interactiveOptions = await interactiveMenu();
  }

  ui.printHeaderWithStatus("Running pre-flight checks...");

  try {
    checkGitInstalled();
  } catch (err) {
    ui.printHeaderWithStatus(`Pre-flight failed: ${err.message}`);
    process.exit(1);
  }

  try {
    checkGitRepository();
  } catch (err) {
    ui.printHeaderWithStatus(`Pre-flight failed: ${err.message}`);
    process.exit(1);
  }

  try {
    checkGitRemote();
  } catch (err) {
    ui.printHeaderWithStatus(`Pre-flight failed: ${err.message}`);
    process.exit(1);
  }

  checkNodeModules();

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

  // Provider setup: run if --setup flag passed or no provider configured yet
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

  const projectName = nitConfig.projectName;
  const branch =
    interactiveOptions.branch || cliOptions.branch || nitConfig.branch;
  const newVersion = incrementVersion(nitConfig.version);

  ui.printHeaderWithStatus(
    `Preparing release: v${nitConfig.version} ${SYMBOLS.arrow} v${newVersion}`,
  );

  const logsPreset = cliOptions.cleanLogs;
  const cssPreset = cliOptions.cleanCss;
  const bothPreset = logsPreset !== null && cssPreset !== null;

  let cleanLogs, cleanCss;
  if (bothPreset) {
    cleanLogs = logsPreset;
    cleanCss = cssPreset;
  } else {
    const prompted = await promptCleanup();
    cleanLogs = logsPreset !== null ? logsPreset : prompted.cleanLogs;
    cleanCss = cssPreset !== null ? cssPreset : prompted.cleanCss;
  }

  if (cleanLogs || cleanCss) {
    ui.printHeaderWithStatus("Running code cleanup...");
    try {
      const cleanupResult = await runCleanup(process.cwd(), {
        cleanLogs,
        cleanCss,
      });
      if (cleanupResult.consoleLogsRemoved > 0) {
        ui.printHeaderWithStatus(
          `Removed ${cleanupResult.consoleLogsRemoved} `,
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

  ui.printHeaderWithStatus("Checking for changes...");
  const diff = getGitDiff();

  if (!hasChanges() && !diff.trim()) {
    ui.printHeaderWithStatus("No changes detected - Release skipped");
    process.exit(0);
  }

  ui.printHeaderWithStatus("Updating version files...");
  try {
    const updatedConfig = {
      version: newVersion,
      projectName,
      branch: nitConfig.branch,
      provider: providerId,
    };
    writeNitConfig(updatedConfig);
  } catch (err) {
    ui.printHeaderWithStatus(`Version update failed: ${err.message}`);
    process.exit(1);
  }

  ui.printHeaderWithStatus("Running production build...");
  if (!interactiveOptions.skipBuild) {
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

  ui.printHeaderWithStatus("Staging all changes...");
  try {
    execCommand("git add -A", { silent: true });
  } catch (err) {
    ui.printHeaderWithStatus(`Staging failed: ${err.message}`);
    exitWithRollback(1);
  }

  const finalDiff = getGitDiff(true);
  const finalStat = getGitDiffStat(true);
  const finalChangedFiles = getChangedFiles(true);

  ui.printHeaderWithStatus("Generating release notes with AI...");

  const today = new Date().toISOString().split("T")[0];
  let commitMessage;
  try {
    commitMessage = await generateCommitMessage(
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

  // Derive changelog from commit message bullet points
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

  // Re-stage after changelog update
  try {
    execCommand("git add -A", { silent: true });
  } catch {}

  ui.printHeaderWithStatus("Committing and pushing...");

  try {
    gitCommit(commitMessage);
  } catch (err) {
    ui.printHeaderWithStatus(`Commit failed: ${err.message}`);
    exitWithRollback(1);
  }

  try {
    gitPush(branch);
  } catch (err) {
    ui.printHeaderWithStatus(`Push failed: ${err.message}`);
    exitWithRollback(1);
  }

  ui.printHeaderWithStatus(`Release Complete! v${newVersion}`);
}

main().catch((err) => {
  ui.showCursor();
  const errorOutput = err.details?.output;
  if (errorOutput) {
    ui.printHeaderWithError(`Release Failed: ${err.message}`, errorOutput);
  } else {
    ui.printHeaderWithStatus(`Release Failed: ${err.message}`);
  }
  rollbackVersion();
  process.exit(1);
});
