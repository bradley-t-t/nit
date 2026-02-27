import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { TURL_SECTION_START, TURL_SECTION_END } from "./constants.js";
import { safeReadFile } from "./file-utils.js";
import { loadEnv, getApiKey } from "./env.js";
import { generateNewRules } from "./api.js";

const PROJECT_ROOT = process.cwd();
const COPILOT_INSTRUCTIONS_PATH = path.join(
  PROJECT_ROOT,
  ".github",
  "copilot-instructions.md",
);

export function readTurlRules() {
  if (!fs.existsSync(COPILOT_INSTRUCTIONS_PATH))
    return { rules: [], rawContent: "" };

  const content = safeReadFile(
    COPILOT_INSTRUCTIONS_PATH,
    "copilot-instructions.md",
  );
  const startIdx = content.indexOf(TURL_SECTION_START);
  const endIdx = content.indexOf(TURL_SECTION_END);

  if (startIdx === -1 || endIdx === -1)
    return { rules: [], rawContent: content };

  const sectionContent = content.slice(
    startIdx + TURL_SECTION_START.length,
    endIdx,
  );
  const rules = [];

  for (const line of sectionContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const cleanedRule = trimmed.replace(/^[\s\-*]+/, "").trim();
      if (
        cleanedRule &&
        cleanedRule.length >= 10 &&
        !cleanedRule.startsWith("_") &&
        !cleanedRule.startsWith("<!--") &&
        !cleanedRule.includes("TURL-RULES-")
      ) {
        rules.push(cleanedRule);
      }
    }
  }

  return { rules, rawContent: content };
}

export function formatRule(rule) {
  let formatted = rule
    .replace(/^[\s\-*]+/, "")
    .trim()
    .replace(/\s+/g, " ");
  if (!formatted) return "";
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  if (!/[.!?]$/.test(formatted)) formatted += ".";
  return formatted;
}

export function normalizeForComparison(rule) {
  return rule
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function deduplicateRules(rules) {
  const seen = new Map();
  const result = [];
  for (const rule of rules) {
    const normalized = normalizeForComparison(rule);
    if (!normalized) continue;
    if (!seen.has(normalized)) {
      seen.set(normalized, true);
      result.push(rule);
    }
  }
  return result;
}

const FILE_SPECIFIC_PATTERNS = [
  /\b(?:src|lib|dist|build|test|spec)\/\S+\.\w+/i,
  /\bas seen in\b/i,
  /\bin (?:the )?(?:file |module )?(?:src|lib)\/\S+/i,
  /\b(?:function|method|variable|class) `?\w+`? in \S+\.\w+/i,
  /\b\w+\(\)\s+in\s+\S+\.\w+/i,
];

function isFileSpecificRule(rule) {
  return FILE_SPECIFIC_PATTERNS.some((pattern) => pattern.test(rule));
}

export function isValidRule(rule) {
  if (!rule || typeof rule !== "string") return false;
  if (rule.includes("<!--") || rule.includes("-->")) return false;
  if (rule.includes("TURL-RULES-")) return false;
  if (rule.length < 10 || rule.length > 500) return false;
  return !isFileSpecificRule(rule);
}

export function writeTurlRules(rules) {
  const githubDir = path.join(PROJECT_ROOT, ".github");
  if (!fs.existsSync(githubDir)) fs.mkdirSync(githubDir, { recursive: true });

  const formattedRules = rules
    .map(formatRule)
    .filter((r) => Boolean(r) && isValidRule(r));
  const dedupedRules = deduplicateRules(formattedRules);

  let existingContent = "";
  if (fs.existsSync(COPILOT_INSTRUCTIONS_PATH)) {
    existingContent = fs.readFileSync(COPILOT_INSTRUCTIONS_PATH, "utf-8");
  }

  const rulesMarkdown =
    dedupedRules.length > 0
      ? dedupedRules.map((r) => `- ${r}`).join("\n")
      : "_No rules defined yet._";

  const turlSection = `${TURL_SECTION_START}
## Project Rules (Auto-managed by TURL)

These rules are automatically learned from project commits and enforced during releases.
Do not edit this section manually - it will be overwritten.

${rulesMarkdown}
${TURL_SECTION_END}`;

  let newContent;
  if (existingContent.includes(TURL_SECTION_START)) {
    const regex = new RegExp(
      `${TURL_SECTION_START}[\\s\\S]*?${TURL_SECTION_END}`,
      "g",
    );
    newContent = existingContent.replace(regex, turlSection);
  } else if (existingContent.trim()) {
    newContent = existingContent.trim() + "\n\n" + turlSection + "\n";
  } else {
    newContent = `# Copilot Instructions

This file provides context to GitHub Copilot for this project.

${turlSection}
`;
  }

  fs.writeFileSync(COPILOT_INSTRUCTIONS_PATH, newContent, "utf-8");
}

export function appendTurlRule(newRule) {
  const { rules } = readTurlRules();
  const formattedNew = formatRule(newRule);
  if (!formattedNew || !isValidRule(formattedNew)) return false;

  const normalizedNew = normalizeForComparison(formattedNew);
  const isDuplicate = rules.some(
    (existing) => normalizeForComparison(existing) === normalizedNew,
  );

  if (!isDuplicate) {
    rules.push(formattedNew);
    writeTurlRules(rules);
    return true;
  }
  return false;
}

export function syncRulesToCopilotInstructions() {
  const { rules } = readTurlRules();
  writeTurlRules(rules);
  return { rulesCount: rules.length, path: COPILOT_INSTRUCTIONS_PATH };
}

export function cleanupRulesFile() {
  const { rules } = readTurlRules();
  if (rules.length === 0) return { cleaned: false };

  const cleanedRules = rules
    .map(formatRule)
    .filter((rule) => rule && isValidRule(rule));
  const dedupedRules = deduplicateRules(cleanedRules);

  if (dedupedRules.length !== rules.length) {
    writeTurlRules(dedupedRules);
    return { cleaned: true, before: rules.length, after: dedupedRules.length };
  }
  return { cleaned: false };
}

export async function handlePostCommitHook() {
  loadEnv();
  const apiKey = getApiKey();
  if (!apiKey) return;

  try {
    const diff = execSync("git diff HEAD~1 HEAD", {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      stdio: "pipe",
      maxBuffer: 1024 * 1024,
    });
    if (!diff.trim()) return;

    const stat = execSync("git diff HEAD~1 HEAD --stat", {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      stdio: "pipe",
    });
    const changedFiles = execSync("git diff HEAD~1 HEAD --name-only", {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      stdio: "pipe",
    })
      .split("\n")
      .filter(Boolean);
    const { rules: existingRules } = readTurlRules();

    const newRules = await generateNewRules(
      apiKey,
      diff,
      stat,
      changedFiles,
      existingRules,
    );
    if (newRules.length > 0) {
      for (const rule of newRules) appendTurlRule(rule);
      syncRulesToCopilotInstructions();
    }
  } catch {}
}
