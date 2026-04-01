import {
  COLORS,
  SYMBOLS,
  PACKAGE_VERSION,
  PACKAGE_AUTHOR,
} from "../utils/constants.js";

let outputLevel = "normal";

const printStatusLine = (message) =>
  process.stdout.write(
    `  ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} ${message}\n`,
  );

export const ui = {
  /**
   * Sets the output verbosity level.
   * @param {"quiet" | "normal" | "verbose"} level
   */
  setOutputLevel: (level) => {
    outputLevel = level;
  },

  /** Returns the current output level. */
  getOutputLevel: () => outputLevel,

  /** Prints a message only in verbose mode. */
  verbose: (msg) => {
    if (outputLevel === "verbose") {
      process.stdout.write(
        `  ${COLORS.dim}${SYMBOLS.arrowRight} ${msg}${COLORS.reset}\n`,
      );
    }
  },

  /** Restores the terminal cursor after a spinner or hidden-cursor operation. */
  showCursor: () => process.stdout.write("\x1b[?25h"),

  /** Prints the ASCII logo + title block exactly once at startup. Suppressed in quiet mode. */
  printHeader: () => {
    if (outputLevel === "quiet") return;

    const SEP = `${COLORS.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`;
    const TITLE = `${COLORS.brightWhite}${COLORS.bright}Automated Release Management${COLORS.reset}`;
    const VER = `${COLORS.dim}v${PACKAGE_VERSION} by ${PACKAGE_AUTHOR}${COLORS.reset}`;
    const GAP = "  ";

    process.stdout.write(
      [
        ``,
        `  ${COLORS.brightRed}${COLORS.bright}███╗   ██╗${COLORS.brightWhite}██║${COLORS.brightBlue}████████╗${COLORS.reset}`,
        `  ${COLORS.brightRed}${COLORS.bright}████╗  ██║${COLORS.brightWhite}██║${COLORS.brightBlue}╚══██╔══╝${COLORS.reset}${GAP}${SEP}`,
        `  ${COLORS.brightRed}${COLORS.bright}██╔██╗ ██║${COLORS.brightWhite}██║${COLORS.brightBlue}   ██║   ${COLORS.reset}${GAP}${TITLE}`,
        `  ${COLORS.brightRed}${COLORS.bright}██║╚██╗██║${COLORS.brightWhite}██║${COLORS.brightBlue}   ██║   ${COLORS.reset}${GAP}${VER}`,
        `  ${COLORS.brightRed}${COLORS.bright}██║ ╚████║${COLORS.brightWhite}██║${COLORS.brightBlue}   ██║   ${COLORS.reset}${GAP}${SEP}`,
        `  ${COLORS.brightRed}${COLORS.bright}╚═╝  ╚═══╝${COLORS.brightWhite}╚═╝${COLORS.brightBlue}   ╚═╝   ${COLORS.reset}`,
        ``,
      ].join("\n"),
    );
  },

  /** Prints a status line. Suppressed in quiet mode. */
  printHeaderWithStatus: (statusMessage) => {
    if (outputLevel === "quiet") return;
    printStatusLine(statusMessage);
  },

  /** Prints an error status line with optional detail. Always shows regardless of output level. */
  printHeaderWithError: (statusMessage, errorDetail) => {
    printStatusLine(statusMessage);
    if (errorDetail) {
      const lines = errorDetail.split("\n").filter(Boolean);
      for (const line of lines) {
        process.stdout.write(`  ${COLORS.brightRed}${line}${COLORS.reset}\n`);
      }
    }
  },

  /** Prints a dry-run notice with a yellow prefix. Suppressed in quiet mode. */
  dryRun: (msg) => {
    if (outputLevel === "quiet") return;
    process.stdout.write(
      `  ${COLORS.brightYellow}[DRY RUN]${COLORS.reset} ${msg}\n`,
    );
  },
};
