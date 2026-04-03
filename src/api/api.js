import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { ErrorCodes, AI_PROVIDERS } from "../utils/constants.js";
import { NitError, isNetworkError, parseApiError } from "../utils/errors.js";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;
const MAX_DIFF_LENGTH = 30000;
const NOISE_FILE_PATTERNS = [
  /^diff --git a\/package-lock\.json/,
  /^diff --git a\/yarn\.lock/,
  /^diff --git a\/pnpm-lock\.yaml/,
  /^diff --git a\/\.next\//,
  /^diff --git a\/build\//,
  /^diff --git a\/dist\//,
  /^diff --git a\/node_modules\//,
];

/** Strips lock files, build artifacts, and other noisy files from a unified diff. */
function filterDiffNoise(diff) {
  const sections = diff.split(/(?=^diff --git )/m);
  const filtered = sections.filter(
    (section) => !NOISE_FILE_PATTERNS.some((p) => p.test(section)),
  );
  return filtered.join("");
}

/** Filters noise from a diff and truncates it to fit within AI token limits. */
function truncateDiff(diff) {
  const cleaned = filterDiffNoise(diff);
  if (cleaned.length <= MAX_DIFF_LENGTH) return cleaned;
  return cleaned.substring(0, MAX_DIFF_LENGTH) + "\n... (truncated)";
}

const CONTEXT_FILE = ".nit-context";

/** Reads the optional .nit-context file for additional release context (intent, summary, etc). */
function readContextFile() {
  const contextPath = path.join(process.cwd(), CONTEXT_FILE);
  try {
    if (fs.existsSync(contextPath))
      return fs.readFileSync(contextPath, "utf-8").trim();
  } catch {}
  return "";
}

/** Calls the Claude Code CLI in print mode, piping the prompt via stdin. Unsets CLAUDECODE to allow nested invocation. */
function callClaudeCli(prompt) {
  const env = { ...process.env };
  delete env.CLAUDECODE;
  const result = spawnSync("claude", ["-p"], {
    input: prompt,
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024,
    timeout: 120_000,
    env,
  });
  if (result.status !== 0) {
    throw new Error(
      result.stderr || `claude exited with code ${result.status}`,
    );
  }
  return result.stdout.trim();
}

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
    max_tokens: 2000,
  });
}

