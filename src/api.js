import { ErrorCodes, AI_PROVIDERS } from "./constants.js";
import { NitError, isNetworkError, parseApiError } from "./errors.js";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;
const SYSTEM_PROMPT =
  "You are a precise technical assistant that generates changelog entries and commit messages. You ONLY describe changes that are explicitly visible in the provided diff. Never invent or assume changes. Be specific and accurate.";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Builds the fetch request body for OpenAI-compatible APIs (Grok, OpenAI). */
function buildOpenAiBody(model, prompt) {
  return JSON.stringify({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });
}

/** Builds the fetch request body for the Anthropic Messages API. */
function buildAnthropicBody(model, prompt) {
  return JSON.stringify({
    model,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 1000,
  });
}

/** Extracts the text content from a provider's response JSON. */
function extractResponseContent(providerId, data) {
  if (providerId === "anthropic") {
    return data.content?.[0]?.text || "";
  }
  return data.choices?.[0]?.message?.content || "";
}

/** Validates the response structure from a provider. */
function isValidResponse(providerId, data) {
  if (providerId === "anthropic") return !!data.content?.[0]?.text;
  return !!data.choices?.[0]?.message;
}

/**
 * Calls any supported AI provider with retry + exponential backoff.
 * Provider is resolved from AI_PROVIDERS config.
 */
export async function callAiApi(apiKey, prompt, providerId = "grok") {
  const provider = AI_PROVIDERS[providerId];
  if (!provider) {
    throw new NitError(
      `Unknown AI provider: ${providerId}. Supported: ${Object.keys(AI_PROVIDERS).join(", ")}`,
      ErrorCodes.API_RESPONSE_INVALID,
    );
  }

  const isAnthropic = providerId === "anthropic";
  const headers = {
    "Content-Type": "application/json",
    ...(isAnthropic
      ? { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }
      : { Authorization: `Bearer ${apiKey}` }),
  };
  const body = isAnthropic
    ? buildAnthropicBody(provider.model, prompt)
    : buildOpenAiBody(provider.model, prompt);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let response;

    try {
      response = await fetch(provider.endpoint, {
        method: "POST",
        headers,
        body,
      });
    } catch (err) {
      if (isNetworkError(err)) {
        const networkMessages = {
          ENOTFOUND: `Network error: Unable to reach ${provider.name}. Check your internet connection.`,
          EAI_AGAIN: `Network error: Unable to reach ${provider.name}. Check your internet connection.`,
          ETIMEDOUT: `Network timeout: ${provider.name} request timed out. Try again later.`,
          ESOCKETTIMEDOUT: `Network timeout: ${provider.name} request timed out. Try again later.`,
          ECONNREFUSED: `Connection refused: Unable to connect to ${provider.name}.`,
        };
        throw new NitError(
          networkMessages[err.code] ??
            `Network error calling ${provider.name}: ${err.message}`,
          ErrorCodes.API_NETWORK_ERROR,
          { originalError: err.message },
        );
      }
      throw new NitError(
        `Network error calling ${provider.name}: ${err.message}`,
        ErrorCodes.API_NETWORK_ERROR,
        { originalError: err.message },
      );
    }

    const isRetryable = response.status === 429 || response.status >= 500;
    if (!response.ok && isRetryable && attempt < MAX_RETRIES) {
      const retryAfterHeader = response.headers.get("retry-after");
      const waitMs = retryAfterHeader
        ? parseInt(retryAfterHeader, 10) * 1000
        : BASE_DELAY_MS * 2 ** attempt;
      await delay(waitMs);
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      throw parseApiError(response, errorText, errorData, providerId);
    }

    let data;
    try {
      data = await response.json();
    } catch (err) {
      throw new NitError(
        `Invalid JSON response from ${provider.name}`,
        ErrorCodes.API_RESPONSE_INVALID,
        { originalError: err.message },
      );
    }

    if (!isValidResponse(providerId, data)) {
      throw new NitError(
        `Unexpected response format from ${provider.name}`,
        ErrorCodes.API_RESPONSE_INVALID,
        { response: data },
      );
    }

    return extractResponseContent(providerId, data);
  }
}

/** @deprecated Use callAiApi instead. Kept for backward compatibility. */
export async function callGrokApi(apiKey, prompt) {
  return callAiApi(apiKey, prompt, "grok");
}

