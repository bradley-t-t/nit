#!/usr/bin/env node

import { SYMBOLS } from "./constants.js";
import { ui } from "./ui.js";
import { run as runCleanup } from "./cleanup.js";
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
} from "./git.js";
import {
  loadEnv,
  getApiKey,
  checkNodeModules,
  detectBuildCommand,
  detectFormatCommand,
} from "./env.js";
import {
  validateApiKey,
  readNitConfig,
  incrementVersion,
  writeNitConfig,
  updateChangelog,
} from "./config.js";
import { generateChangelog, generateCommitMessage } from "./api.js";
import {
  parseArgs,
  interactiveMenu,
  checkForUpdates,
  performUpdate,
  reExecuteAfterUpdate,
} from "./cli.js";

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
  const apiKey = getApiKey();

  try {
    validateApiKey(apiKey);
  } catch (err) {
    ui.printHeaderWithStatus(`Environment error: ${err.message}`);
    process.exit(1);
  }

  ui.printHeaderWithStatus("Reading project config...");
  let nitConfig;
  try {
    nitConfig = readNitConfig();
    originalNitConfig = { ...nitConfig };
  } catch (err) {
    ui.printHeaderWithStatus(`Config error: ${err.message}`);
    process.exit(1);
  }

  const projectName = nitConfig.projectName;
  const branch =
    interactiveOptions.branch || cliOptions.branch || nitConfig.branch;
  const newVersion = incrementVersion(nitConfig.version);

  ui.printHeaderWithStatus(
    `Preparing release: v${nitConfig.version} ${SYMBOLS.arrow} v${newVersion}`,
  );

  if (cliOptions.dryRun) {
    ui.printHeaderWithStatus("DRY RUN MODE - No changes will be made");
  }

  ui.printHeaderWithStatus("Running code cleanup...");
  try {
    await runCleanup(process.cwd());
  } catch {}

  ui.printHeaderWithStatus("Running code formatter...");
  if (!interactiveOptions.skipFormat) {
    const formatResult = detectFormatCommand();
    if (formatResult.command) {
      try {
        if (!cliOptions.dryRun)
          execCommand(formatResult.command, {
            silent: true,
            ignoreError: false,
          });
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
    };
    if (!cliOptions.dryRun) writeNitConfig(updatedConfig);
  } catch (err) {
    ui.printHeaderWithStatus(`Version update failed: ${err.message}`);
    process.exit(1);
  }

  ui.printHeaderWithStatus("Generating changelog with AI...");
  let changelogEntry;
  const changelogDiff = getGitDiff(true);
  const changelogStat = getGitDiffStat(true);
  const changelogFiles = getChangedFiles(true);
  const today = new Date().toISOString().split("T")[0];
  const fallbackChangelog = `## [${newVersion}] - ${today}\n\n- ${projectName} Release v${newVersion}`;
  try {
    changelogEntry = await generateChangelog(
      apiKey,
      newVersion,
      projectName,
      changelogDiff,
      changelogStat,
      changelogFiles,
    );
  } catch (err) {
    ui.printHeaderWithStatus(
      `AI changelog unavailable, using fallback: ${err.message}`,
    );
    changelogEntry = fallbackChangelog;
  }

  process.stdout.write(`\n${changelogEntry}\n`);

  ui.printHeaderWithStatus("Updating CHANGELOG.md...");
  try {
    if (!cliOptions.dryRun) updateChangelog(changelogEntry);
  } catch (err) {
    ui.printHeaderWithStatus(`Changelog update failed: ${err.message}`);
    exitWithRollback(1);
  }

  ui.printHeaderWithStatus("Running production build...");
  if (!interactiveOptions.skipBuild) {
    const buildCommand = detectBuildCommand();
    if (buildCommand) {
      try {
        if (!cliOptions.dryRun) await runBuild(buildCommand);
      } catch (err) {
        const errorOutput = err.details?.output || err.message;
        ui.printHeaderWithError("Build failed", errorOutput);
        exitWithRollback(1);
      }
    }
  }

  ui.printHeaderWithStatus("Staging all changes...");
  try {
    if (!cliOptions.dryRun) execCommand("git add -A", { silent: true });
  } catch (err) {
    ui.printHeaderWithStatus(`Staging failed: ${err.message}`);
    exitWithRollback(1);
  }

  const finalDiff = getGitDiff(true);
  const finalStat = getGitDiffStat(true);
  const finalChangedFiles = getChangedFiles(true);

  ui.printHeaderWithStatus("Committing and pushing...");

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
  } catch (err) {
    ui.printHeaderWithStatus(
      `AI commit message unavailable, using fallback: ${err.message}`,
    );
    commitMessage = `${projectName}: Release v${newVersion}`;
  }

  if (!cliOptions.dryRun) {
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
