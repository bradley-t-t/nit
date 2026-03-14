import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import {
  safeReadFile,
  safeParseJson,
  fileExists,
} from "../utils/file-utils.js";
import { AI_PROVIDERS } from "../utils/constants.js";

const PROJECT_ROOT = process.cwd();

/** Returns true if the current project has a package.json (i.e. is a Node project). */
export function isNodeProject() {
  return fileExists(path.join(PROJECT_ROOT, "package.json"));
}

/** Parses a .env file and loads its key=value pairs into process.env. */
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

/** Loads the project's .env file from the current working directory. */
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

/** Checks whether node_modules exists in the project root. */
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

/** Checks if Prettier is available locally or globally. */
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

/** Detects the project's build command from package.json scripts or known frameworks. */
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

/** Detects the project's format command from package.json scripts or Prettier availability. */
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