export async function generateChangelog(
  apiKey,
  newVersion,
  projectName,
  diff,
  stat,
  changedFiles,
  providerId = "grok",
) {
  const providerName = AI_PROVIDERS[providerId]?.name ?? providerId;
  const today = new Date().toISOString().split("T")[0];

  if (!diff.trim()) {
    throw new NitError(
      "No diff available to generate changelog",
      ErrorCodes.API_RESPONSE_INVALID,
      {
        suggestion: "Make sure there are actual code changes to release",
      },
    );
  }

  const truncatedDiff =
    diff.length > 8000 ? diff.substring(0, 8000) + "\n... (truncated)" : diff;

  const prompt = `Generate a changelog entry for ${projectName} version ${newVersion}.

RULES:
1. ONLY describe changes that are EXPLICITLY visible in the diff below
2. Do NOT invent or assume any changes not shown in the diff
3. Write in a natural, human-friendly tone - like a developer explaining what they did
4. Be specific - mention actual features, fixes, or improvements by name
5. Group related changes together logically
6. Use bullet points starting with "-"
7. Include ALL meaningful changes visible in the diff
8. Keep it concise but complete
9. Do NOT use any emojis
10. Do NOT mention version bumps, version file updates, or turl.json changes
11. Focus on what actually changed in the code, not metadata

Changed files: ${changedFiles.join(", ")}

Diff statistics:
${stat}

Actual diff:
${truncatedDiff}

Output format (EXACTLY):
## [${newVersion}] - ${today}

- First change (written naturally)
- Second change
- (as many as needed)`;

  const response = await callAiApi(apiKey, prompt, providerId);

  if (!response?.includes(`## [${newVersion}]`)) {
    throw new NitError(
      `${providerName} returned invalid changelog format`,
      ErrorCodes.API_RESPONSE_INVALID,
      {
        response: response ? response.substring(0, 200) : "empty",
        suggestion: "The AI response did not match expected format",
      },
    );
  }

  return response.trim() + "\n";
}

export async function generateCommitMessage(
  apiKey,
  newVersion,
  projectName,
  diff,
  stat,
  changedFiles,
  providerId = "grok",
) {
  const providerName = AI_PROVIDERS[providerId]?.name ?? providerId;
  const firstLine = `${projectName}: Release v${newVersion}`;

  if (!diff.trim()) {
    throw new NitError(
      "No diff available to generate commit message",
      ErrorCodes.API_RESPONSE_INVALID,
      {
        suggestion: "Make sure there are actual code changes to commit",
      },
    );
  }

  const truncatedDiff =
    diff.length > 8000 ? diff.substring(0, 8000) + "\n... (truncated)" : diff;

  const prompt = `Generate a git commit message for ${projectName} version ${newVersion}.

CRITICAL RULES:
1. The FIRST line MUST be EXACTLY: "${projectName}: Release v${newVersion}"
2. The SECOND line MUST be blank
3. Then bullet points of changes starting with "-"
4. ONLY describe changes that are EXPLICITLY visible in the diff below
5. Do NOT invent or assume any changes not shown in the diff
6. Write in a natural, human-friendly tone
7. Be specific about what actually changed
8. Group related changes together
9. Include ALL meaningful changes visible in the diff
10. Do NOT use any emojis
11. Do NOT mention version bumps, version file updates, or turl.json changes
12. Focus on actual code changes, not metadata

Changed files: ${changedFiles.join(", ")}

Diff statistics:
${stat}

Actual diff:
${truncatedDiff}

Output format (EXACTLY):
${projectName}: Release v${newVersion}

- First change (written naturally)
- Second change
- (as many as needed)`;

  const response = await callAiApi(apiKey, prompt, providerId);

  if (!response) {
    throw new NitError(
      `${providerName} returned empty commit message`,
      ErrorCodes.API_RESPONSE_INVALID,
      {
        suggestion: "The AI did not generate a valid response",
      },
    );
  }

  if (response.startsWith(`${projectName}: Release v${newVersion}`))
    return response.trim();
  if (response.includes("-")) return `${firstLine}\n\n${response.trim()}`;

  throw new NitError(
    `${providerName} returned invalid commit message format`,
    ErrorCodes.API_RESPONSE_INVALID,
    {
      response: response.substring(0, 200),
      suggestion: "The AI response did not match expected format",
    },
  );
}
