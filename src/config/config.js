import fs from "fs";
import path from "path";
import {
  safeReadFile,
  safeWriteFile,
  safeParseJson,
  fileExists,
} from "../utils/file-utils.js";
import { ErrorCodes, AI_PROVIDERS, HOOK_NAMES } from "../utils/constants.js";
import { NitError } from "../utils/errors.js";

const PROJECT_ROOT = process.cwd();

/**
 * Converts a two-segment version like "11.7" to proper semver "11.7.0".
 * Already-valid three-segment versions pass through unchanged.
 * @param {string} version
 * @returns {string} A three-segment semver string.
 */
function migrateVersion(version) {
  const parts = String(version).split(".");
  if (parts.length === 2) return `${parts[0]}.${parts[1]}.0`;
  return String(version);
}

/**
 * Validates the nit.json config object against expected schema constraints.
 * Throws CONFIG_INVALID on any violation.
 * @param {object} config
 */
function validateConfig(config) {
  if (!config.projectName || typeof config.projectName !== "string") {
    throw new NitError(
      "nit.json: projectName must be a non-empty string",
      ErrorCodes.CONFIG_INVALID,
    );
  }

  const versionPattern = /^\d+\.\d+\.\d+$/;
  if (!versionPattern.test(config.version)) {
    throw new NitError(
      `nit.json: version "${config.version}" is not valid semver (expected X.Y.Z)`,
      ErrorCodes.CONFIG_INVALID,
    );
  }

  if (config.hooks) {
    const hookKeys = Object.keys(config.hooks);
    for (const key of hookKeys) {
      if (!HOOK_NAMES.includes(key)) {
        throw new NitError(
          `nit.json: unknown hook "${key}". Valid hooks: ${HOOK_NAMES.join(", ")}`,
          ErrorCodes.CONFIG_INVALID,
        );
      }
      if (typeof config.hooks[key] !== "string") {
        throw new NitError(
          `nit.json: hook "${key}" must be a string command`,
          ErrorCodes.CONFIG_INVALID,
        );
      }
    }
  }
}

/** Validates that the API key exists and meets minimum length for a provider. CLI providers skip validation. */
export function validateApiKey(apiKey, providerId = "grok") {
  const provider = AI_PROVIDERS[providerId];
  if (provider?.isCli) return true;

  const providerName = provider?.name ?? providerId;
  const signupUrl = provider?.signupUrl ?? "your AI provider dashboard";
  const envKeyHint = provider?.envKeys?.[0] ?? "API_KEY";

  if (!apiKey) {
    throw new NitError(
      `API key not found for ${providerName}. Add ${envKeyHint}=your-key to your project's .env file`,
      ErrorCodes.API_KEY_MISSING,
      {
        suggestion: `Create a .env file in your project root with: ${envKeyHint}=your-key-here`,
        helpUrl: signupUrl,
      },
    );
  }
  if (apiKey.length < 20) {
    throw new NitError(
      `API key for ${providerName} appears to be too short`,
      ErrorCodes.API_KEY_INVALID,
      { suggestion: `Verify your API key at ${signupUrl}` },
    );
  }
  return true;
}

/**
 * Reads public/nit.json config, creating it with defaults if missing.
 * Migrates two-segment versions to semver and validates the result.
 */
