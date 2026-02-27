import { COLORS, SYMBOLS, PACKAGE_VERSION } from "./constants.js";

export const ui = {
  clear: () => process.stdout.write("\x1b[2J\x1b[H"),
  hideCursor: () => process.stdout.write("\x1b[?25l"),
  showCursor: () => process.stdout.write("\x1b[?25h"),

  box: (text, width = 50) => {
    const padding = Math.max(0, width - text.length - 4);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return (
      `${COLORS.brightBlue}╭${"─".repeat(width - 2)}╮${COLORS.reset}\n` +
      `${COLORS.brightBlue}│${COLORS.reset}${" ".repeat(leftPad + 1)}${text}${" ".repeat(rightPad + 1)}${COLORS.brightBlue}│${COLORS.reset}\n` +
      `${COLORS.brightBlue}╰${"─".repeat(width - 2)}╯${COLORS.reset}`
    );
  },

  header: (statusMessage = null) => {
    const lines = [
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
    ];
    if (statusMessage) {
      lines.push(
        `  ${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset} ${statusMessage}`,
      );
      lines.push(``);
    }
    return lines.join("\n");
  },

  printHeaderWithStatus: (statusMessage) => {
    ui.clear();
    process.stdout.write(ui.header(statusMessage));
  },

  subStep: (text, status = "info") => {
    const icons = {
      info: `${COLORS.brightBlue}${SYMBOLS.arrowRight}${COLORS.reset}`,
      success: `${COLORS.brightWhite}${SYMBOLS.check}${COLORS.reset}`,
      error: `${COLORS.brightRed}${SYMBOLS.cross}${COLORS.reset}`,
      warn: `${COLORS.brightRed}${SYMBOLS.warning}${COLORS.reset}`,
      skip: `${COLORS.dim}${SYMBOLS.dot}${COLORS.reset}`,
    };
    return `\n       ${icons[status] || icons.info} ${COLORS.dim}${text}${COLORS.reset}`;
  },

  spinner: (text) => {
    let frame = 0;
    let interval;
    return {
      start: () => {
        ui.hideCursor();
        interval = setInterval(() => {
          process.stdout.write(
            `\r  ${COLORS.brightBlue}${SYMBOLS.spinner[frame]}${COLORS.reset} ${text}`,
          );
          frame = (frame + 1) % SYMBOLS.spinner.length;
        }, 80);
      },
      stop: (finalText, success = true) => {
        clearInterval(interval);
        ui.showCursor();
        const icon = success
          ? `${COLORS.brightWhite}${SYMBOLS.check}${COLORS.reset}`
          : `${COLORS.brightRed}${SYMBOLS.cross}${COLORS.reset}`;
        process.stdout.write(`\r  ${icon} ${finalText}\n`);
      },
    };
  },

  divider: (char = "─", width = 56) =>
    `  ${COLORS.dim}${char.repeat(width)}${COLORS.reset}`,
  highlight: (text) =>
    `${COLORS.bright}${COLORS.brightBlue}${text}${COLORS.reset}`,
  success: (text) => `${COLORS.brightWhite}${text}${COLORS.reset}`,
  error: (text) => `${COLORS.brightRed}${text}${COLORS.reset}`,
  warn: (text) => `${COLORS.brightRed}${text}${COLORS.reset}`,
  info: (text) => `${COLORS.brightBlue}${text}${COLORS.reset}`,
};
