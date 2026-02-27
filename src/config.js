import fs from "fs";
import path from "path";
import {
  safeReadFile,
  safeWriteFile,
  safeParseJson,
  fileExists,
} from "./file-utils.js";
import { ErrorCodes } from "./constants.js";
import { TurlError } from "./errors.js";

const PROJECT_ROOT = process.cwd();

export function validateApiKey(apiKey) {
  if (!apiKey) {
    throw new TurlError(
      "GROK_API_KEY not found. Add GROK_API_KEY=your-key to your project's .env file",
      ErrorCodes.API_KEY_MISSING,
      {
        suggestion:
          "Create a .env file in your project root with: GROK_API_KEY=xai-your-key-here",
        helpUrl: "https://console.x.ai",
      },
    );
  }
  if (!apiKey.startsWith("xai-") && !apiKey.startsWith("sk-")) {
    throw new TurlError(
      "Invalid API key format. Key should start with 'xai-' or 'sk-'",
      ErrorCodes.API_KEY_INVALID,
      {
        suggestion: "Check your API key at https://console.x.ai",
        keyPrefix: apiKey.substring(0, 4) + "...",
      },
    );
  }
  if (apiKey.length < 20) {
    throw new TurlError(
      "API key appears to be too short",
      ErrorCodes.API_KEY_INVALID,
      { suggestion: "Verify your API key at https://console.x.ai" },
    );
  }
  return true;
}

export function readTurlConfig() {
  const turlPath = path.join(PROJECT_ROOT, "public", "turl.json");
  const defaultConfig = {
    version: "1.0",
    projectName: path.basename(PROJECT_ROOT),
    branch: "main",
  };

  if (!fileExists(turlPath)) {
    const publicDir = path.join(PROJECT_ROOT, "public");
    if (!fileExists(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
    safeWriteFile(
      turlPath,
      JSON.stringify(defaultConfig, null, 2),
      "turl.json",
    );
    return defaultConfig;
  }

  const content = safeReadFile(turlPath, "turl.json");
  const parsed = safeParseJson(content, turlPath, "turl.json");

  return {
    version: String(parsed.version || defaultConfig.version),
    projectName: parsed.projectName || defaultConfig.projectName,
    branch: parsed.branch || defaultConfig.branch,
  };
}

export function incrementVersion(version) {
  const parts = version.split(".");
  let major = parseInt(parts[0], 10) || 1;
  let minor = parseInt(parts[1], 10) || 0;

  minor++;
  if (minor >= 10) {
    major++;
    minor = 0;
  }
  return `${major}.${minor}`;
}

export function updatePackageJsonVersion(newVersion) {
  const packageJsonPath = path.join(PROJECT_ROOT, "package.json");
  if (!fileExists(packageJsonPath))
    return { updated: false, reason: "package.json not found" };

  try {
    const content = safeReadFile(packageJsonPath, "package.json");
    const packageJson = safeParseJson(content, packageJsonPath, "package.json");
    const semverVersion =
      newVersion.includes(".") && newVersion.split(".").length === 2
        ? `${newVersion}.0`
        : newVersion;

    if (packageJson.version === semverVersion)
      return { updated: false, reason: "version already matches" };

    packageJson.version = semverVersion;
    safeWriteFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + "\n",
      "package.json",
    );

    return {
      updated: true,
      oldVersion: content.match(/"version":\s*"([^"]+)"/)?.[1],
      newVersion: semverVersion,
    };
  } catch (err) {
    return { updated: false, reason: err.message };
  }
}

export function writeTurlConfig(config) {
  const turlPath = path.join(PROJECT_ROOT, "public", "turl.json");
  safeWriteFile(turlPath, JSON.stringify(config, null, 2) + "\n", "turl.json");
  return updatePackageJsonVersion(config.version);
}

export function updateChangelog(changelogEntry) {
  const changelogPath = path.join(PROJECT_ROOT, "CHANGELOG.md");
  let existingContent = "";

  if (fileExists(changelogPath)) {
    existingContent = safeReadFile(changelogPath, "CHANGELOG.md");
  }

  const header =
    "# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n";

  if (!existingContent) {
    safeWriteFile(
      changelogPath,
      header + changelogEntry + "\n",
      "CHANGELOG.md",
    );
    return;
  }

  if (existingContent.startsWith("# Changelog")) {
    const headerEndIndex = existingContent.indexOf(
      "\n\n",
      existingContent.indexOf("\n") + 1,
    );
    if (headerEndIndex !== -1) {
      const existingHeader = existingContent.substring(0, headerEndIndex + 2);
      const existingEntries = existingContent.substring(headerEndIndex + 2);
      safeWriteFile(
        changelogPath,
        existingHeader + changelogEntry + "\n" + existingEntries,
        "CHANGELOG.md",
      );
      return;
    }
  }

  safeWriteFile(
    changelogPath,
    header + changelogEntry + "\n" + existingContent,
    "CHANGELOG.md",
  );
}