export function readNitConfig() {
  const nitConfigPath = path.join(PROJECT_ROOT, "public", "nit.json");
  const defaultConfig = {
    version: "1.0.0",
    projectName: path.basename(PROJECT_ROOT),
    branch: "main",
    provider: null,
    cleanLogs: true,
    cleanCss: false,
    hooks: {},
  };

  if (!fileExists(nitConfigPath)) {
    const publicDir = path.join(PROJECT_ROOT, "public");
    if (!fileExists(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
    safeWriteFile(
      nitConfigPath,
      JSON.stringify(defaultConfig, null, 2),
      "nit.json",
    );
    return defaultConfig;
  }

  const content = safeReadFile(nitConfigPath, "nit.json");
  const parsed = safeParseJson(content, nitConfigPath, "nit.json");

  const config = {
    version: migrateVersion(parsed.version || defaultConfig.version),
    projectName: parsed.projectName || defaultConfig.projectName,
    branch: parsed.branch || defaultConfig.branch,
    provider: parsed.provider || null,
    cleanLogs:
      parsed.cleanLogs !== undefined
        ? parsed.cleanLogs
        : defaultConfig.cleanLogs,
    cleanCss:
      parsed.cleanCss !== undefined ? parsed.cleanCss : defaultConfig.cleanCss,
    hooks: parsed.hooks || {},
  };

  validateConfig(config);
  return config;
}

/**
 * Bumps the version according to the specified bump type.
 * @param {string} version - Current semver version (e.g. "1.2.3").
 * @param {"patch" | "minor" | "major"} bumpType - Which segment to increment.
 * @returns {string} The incremented version string.
 */
export function incrementVersion(version, bumpType = "patch") {
  const parts = version.split(".");
  const major = parseInt(parts[0], 10) || 0;
  const minor = parseInt(parts[1], 10) || 0;
  const patch = parseInt(parts[2], 10) || 0;

  switch (bumpType) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

/** Syncs the version in package.json to match the new release version. */
export function updatePackageJsonVersion(newVersion) {
  const packageJsonPath = path.join(PROJECT_ROOT, "package.json");
  if (!fileExists(packageJsonPath))
    return { updated: false, reason: "package.json not found" };

  try {
    const content = safeReadFile(packageJsonPath, "package.json");
    const packageJson = safeParseJson(content, packageJsonPath, "package.json");

    if (packageJson.version === newVersion)
      return { updated: false, reason: "version already matches" };

    packageJson.version = newVersion;
    safeWriteFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + "\n",
      "package.json",
    );

    return {
      updated: true,
      oldVersion: content.match(/"version":\s*"([^"]+)"/)?.[1],
      newVersion,
    };
  } catch (err) {
    return { updated: false, reason: err.message };
  }
}

/** Updates version in plugin files (gradle.properties, plugin.xml) if they exist. */
function updatePluginVersion(newVersion) {
  const gradlePropsPath = path.join(
    PROJECT_ROOT,
    "plugin",
    "gradle.properties",
  );
  if (fileExists(gradlePropsPath)) {
    try {
      const content = safeReadFile(gradlePropsPath, "gradle.properties");
      const updated = content.replace(
        /^pluginVersion\s*=\s*.+$/m,
        `pluginVersion = ${newVersion}`,
      );
      if (updated !== content)
        safeWriteFile(gradlePropsPath, updated, "gradle.properties");
    } catch {}
  }

  const pluginXmlPath = path.join(
    PROJECT_ROOT,
    "plugin",
    "src",
    "main",
    "resources",
    "META-INF",
    "plugin.xml",
  );
  if (fileExists(pluginXmlPath)) {
    try {
      const content = safeReadFile(pluginXmlPath, "plugin.xml");
      const updated = content.replace(
        /<version>[^<]*<\/version>/,
        `<version>${newVersion}</version>`,
      );
      if (updated !== content)
        safeWriteFile(pluginXmlPath, updated, "plugin.xml");
    } catch {}
  }
}

/** Persists the nit config to public/nit.json and syncs version to package.json + plugin files. */
export function writeNitConfig(config) {
  const nitConfigPath = path.join(PROJECT_ROOT, "public", "nit.json");
  const persistedConfig = {
    version: config.version,
    projectName: config.projectName,
    branch: config.branch,
    provider: config.provider || null,
    cleanLogs: config.cleanLogs !== undefined ? config.cleanLogs : true,
    cleanCss: config.cleanCss !== undefined ? config.cleanCss : false,
    hooks: config.hooks || {},
  };
  safeWriteFile(
    nitConfigPath,
    JSON.stringify(persistedConfig, null, 2) + "\n",
    "nit.json",
  );
  updatePluginVersion(config.version);
  return updatePackageJsonVersion(config.version);
}

/** Inserts a new changelog entry into CHANGELOG.md, creating the file if needed. */
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
