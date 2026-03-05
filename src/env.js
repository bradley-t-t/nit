import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { safeReadFile, safeParseJson, fileExists } from "./file-utils.js";
import { AI_PROVIDERS } from "./constants.js";

const PROJECT_ROOT = process.cwd();

export function loadEnvFromPath(envPath) {
  if (!fileExists(envPath)) return false;

  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const equalsIndex = trimmed.indexOf("=");
      if (equalsIndex !== -1) {
        const key = trimmed.substring(0, equalsIndex).trim();
        let value = trimmed.substring(equalsIndex + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (key) process.env[key] = value;
      }
    }
  }
  return true;
}

export function loadEnv() {
  const projectEnvPath = path.join(PROJECT_ROOT, ".env");
  loadEnvFromPath(projectEnvPath);
}

/** Resolves the API key for a given provider from environment variables. */
export function getApiKeyForProvider(providerId) {
  const provider = AI_PROVIDERS[providerId];
  if (!provider) return null;
  for (const envKey of provider.envKeys) {
    if (process.env[envKey]) return process.env[envKey];
  }
  return null;
}

/** @deprecated Use getApiKeyForProvider instead. Kept for backward compatibility. */
export function getApiKey() {
  return process.env.GROK_API_KEY || process.env.REACT_APP_GROK_API_KEY || null;
}

export function checkNodeModules() {
  const nodeModulesPath = path.join(PROJECT_ROOT, "node_modules");
  if (!fileExists(nodeModulesPath)) {
    return {
      exists: false,
      warning:
        "node_modules not found. Run 'npm install' first if you need dependencies.",
    };
  }
  return { exists: true };
}

export function checkPrettierInstalled() {
  const prettierPath = path.join(PROJECT_ROOT, "node_modules", "prettier");
  const globalCheck = () => {
    try {
      execSync("npx prettier --version", { cwd: PROJECT_ROOT, stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  };

  if (fileExists(prettierPath)) return { installed: true, location: "local" };
  if (globalCheck()) return { installed: true, location: "global" };
  return {
    installed: false,
    warning:
      "Prettier not installed. Install with 'npm install --save-dev prettier' for code formatting.",
  };
}

export function detectBuildCommand() {
  const packageJsonPath = path.join(PROJECT_ROOT, "package.json");
  if (!fileExists(packageJsonPath)) return null;

  const content = safeReadFile(packageJsonPath, "package.json");
  const packageJson = safeParseJson(content, packageJsonPath, "package.json");
  const scripts = packageJson.scripts || {};

  if (scripts.build) return "npm run build";

  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  if (deps.vite) return "npx vite build";
  if (deps["react-scripts"]) return "npx react-scripts build";

  return null;
}

export function detectFormatCommand() {
  const packageJsonPath = path.join(PROJECT_ROOT, "package.json");
  if (!fileExists(packageJsonPath))
    return { command: null, warning: "No package.json found" };

  const content = safeReadFile(packageJsonPath, "package.json");
  const packageJson = safeParseJson(content, packageJsonPath, "package.json");
  const scripts = packageJson.scripts || {};

  if (scripts.format) return { command: "npm run format", type: "script" };

  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const prettierCheck = checkPrettierInstalled();

  if (deps.prettier || prettierCheck.installed)
    return { command: "npx prettier --write .", type: "prettier" };

  return {
    command: null,
    warning: prettierCheck.warning || "No formatter configured",
    suggestion:
      "Add prettier as dev dependency or add a 'format' script to package.json",
  };
}
