import { ErrorCodes } from "./constants.js";
import { TurlError, isNetworkError, parseApiError } from "./errors.js";

export async function callGrokApi(apiKey, prompt) {
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
      throw new TurlError(
        messages[err.code] || `Network error calling Grok API: ${err.message}`,
        ErrorCodes.API_NETWORK_ERROR,
        { originalError: err.message },
      );
    }
    throw new TurlError(
      `Network error calling Grok API: ${err.message}`,
      ErrorCodes.API_NETWORK_ERROR,
      { originalError: err.message },
    );
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
    throw new TurlError(
      "Invalid JSON response from Grok API",
      ErrorCodes.API_RESPONSE_INVALID,
      { originalError: err.message },
    );
  }

  if (!data.choices?.[0]?.message) {
    throw new TurlError(
      "Unexpected response format from Grok API",
      ErrorCodes.API_RESPONSE_INVALID,
      { response: data },
    );
  }

  return data.choices[0].message.content || "";
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
    throw new TurlError(
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
    throw new TurlError(
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
    throw new TurlError(
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
    throw new TurlError(
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

  throw new TurlError(
    "Grok API returned invalid commit message format",
    ErrorCodes.API_RESPONSE_INVALID,
    {
      response: response.substring(0, 200),
      suggestion: "The AI response did not match expected format",
    },
  );
}

export async function checkRulesViolations(
  apiKey,
  diff,
  stat,
  changedFiles,
  rules,
) {
  if (!rules.length || !diff.trim()) return { violations: [], passed: true };

  const truncatedDiff =
    diff.length > 6000 ? diff.substring(0, 6000) + "\n... (truncated)" : diff;
  const rulesText = rules.map((r, i) => `${i + 1}. ${r}`).join("\n");

  const prompt = `You are analyzing code changes to determine if they ACTIVELY BREAK project guidelines.

PROJECT GUIDELINES (for context only - most will NOT apply):
${rulesText}

Changed files: ${changedFiles.join(", ")}
Diff statistics:
${stat}

Code diff:
${truncatedDiff}

ANALYSIS FRAMEWORK - Think step by step:

STEP 1: What is actually being changed in this diff?
- Identify the actual files modified and the nature of changes (new code, refactoring, fixes, etc.)

STEP 2: For each guideline, ask: "Does this diff INTRODUCE something that contradicts this guideline?"
- A guideline is ONLY violated if the diff ADDS code that directly contradicts it
- Guidelines about organization only apply if NEW files of that type are being created
- Guidelines about documentation are AUTOMATICALLY handled by this release tool
- Guidelines about consistency only apply if the changes BREAK existing patterns

STEP 3: Apply the "New Developer Test"
- If a new developer reviewed this diff, would they clearly see a rule being broken?
- If it requires speculation, assumption, or deep context to see a violation, it is NOT a violation

AUTOMATIC PASS CONDITIONS (respond NO_VIOLATIONS immediately if ANY apply):
- The diff is primarily updating existing patterns/code consistently
- The diff uses existing infrastructure (constants, utilities, components) from the codebase
- The changes are version bumps, changelog updates, or metadata changes
- The guideline is about "documenting" something (this tool handles documentation)
- The guideline requires subjective judgment ("enough", "sufficient", "comprehensive")
- The guideline is aspirational/best-practice rather than a hard rule
- You would need to see code NOT in the diff to determine a violation

VIOLATION THRESHOLD - ALL must be true:
1. The diff ADDS or MODIFIES code in a way that DIRECTLY contradicts a specific guideline
2. The violation is OBJECTIVELY verifiable from the diff alone (no assumptions)
3. A reasonable developer would agree this is a clear violation
4. The guideline is actionable for THIS specific change (not a general best practice)

If ANY doubt exists, respond: NO_VIOLATIONS

Output format (ONLY if 100% certain of clear violation):
VIOLATION: [Rule number] - [One sentence explaining what specific code in the diff breaks the rule]

Output format (default - use this unless absolutely certain):
NO_VIOLATIONS`;

  const response = await callGrokApi(apiKey, prompt);

  if (!response || response.trim() === "NO_VIOLATIONS")
    return { violations: [], passed: true };

  const violations = [];
  for (const line of response.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("VIOLATION:")) {
      const violationText = trimmed.replace("VIOLATION:", "").trim();
      const ruleMatch = violationText.match(/^(\d+)\s*-\s*/);
      if (ruleMatch) {
        const ruleIndex = parseInt(ruleMatch[1], 10) - 1;
        const explanation = violationText.replace(/^\d+\s*-\s*/, "").trim();
        violations.push(
          ruleIndex >= 0 && ruleIndex < rules.length
            ? { ruleNumber: ruleIndex + 1, rule: rules[ruleIndex], explanation }
            : { ruleNumber: null, rule: null, explanation: violationText },
        );
      } else {
        violations.push({
          ruleNumber: null,
          rule: null,
          explanation: violationText,
        });
      }
    }
  }

  return { violations, passed: violations.length === 0 };
}

export async function generateNewRules(
  apiKey,
  diff,
  stat,
  changedFiles,
  existingRules,
) {
  if (!diff.trim()) return [];

  const truncatedDiff =
    diff.length > 6000 ? diff.substring(0, 6000) + "\n... (truncated)" : diff;
  const existingRulesText = existingRules.length
    ? existingRules.map((r, i) => `${i + 1}. ${r}`).join("\n")
    : "(No existing rules yet)";

  const prompt = `You are an extremely strict code reviewer. Your job is to identify ONLY hard-won lessons from code changes that would prevent future bugs, architectural mistakes, or subtle gotchas.

CRITICAL: Most commits teach NOTHING new. Your DEFAULT response is NO_NEW_RULES. You should respond NO_NEW_RULES approximately 90% of the time. Only generate a rule if you would bet money that ignoring this lesson WILL cause a real bug or architectural problem in the future.

EXISTING PROJECT RULES (do NOT duplicate or rephrase any of these):
${existingRulesText}

Changed files: ${changedFiles.join(", ")}
Diff statistics:
${stat}

Code changes:
${truncatedDiff}

A RULE IS ONLY WORTH ADDING IF the diff shows evidence of ONE of these:
1. A BUG FIX where someone got burned — what trap should we never fall into again?
2. A SUBTLE GOTCHA that is non-obvious and project-specific (not general programming knowledge)
3. A PROJECT-SPECIFIC CONVENTION that deviates from common defaults and would trip up a new contributor

RESPOND NO_NEW_RULES (your default) if ANY of these are true:
- The change is a new feature, UI update, refactor, or adding functionality (these are NOT lessons)
- The change is routine development work (adding files, updating configs, changing UI, etc.)
- The "rule" would just be describing what was built (e.g., "use tabbed interfaces" or "add progress bars")
- The rule is generic software advice ANY developer already knows (e.g., "use consistent naming", "handle errors", "separate concerns", "use state management", "provide visual feedback")
- The rule is about UI/UX design preferences (colors, layouts, animations, button styles, spacing)
- The rule is about documentation, changelogs, or commit messages
- The rule is about code organization or file structure (unless a specific structure caused a real bug)
- The rule would start with "When building...", "When creating...", "When designing...", "When enhancing...", "When updating...", "When implementing..." followed by a description of normal development work
- The rule is already covered by ANY existing rule, even partially
- You are not 100% confident this rule would prevent a REAL, SPECIFIC problem
- The rule is about how the rules system itself works (rules about rules, rule validation, rule parsing, rule storage)
- The rule is about auto-updating, version checking, update mechanisms, or re-executing after updates
- The rule is about commit message formatting, prefixes, or version numbering in commits
- The rule is about changelog formatting or generation
- The rule is about version incrementing or version file syncing
- The rule describes internal tooling behavior that is already enforced by code (not by rules)

EXAMPLES OF BAD RULES (NEVER generate rules like these):
- "Use consistent color schemes across light and dark themes" (generic UI advice)
- "Implement state management for processes" (obvious engineering)
- "Structure codebase into modular components" (basic programming)
- "Include visual feedback like progress bars" (UI design preference)
- "Separate process execution logic from UI" (standard architecture)
- "Use tabbed interfaces to organize functionality" (describing what was built)
- "Ensure buttons adapt dynamically to context" (generic UX advice)

EXAMPLES OF GOOD RULES (rare, specific, prevent real problems):
- "Always pipe subprocess stdio when capturing output — using 'inherit' silently drops the output buffer"
- "Version in turl.json and package.json must be synced in the same commit or npm publish picks up stale values"
- "Git hooks must be re-installed after npm install because node_modules/.hooks gets wiped"

MAXIMUM: Generate at most 1-2 rules. If you cannot identify a genuine hard-won lesson, respond NO_NEW_RULES.

Output: NO_NEW_RULES
(or, ONLY if you found a genuine lesson)
RULE: [The specific lesson that prevents a real problem]`;

  const response = await callGrokApi(apiKey, prompt);

  if (!response || response.trim() === "NO_NEW_RULES") return [];

  const newRules = [];
  for (const line of response.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("RULE:")) {
      const rule = trimmed.replace("RULE:", "").trim();
      if (rule) newRules.push(rule);
    }
  }

  return newRules;
}

export async function consolidateRules(apiKey, rules) {
  if (rules.length <= 3) return rules;

  const rulesText = rules.map((r, i) => `${i + 1}. ${r}`).join("\n");

  const prompt = `You are ruthlessly pruning and consolidating a list of project rules. These rules guide AI code generation. Quality matters far more than quantity.

CURRENT RULES:
${rulesText}

YOUR TASK (in order of priority):

1. DELETE rules that are generic software advice any developer already knows. Examples of rules to DELETE:
   - Anything about "use consistent colors/themes/styling" (obvious)
   - Anything about "separate concerns" or "modular components" (basic engineering)
   - Anything about "provide visual feedback" or "use progress bars" (obvious UX)
   - Anything about "handle errors comprehensively" (basic programming)
   - Anything about "use state management" (obvious)
   - Anything about button styles, layout spacing, visual hierarchy (design preferences, not rules)
   - Anything about "update documentation when changing features" (obvious)
   - Anything that just describes a normal UI/UX design practice
   - Anything that starts with "When building/creating/designing/enhancing/updating..." and just describes standard development work

2. DELETE rules that describe the tool's own internal behavior — these belong in code, not rules:
   - Rules about how the rules system works (rule parsing, validation, storage, enforcement)
   - Rules about auto-updating, version checking, or re-executing after updates
   - Rules about commit message formatting, prefixes, or version numbers in commits
   - Rules about changelog generation or formatting
   - Rules about version incrementing, version syncing, or version file management
   - Rules about how to detect global vs local npm installations

3. MERGE rules that cover the same concept into ONE concise rule

4. KEEP only rules that capture:
   - Project-specific gotchas that would cause real bugs if ignored
   - Non-obvious conventions specific to THIS project
   - Hard-won lessons from past bugs or mistakes
   - Technical constraints or quirks that a new contributor would not guess

QUALITY TEST for each rule: "Would ignoring this rule cause a REAL BUG or REAL PROBLEM in this specific project?" If no, DELETE it.

Output format (one rule per line):
RULE: [Rule text]

If a rule should be deleted, simply do not include it. Output ONLY the rules worth keeping.`;

  const response = await callGrokApi(apiKey, prompt);
  if (!response) return rules;

  const consolidated = [];
  for (const line of response.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("RULE:")) {
      const rule = trimmed.replace("RULE:", "").trim();
      if (rule) consolidated.push(rule);
    }
  }

  return consolidated.length >= 1 ? consolidated : rules;
}
