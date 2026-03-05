import fs from "fs";
import path from "path";
import {
  safeReadFile,
  safeWriteFile,
  safeParseJson,
  fileExists,
} from "./file-utils.js";
import { ErrorCodes, AI_PROVIDERS } from "./constants.js";
import { NitError } from "./errors.js";

const PROJECT_ROOT = process.cwd();

export function validateApiKey(apiKey, providerId = "grok") {
  const provider = AI_PROVIDERS[providerId];
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

export function readNitConfig() {
  const nitConfigPath = path.join(PROJECT_ROOT, "public", "nit.json");
  const defaultConfig = {
    version: "1.0",
    projectName: path.basename(PROJECT_ROOT),
    branch: "main",
    provider: null,
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

  return {
    version: String(parsed.version || defaultConfig.version),
    projectName: parsed.projectName || defaultConfig.projectName,
    branch: parsed.branch || defaultConfig.branch,
    provider: parsed.provider || null,
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

function toSemver(version) {
  return version.includes(".") && version.split(".").length === 2
    ? `${version}.0`
    : version;
}

export function updatePackageJsonVersion(newVersion) {
  const packageJsonPath = path.join(PROJECT_ROOT, "package.json");
  if (!fileExists(packageJsonPath))
    return { updated: false, reason: "package.json not found" };

  try {
    const content = safeReadFile(packageJsonPath, "package.json");
    const packageJson = safeParseJson(content, packageJsonPath, "package.json");
    const semverVersion = toSemver(newVersion);

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

function updatePluginVersion(newVersion) {
  const semverVersion = toSemver(newVersion);

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
        `pluginVersion = ${semverVersion}`,
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
        `<version>${semverVersion}</version>`,
      );
      if (updated !== content)
        safeWriteFile(pluginXmlPath, updated, "plugin.xml");
    } catch {}
  }
}

export function writeNitConfig(config) {
  const nitConfigPath = path.join(PROJECT_ROOT, "public", "nit.json");
  const persistedConfig = {
    version: config.version,
    projectName: config.projectName,
    branch: config.branch,
    provider: config.provider || null,
  };
  safeWriteFile(
    nitConfigPath,
    JSON.stringify(persistedConfig, null, 2) + "\n",
    "nit.json",
  );
  updatePluginVersion(config.version);
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