/** Builds the fetch request body for the Anthropic Messages API. */
function buildAnthropicBody(model, prompt) {
  return JSON.stringify({
    model,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 2000,
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
        ? Math.min(parseInt(retryAfterHeader, 10) * 1000 || 5000, 60_000)
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

/** Builds the user prompt for release commit message generation with optional context. */
function buildReleaseCommitPrompt(
  projectName,
  newVersion,
  changedFiles,
  stat,
  truncatedDiff,
) {
  const context = readContextFile();
  const contextBlock = context
    ? `\nDeveloper context (what was worked on and why):\n${context}\n`
    : "";

  return `Generate a git commit message for ${projectName} version ${newVersion}.

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
11. Do NOT mention version bumps, version file updates, or nit.json changes
12. Focus on actual code changes, not metadata
${contextBlock}
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
}

/** Builds the user prompt for conventional commit message generation. */
function buildConventionalCommitPrompt(
  projectName,
  commitType,
  changedFiles,
  stat,
  truncatedDiff,
) {
  const context = readContextFile();
  const contextBlock = context
    ? `\nDeveloper context (what was worked on and why):\n${context}\n`
    : "";

  return `Generate a git commit message for ${projectName} using the conventional commit format.

CRITICAL RULES:
1. The FIRST line MUST follow: "${commitType}(scope): short description"
2. The scope should be derived from the primary area of change
3. The short description must be lowercase, imperative mood, no period
4. The SECOND line MUST be blank
5. Then bullet points of changes starting with "-"
6. ONLY describe changes that are EXPLICITLY visible in the diff below
7. Do NOT invent or assume any changes not shown in the diff
8. Write in a natural, human-friendly tone
9. Do NOT use any emojis
10. Focus on actual code changes, not metadata
${contextBlock}
Changed files: ${changedFiles.join(", ")}

Diff statistics:
${stat}

Actual diff:
${truncatedDiff}

Output format (EXACTLY):
${commitType}(scope): short description

- First change (written naturally)
- Second change
- (as many as needed)`;
}

/** Validates and normalizes the AI response into the expected release commit message format. */
function parseReleaseCommitResponse(
  response,
  projectName,
  newVersion,
  providerName,
) {
  const firstLine = `${projectName}: Release v${newVersion}`;

  if (!response) {
    throw new NitError(
      `${providerName} returned empty commit message`,
      ErrorCodes.API_RESPONSE_INVALID,
      { suggestion: "The AI did not generate a valid response" },
    );
  }

  if (response.startsWith(firstLine)) return response.trim();
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

/** Validates and normalizes the AI response into conventional commit format. */
function parseConventionalCommitResponse(response, commitType, providerName) {
  if (!response) {
    throw new NitError(
      `${providerName} returned empty commit message`,
      ErrorCodes.API_RESPONSE_INVALID,
      { suggestion: "The AI did not generate a valid response" },
    );
  }

  const conventionalPattern = new RegExp(`^${commitType}\\(.+\\):`);
  if (conventionalPattern.test(response)) return response.trim();
  if (response.includes("-"))
    return `${commitType}(general): update\n\n${response.trim()}`;

  throw new NitError(
    `${providerName} returned invalid commit message format`,
    ErrorCodes.API_RESPONSE_INVALID,
    {
      response: response.substring(0, 200),
      suggestion:
        "The AI response did not match expected conventional commit format",
    },
  );
}

/**
 * Generates a release commit message by sending the diff to the configured AI provider.
 * Returns a formatted message with the project name, version, and bullet points.
 * @param {string} apiKey
 * @param {string} newVersion
 * @param {string} projectName
 * @param {string} diff
 * @param {string} stat
 * @param {string[]} changedFiles
 * @param {string} providerId
 * @returns {Promise<string>}
 */
export async function generateReleaseCommitMessage(
  apiKey,
  newVersion,
  projectName,
  diff,
  stat,
  changedFiles,
  providerId = "grok",
) {
  const provider = AI_PROVIDERS[providerId];
  const providerName = provider?.name ?? providerId;

  if (!diff.trim()) {
    throw new NitError(
      "No diff available to generate commit message",
      ErrorCodes.API_RESPONSE_INVALID,
      { suggestion: "Make sure there are actual code changes to commit" },
    );
  }

  const truncatedDiff = truncateDiff(diff);
  const prompt = buildReleaseCommitPrompt(
    projectName,
    newVersion,
    changedFiles,
    stat,
    truncatedDiff,
  );

  const response = provider?.isCli
    ? callClaudeCli(prompt)
    : await callAiApi(apiKey, prompt, providerId);

  return parseReleaseCommitResponse(
    response,
    projectName,
    newVersion,
    providerName,
  );
}

/**
 * Generates a conventional commit message by sending the diff to the configured AI provider.
 * Returns a formatted message using "type(scope): description" format.
 * @param {string} apiKey
 * @param {string} projectName
 * @param {string} commitType - Conventional commit type (feat, fix, chore, etc.).
 * @param {string} diff
 * @param {string} stat
 * @param {string[]} changedFiles
 * @param {string} providerId
 * @returns {Promise<string>}
 */
export async function generateConventionalCommitMessage(
  apiKey,
  projectName,
  commitType,
  diff,
  stat,
  changedFiles,
  providerId = "grok",
) {
  const provider = AI_PROVIDERS[providerId];
  const providerName = provider?.name ?? providerId;

  if (!diff.trim()) {
    throw new NitError(
      "No diff available to generate commit message",
      ErrorCodes.API_RESPONSE_INVALID,
      { suggestion: "Make sure there are actual code changes to commit" },
    );
  }

  const truncatedDiff = truncateDiff(diff);
  const prompt = buildConventionalCommitPrompt(
    projectName,
    commitType,
    changedFiles,
    stat,
    truncatedDiff,
  );

  const response = provider?.isCli
    ? callClaudeCli(prompt)
    : await callAiApi(apiKey, prompt, providerId);

  return parseConventionalCommitResponse(response, commitType, providerName);
}

/** Backward-compatible alias for generateReleaseCommitMessage. */
export const generateCommitMessage = generateReleaseCommitMessage;
