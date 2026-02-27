import { COLORS, SYMBOLS, PACKAGE_VERSION } from "./constants.js";

let headerPrinted = false;

export const ui = {
  clear: () => process.stdout.write("\x1b[2J\x1b[H"),
  showCursor: () => process.stdout.write("\x1b[?25h"),

  header: () => {
    return [
      ``,
      `  ${COLORS.brightRed}${COLORS.bright}████████╗${COLORS.brightWhite}██╗   ██╗${COLORS.brightBlue}██████╗ ${COLORS.brightWhite}██╗     ${COLORS.reset}`,
      `  ${COLORS.brightRed}${COLORS.bright}╚══██╔══╝${COLORS.brightWhite}██║   ██║${COLORS.brightBlue}██╔══██╗${COLORS.brightWhite}██║     ${COLORS.reset}`,
      `  ${COLORS.brightRed}${COLORS.bright}   ██║   ${COLORS.brightWhite}██║   ██║${COLORS.brightBlue}██████╔╝${COLORS.brightWhite}██║     ${COLORS.reset}`,
      `  ${COLORS.brightRed}${COLORS.bright}   ██║   ${COLORS.brightWhite}██║   ██║${COLORS.brightBlue}██╔══██╗${COLORS.brightWhite}██║     ${COLORS.reset}`,
      `  ${COLORS.brightRed}${COLORS.bright}   ██║   ${COLORS.brightWhite}╚██████╔╝${COLORS.brightBlue}██║  ██║${COLORS.brightWhite}███████╗${COLORS.reset}`,
      `  ${COLORS.brightRed}${COLORS.bright}   ╚═╝   ${COLORS.brightWhite} ╚═════╝ ${COLORS.brightBlue}╚═╝  ╚═╝${COLORS.brightWhite}╚══════╝${COLORS.reset}`,
      ``,
      `  ${COLORS.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`,
      `  ${COLORS.brightWhite}${COLORS.bright}Automated Release Management System${COLORS.reset}`,
      `  ${COLORS.dim}Version ${PACKAGE_VERSION}${COLORS.reset}`,
      `  ${COLORS.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`,
      ``,
    ].join("\n");
  },

  printHeader: () => {
    if (headerPrinted) return;
    ui.clear();
    process.stdout.write(ui.header());
    headerPrinted = true;
  },

  printHeaderWithStatus: (statusMessage) => {
    ui.printHeader();
    process.stdout.write(
      `  ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} ${statusMessage}\n`,
    );
  },
};
