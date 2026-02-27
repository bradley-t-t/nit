#!/usr/bin/env node

import { COLORS, SYMBOLS } from "./constants.js";
import { TurlError } from "./errors.js";
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
  ensureGitHooksInstalled,
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
  readTurlConfig,
  incrementVersion,
  writeTurlConfig,
  updateChangelog,
} from "./config.js";
import {
  generateChangelog,
  generateCommitMessage,
  checkRulesViolations,
  generateNewRules,
} from "./api.js";
import {
  readTurlRules,
  appendTurlRule,
  cleanupRulesFile,
  handlePostCommitHook,
} from "./rules.js";
import {
  parseArgs,
  interactiveMenu,
  promptUserForViolations,
  checkForUpdates,
  performUpdate,
} from "./cli.js";

const args = process.argv.slice(2);
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
  const cliOptions = parseArgs(args);

  if (args[0] === "_post-commit") {
    await handlePostCommitHook();
    process.exit(0);
  }

  ui.printHeaderWithStatus("Checking for updates...");

  if (!cliOptions.skipUpdate) {
    const updateInfo = await checkForUpdates();
    if (updateInfo.hasUpdate) {
      ui.printHeaderWithStatus(
        `${COLORS.bright}Update available: v${updateInfo.currentVersion} ${SYMBOLS.arrow} v${updateInfo.latestVersion}${COLORS.reset}`,
      );
      await new Promise((r) => setTimeout(r, 500));
      ui.printHeaderWithStatus("Auto-updating turl-release...");
      const updated = await performUpdate();
      if (updated) {
        ui.printHeaderWithStatus(
          `${COLORS.brightWhite}${SYMBOLS.check}${COLORS.reset} ${COLORS.bright}Updated to v${updateInfo.latestVersion}${COLORS.reset} - Please restart turl-release`,
        );
        process.exit(0);
      }
      ui.printHeaderWithStatus(
        `${COLORS.brightRed}${SYMBOLS.warning}${COLORS.reset} Update failed, continuing with v${updateInfo.currentVersion}`,
      );
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  ui.printHeaderWithStatus("Initializing...");
  ensureGitHooksInstalled();
  cleanupRulesFile();

  let interactiveOptions = {};
  if (cliOptions.interactive) {
    interactiveOptions = await interactiveMenu();
  }

  ui.printHeaderWithStatus("Running pre-flight checks...");

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
  process.stdout.write(
    ui.subStep(
      nodeModulesCheck.exists ? "node_modules found" : nodeModulesCheck.warning,
      nodeModulesCheck.exists ? "success" : "warn",
    ),
  );

  ui.printHeaderWithStatus("Loading environment...");
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

  ui.printHeaderWithStatus("Reading project config...");
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
  const newVersion = incrementVersion(turlConfig.version);

  ui.printHeaderWithStatus(
    `Preparing release: v${turlConfig.version} ${SYMBOLS.arrow} v${newVersion}`,
  );
  process.stdout.write(
    ui.subStep(
      `Version bump: ${turlConfig.version} ${SYMBOLS.arrow} ${ui.highlight(newVersion)}`,
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

  ui.printHeaderWithStatus("Running code cleanup...");
  try {
    const cleanupStats = await runCleanup(process.cwd());
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
        process.stdout.write(
          ui.subStep(`Formatted with: ${formatResult.command}`, "success"),
        );
      } catch (err) {
        const errorMsg = err.message || "";
        process.stdout.write(
          ui.subStep(
            errorMsg.includes("ENOENT") || errorMsg.includes("not found")
              ? "Formatter not found, skipping..."
              : `Format failed: ${err.message}`,
            "warn",
          ),
        );
      }
    } else {
      process.stdout.write(
        ui.subStep(formatResult.warning || "No formatter detected", "skip"),
      );
    }
  } else {
    process.stdout.write(ui.subStep("Skipped by user", "skip"));
  }

  ui.printHeaderWithStatus("Checking for changes...");
  const diff = getGitDiff();
  const changedFiles = getChangedFiles();

  if (!hasChanges() && !diff.trim()) {
    ui.printHeaderWithStatus("No changes detected");
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

  ui.printHeaderWithStatus("Checking project rules...");
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

  ui.printHeaderWithStatus("Updating version files...");
  try {
    const updatedConfig = {
      version: newVersion,
      projectName,
      branch: turlConfig.branch,
    };
    let packageSyncResult = { updated: false };
    if (!cliOptions.dryRun) packageSyncResult = writeTurlConfig(updatedConfig);
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

  ui.printHeaderWithStatus("Generating changelog with AI...");
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

  ui.printHeaderWithStatus("Updating CHANGELOG.md...");
  try {
    if (!cliOptions.dryRun) updateChangelog(changelogEntry);
    process.stdout.write(ui.subStep("CHANGELOG.md updated", "success"));
  } catch (err) {
    process.stdout.write(ui.subStep(`${err.message}`, "error"));
    exitWithRollback(1);
  }

  ui.printHeaderWithStatus("Running production build...");
  if (!interactiveOptions.skipBuild) {
    const buildCommand = detectBuildCommand();
    if (buildCommand) {
      try {
        if (!cliOptions.dryRun) await runBuild(buildCommand);
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

  ui.printHeaderWithStatus("Staging all changes...");
  try {
    if (!cliOptions.dryRun) execCommand("git add -A", { silent: true });
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

  ui.printHeaderWithStatus("Committing and pushing...");
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

  ui.printHeaderWithStatus("Learning from this release...");
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

  ui.printHeaderWithStatus(
    `${COLORS.brightWhite}${SYMBOLS.check}${COLORS.reset} ${COLORS.bright}Release Complete!${COLORS.reset} v${newVersion}`,
  );

  const BOX_WIDTH = 60;
  const pad = (str, len) => str.padEnd(len);

  process.stdout.write(
    `  ${COLORS.brightWhite}${COLORS.bright}╔${"═".repeat(BOX_WIDTH - 2)}╗${COLORS.reset}\n`,
  );
  process.stdout.write(
    `  ${COLORS.brightWhite}${COLORS.bright}║${COLORS.reset}${" ".repeat(BOX_WIDTH - 2)}${COLORS.brightWhite}${COLORS.bright}║${COLORS.reset}\n`,
  );
  process.stdout.write(
    `  ${COLORS.brightWhite}${COLORS.bright}║${COLORS.reset}   ${COLORS.dim}Project:${COLORS.reset} ${COLORS.brightBlue}${pad(projectName, BOX_WIDTH - 14)}${COLORS.reset}${COLORS.brightWhite}${COLORS.bright}║${COLORS.reset}\n`,
  );
  process.stdout.write(
    `  ${COLORS.brightWhite}${COLORS.bright}║${COLORS.reset}   ${COLORS.dim}Version:${COLORS.reset} ${COLORS.brightBlue}${pad("v" + newVersion, BOX_WIDTH - 14)}${COLORS.reset}${COLORS.brightWhite}${COLORS.bright}║${COLORS.reset}\n`,
  );
  process.stdout.write(
    `  ${COLORS.brightWhite}${COLORS.bright}║${COLORS.reset}   ${COLORS.dim}Branch:${COLORS.reset}  ${COLORS.brightBlue}${pad(branch, BOX_WIDTH - 14)}${COLORS.reset}${COLORS.brightWhite}${COLORS.bright}║${COLORS.reset}\n`,
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
  ui.printHeaderWithStatus(
    `${COLORS.brightRed}${SYMBOLS.cross}${COLORS.reset} ${COLORS.bright}Release Failed${COLORS.reset}`,
  );

  if (err instanceof TurlError) {
    process.stdout.write(
      `  ${COLORS.brightRed}${SYMBOLS.cross}${COLORS.reset} ${err.message}\n`,
    );
    if (err.details?.suggestion)
      process.stdout.write(
        `  ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} ${err.details.suggestion}\n`,
      );
    if (err.code)
      process.stdout.write(
        `  ${COLORS.dim}Error code: ${err.code}${COLORS.reset}\n`,
      );
  } else {
    process.stdout.write(
      `  ${COLORS.brightRed}${SYMBOLS.cross}${COLORS.reset} ${err.message}\n`,
    );
    if (err.stack && process.env.DEBUG)
      process.stdout.write(
        `\n  ${COLORS.dim}Stack trace:\n${err.stack}${COLORS.reset}\n`,
      );
  }

  process.stdout.write("\n");
  rollbackVersion();
  process.exit(1);
});
