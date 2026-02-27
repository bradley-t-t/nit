import { ErrorCodes } from "./constants.js";

export class TurlError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = "TurlError";
    this.code = code;
    this.details = details;
  }
}

export function createError(message, code, details = {}) {
  return new TurlError(message, code, details);
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

export function parseApiError(response, errorText, errorData) {
  const { status } = response;

  if (status === 401 || status === 400) {
    if (
      errorText.includes("invalid argument") ||
      errorText.includes("Invalid API key") ||
      errorText.includes("Incorrect API key")
    ) {
      return createError(
        "Invalid API key. Please check your GROK_API_KEY in .env file.",
        ErrorCodes.API_KEY_INVALID,
        {
          status,
          suggestion: "Get a valid API key from https://console.x.ai",
          response: errorData,
        },
      );
    }
  }

  if (status === 429) {
    return createError(
      "Rate limited by Grok API. Please wait and try again.",
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
      "Grok API server error. The service may be temporarily unavailable.",
      ErrorCodes.API_SERVER_ERROR,
      { status, suggestion: "Try again in a few minutes", response: errorData },
    );
  }

  return createError(
    `Grok API error: ${status} - ${errorText}`,
    ErrorCodes.API_SERVER_ERROR,
    { status, response: errorData },
  );
}
