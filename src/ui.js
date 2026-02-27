import { COLORS, SYMBOLS, PACKAGE_VERSION } from "./constants.js";

export const ui = {
  clear: () => process.stdout.write("\x1b[2J\x1b[H"),
  showCursor: () => process.stdout.write("\x1b[?25h"),

  header: () => {
    const SEP = `${COLORS.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`;
    const TITLE = `${COLORS.brightWhite}${COLORS.bright}Automated Release Management System${COLORS.reset}`;
    const VER = `${COLORS.dim}Version ${PACKAGE_VERSION}${COLORS.reset}`;
    const GAP = "  ";

    return [
      ``,
      `  ${COLORS.brightRed}${COLORS.bright}████████╗${COLORS.brightWhite}██╗   ██╗${COLORS.brightBlue}██████╗ ${COLORS.brightWhite}██╗     ${COLORS.reset}`,
      `  ${COLORS.brightRed}${COLORS.bright}╚══██╔══╝${COLORS.brightWhite}██║   ██║${COLORS.brightBlue}██╔══██╗${COLORS.brightWhite}██║     ${COLORS.reset}${GAP}${SEP}`,
      `  ${COLORS.brightRed}${COLORS.bright}   ██║   ${COLORS.brightWhite}██║   ██║${COLORS.brightBlue}██████╔╝${COLORS.brightWhite}██║     ${COLORS.reset}${GAP}${TITLE}`,
      `  ${COLORS.brightRed}${COLORS.bright}   ██║   ${COLORS.brightWhite}██║   ██║${COLORS.brightBlue}██╔══██╗${COLORS.brightWhite}██║     ${COLORS.reset}${GAP}${VER}`,
      `  ${COLORS.brightRed}${COLORS.bright}   ██║   ${COLORS.brightWhite}╚██████╔╝${COLORS.brightBlue}██║  ██║${COLORS.brightWhite}███████╗${COLORS.reset}${GAP}${SEP}`,
      `  ${COLORS.brightRed}${COLORS.bright}   ╚═╝   ${COLORS.brightWhite} ╚═════╝ ${COLORS.brightBlue}╚═╝  ╚═╝${COLORS.brightWhite}╚══════╝${COLORS.reset}`,
      ``,
    ].join("\n");
  },

  printHeaderWithStatus: (statusMessage) => {
    ui.clear();
    process.stdout.write(ui.header());
    process.stdout.write(
      `\n  ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} ${statusMessage}\n`,
    );
  },
};
