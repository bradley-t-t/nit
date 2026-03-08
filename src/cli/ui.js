import {
  COLORS,
  SYMBOLS,
  PACKAGE_VERSION,
  PACKAGE_AUTHOR,
} from "../utils/constants.js";

const printStatusLine = (message) =>
  process.stdout.write(
    `  ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} ${message}\n`,
  );

export const ui = {
  showCursor: () => process.stdout.write("\x1b[?25h"),

  /** Prints the ASCII logo + title block exactly once at startup. */
  printHeader: () => {
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

  printHeaderWithStatus: (statusMessage) => printStatusLine(statusMessage),

  printHeaderWithError: (statusMessage, errorDetail) => {
    printStatusLine(statusMessage);
    if (errorDetail) {
      const lines = errorDetail.split("\n").filter(Boolean);
      for (const line of lines) {
        process.stdout.write(`  ${COLORS.brightRed}${line}${COLORS.reset}\n`);
      }
    }
  },
};
