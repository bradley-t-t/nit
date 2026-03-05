import { ErrorCodes } from "./constants.js";
import { NitError, isNetworkError, parseApiError } from "./errors.js";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

/** Waits for the specified duration in milliseconds. */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls the Grok API with automatic retry + exponential backoff for rate limits (429)
 * and transient server errors (5xx).
 */
export async function callGrokApi(apiKey, prompt) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let response;

    try {
      response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-3-latest",
          messages: [
            {
              role: "system",
              content:
                "You are a precise technical assistant that generates changelog entries and commit messages. You ONLY describe changes that are explicitly visible in the provided diff. Never invent or assume changes. Be specific and accurate.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });
    } catch (err) {
      if (isNetworkError(err)) {
        const messages = {
          ENOTFOUND:
            "Network error: Unable to reach Grok API. Check your internet connection.",
          EAI_AGAIN:
            "Network error: Unable to reach Grok API. Check your internet connection.",
          ETIMEDOUT:
            "Network timeout: Grok API request timed out. Try again later.",
          ESOCKETTIMEDOUT:
            "Network timeout: Grok API request timed out. Try again later.",
          ECONNREFUSED: "Connection refused: Unable to connect to Grok API.",
        };
        throw new NitError(
          messages[err.code] ||
            `Network error calling Grok API: ${err.message}`,
          ErrorCodes.API_NETWORK_ERROR,
          { originalError: err.message },
        );
      }
      throw new NitError(
        `Network error calling Grok API: ${err.message}`,
        ErrorCodes.API_NETWORK_ERROR,
        { originalError: err.message },
      );
    }

    // Retry on rate-limit (429) or transient server errors (5xx)
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
      throw parseApiError(response, errorText, errorData);
    }

    let data;
    try {
      data = await response.json();
    } catch (err) {
      throw new NitError(
        "Invalid JSON response from Grok API",
        ErrorCodes.API_RESPONSE_INVALID,
        { originalError: err.message },
      );
    }

    if (!data.choices?.[0]?.message) {
      throw new NitError(
        "Unexpected response format from Grok API",
        ErrorCodes.API_RESPONSE_INVALID,
        { response: data },
      );
    }

    return data.choices[0].message.content || "";
  }
}

export async function generateChangelog(
  apiKey,
  newVersion,
  projectName,
  diff,
  stat,
  changedFiles,
) {
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

  const response = await callGrokApi(apiKey, prompt);

  if (!response?.includes(`## [${newVersion}]`)) {
    throw new NitError(
      "Grok API returned invalid changelog format",
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
) {
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

  const response = await callGrokApi(apiKey, prompt);

  if (!response) {
    throw new NitError(
      "Grok API returned empty commit message",
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
    "Grok API returned invalid commit message format",
    ErrorCodes.API_RESPONSE_INVALID,
    {
      response: response.substring(0, 200),
      suggestion: "The AI response did not match expected format",
    },
  );
}
