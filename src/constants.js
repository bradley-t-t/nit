export const PACKAGE_VERSION = "8.0.0";
export const PACKAGE_NAME = "nit";

export const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightWhite: "\x1b[97m",
};

export const SYMBOLS = {
  check: "✓",
  arrow: "→",
  arrowRight: "▸",
};

export const AI_PROVIDERS = {
  grok: {
    name: "Grok (xAI)",
    envKeys: ["GROK_API_KEY", "REACT_APP_GROK_API_KEY"],
    endpoint: "https://api.x.ai/v1/chat/completions",
    model: "grok-3-latest",
    keyPrefixes: ["xai-"],
    signupUrl: "https://console.x.ai",
  },
  openai: {
    name: "OpenAI",
    envKeys: ["OPENAI_API_KEY"],
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o",
    keyPrefixes: ["sk-"],
    signupUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    name: "Anthropic (Claude)",
    envKeys: ["ANTHROPIC_API_KEY"],
    endpoint: "https://api.anthropic.com/v1/messages",
    model: "claude-sonnet-4-20250514",
    keyPrefixes: ["sk-ant-"],
    signupUrl: "https://console.anthropic.com",
  },
};

export const ErrorCodes = {
  GIT_NOT_INSTALLED: "GIT_NOT_INSTALLED",
  GIT_NOT_INITIALIZED: "GIT_NOT_INITIALIZED",
  GIT_NO_REMOTE: "GIT_NO_REMOTE",
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
  VERSION_JSON_INVALID: "VERSION_JSON_INVALID",
  BUILD_FAILED: "BUILD_FAILED",
};
