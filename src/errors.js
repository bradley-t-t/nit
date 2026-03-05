import { ErrorCodes, AI_PROVIDERS } from "./constants.js";

export class NitError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = "NitError";
    this.code = code;
    this.details = details;
  }
}

export function createError(message, code, details = {}) {
  return new NitError(message, code, details);
}

export function isNetworkError(err) {
  return [
    "ENOTFOUND",
    "EAI_AGAIN",
    "ETIMEDOUT",
    "ESOCKETTIMEDOUT",
    "ECONNREFUSED",
  ].includes(err.code);
}

export function parseApiError(
  response,
  errorText,
  errorData,
  providerId = "grok",
) {
  const { status } = response;
  const provider = AI_PROVIDERS[providerId];
  const providerName = provider?.name ?? providerId;
  const signupUrl = provider?.signupUrl ?? "your AI provider dashboard";
  const envKey = provider?.envKeys?.[0] ?? "API_KEY";

  if (status === 401 || status === 400) {
    if (
      errorText.includes("invalid argument") ||
      errorText.includes("Invalid API key") ||
      errorText.includes("Incorrect API key") ||
      errorText.includes("invalid x-api-key") ||
      errorText.includes("authentication_error")
    ) {
      return createError(
        `Invalid API key. Please check your ${envKey} in .env file.`,
        ErrorCodes.API_KEY_INVALID,
        {
          status,
          suggestion: `Get a valid API key from ${signupUrl}`,
          response: errorData,
        },
      );
    }
  }

  if (status === 429) {
    return createError(
      `Rate limited by ${providerName}. Please wait and try again.`,
      ErrorCodes.API_RATE_LIMITED,
      {
        status,
        suggestion: "Wait a few minutes before trying again",
        response: errorData,
      },
    );
  }

  if (status >= 500) {
    return createError(
      `${providerName} server error. The service may be temporarily unavailable.`,
      ErrorCodes.API_SERVER_ERROR,
      { status, suggestion: "Try again in a few minutes", response: errorData },
    );
  }

  return createError(
    `${providerName} API error: ${status} - ${errorText}`,
    ErrorCodes.API_SERVER_ERROR,
    { status, response: errorData },
  );
}
