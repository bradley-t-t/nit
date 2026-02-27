import { execSync } from "child_process";
import { COLORS, SYMBOLS, PACKAGE_NAME, PACKAGE_VERSION } from "./constants.js";
import { ui } from "./ui.js";

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
${ui.header()}

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

export async function promptUserForViolations(violations) {
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
        for (const line of wrapText(violation.rule, CONTENT_WIDTH)) {
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
        process.stdout.write(
          `  ${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}    ${COLORS.brightRed}Issue:${COLORS.reset}${" ".repeat(BOX_WIDTH - 12)}${COLORS.brightRed}${COLORS.bright}│${COLORS.reset}\n`,
        );
        for (const line of wrapText(violation.explanation, CONTENT_WIDTH)) {
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
