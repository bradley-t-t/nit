export const PACKAGE_VERSION = "3.9.0";
export const PACKAGE_NAME = "turl-release";

export const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  white: "\x1b[37m",
  brightRed: "\x1b[91m",
  brightBlue: "\x1b[94m",
  brightWhite: "\x1b[97m",
  bgRed: "\x1b[41m",
  bgBlue: "\x1b[44m",
  bgWhite: "\x1b[47m",
};

export const SYMBOLS = {
  check: "✓",
  cross: "✗",
  arrow: "→",
  arrowRight: "▸",
  dot: "●",
  star: "★",
  lightning: "⚡",
  rocket: "◉",
  gear: "⚙",
  warning: "⚠",
  info: "ℹ",
  block: "█",
  blockLight: "░",
  blockMed: "▒",
  line: "─",
  corner: "╭",
  cornerEnd: "╰",
  vertical: "│",
  spinner: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
};

export const ErrorCodes = {
  GIT_NOT_INSTALLED: "GIT_NOT_INSTALLED",
  GIT_NOT_INITIALIZED: "GIT_NOT_INITIALIZED",
  GIT_NO_REMOTE: "GIT_NO_REMOTE",
  GIT_UNCOMMITTED_CHANGES: "GIT_UNCOMMITTED_CHANGES",
  GIT_COMMIT_FAILED: "GIT_COMMIT_FAILED",
  GIT_PUSH_FAILED: "GIT_PUSH_FAILED",
  API_KEY_MISSING: "API_KEY_MISSING",
  API_KEY_INVALID: "API_KEY_INVALID",
  API_NETWORK_ERROR: "API_NETWORK_ERROR",
  API_RATE_LIMITED: "API_RATE_LIMITED",
  API_SERVER_ERROR: "API_SERVER_ERROR",
  API_RESPONSE_INVALID: "API_RESPONSE_INVALID",
  FILE_READ_ERROR: "FILE_READ_ERROR",
  FILE_WRITE_ERROR: "FILE_WRITE_ERROR",
  FILE_PERMISSION_DENIED: "FILE_PERMISSION_DENIED",
  PACKAGE_JSON_MISSING: "PACKAGE_JSON_MISSING",
  PACKAGE_JSON_INVALID: "PACKAGE_JSON_INVALID",
  VERSION_JSON_INVALID: "VERSION_JSON_INVALID",
  BUILD_FAILED: "BUILD_FAILED",
  FORMATTER_FAILED: "FORMATTER_FAILED",
  PRETTIER_NOT_INSTALLED: "PRETTIER_NOT_INSTALLED",
  NODE_MODULES_MISSING: "NODE_MODULES_MISSING",
  ENV_FILE_MISSING: "ENV_FILE_MISSING",
  CLEANUP_FAILED: "CLEANUP_FAILED",
  RULES_VIOLATION: "RULES_VIOLATION",
};

export const TURL_SECTION_START = "<!-- TURL-RULES-START -->";
export const TURL_SECTION_END = "<!-- TURL-RULES-END -->";
