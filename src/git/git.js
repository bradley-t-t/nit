import fs from "fs";
import path from "path";
import { execSync, spawn, spawnSync } from "child_process";
import { ErrorCodes } from "../utils/constants.js";
import { NitError } from "../utils/errors.js";

const PROJECT_ROOT = process.cwd();

const BRANCH_NAME_PATTERN = /^[a-zA-Z0-9._/-]+$/;

/** Runs a shell command in the project root. Throws on failure unless ignoreError is set. */
export function execCommand(command, options = {}) {
  try {
    return execSync(command, {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      stdio: options.silent !== false ? "pipe" : "inherit",
      ...options,
    });
  } catch (err) {
    if (options.ignoreError) return err.stdout || "";
    throw err;
  }
}

/** Runs a shell command silently, returning stdout on failure instead of throwing. */
export function execCommandSilent(command) {
  try {
    return execSync(command, {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      stdio: "pipe",
    });
  } catch (err) {
    return err.stdout || err.stderr || "";
  }
}

/**
 * Validates a branch name against a safe character pattern.
 * Prevents CWE-78 command injection via malicious branch names.
 * @param {string} branchName
 * @throws {NitError} If the branch name contains invalid characters.
 */
function validateBranchName(branchName) {
  if (!BRANCH_NAME_PATTERN.test(branchName)) {
    throw new NitError(
      `Invalid branch name: ${branchName}`,
      ErrorCodes.GIT_BRANCH_FAILED,
      {
        suggestion:
          "Branch names may only contain letters, digits, dots, underscores, hyphens, and slashes",
      },
    );
  }
}

/** Verifies git is installed and accessible in PATH. */
export function checkGitInstalled() {
  try {
    execSync("git --version", { stdio: "pipe" });
    return true;
  } catch {
    throw new NitError(
      "Git is not installed or not in PATH",
      ErrorCodes.GIT_NOT_INSTALLED,
      {
        suggestion: "Install git from https://git-scm.com/downloads",
      },
    );
  }
}

/** Verifies the current directory is inside a git repository. */
export function checkGitRepository() {
  try {
    execSync("git rev-parse --git-dir", { cwd: PROJECT_ROOT, stdio: "pipe" });
    return true;
  } catch {
    throw new NitError("Not a git repository", ErrorCodes.GIT_NOT_INITIALIZED, {
      path: PROJECT_ROOT,
      suggestion: "Run 'git init' to initialize a git repository",
    });
  }
}

/** Verifies at least one git remote is configured. */
export function checkGitRemote() {
  try {
    const remotes = execSync("git remote", {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      stdio: "pipe",
    });
    if (!remotes.trim()) {
      throw new NitError("No git remote configured", ErrorCodes.GIT_NO_REMOTE, {
        suggestion: "Run 'git remote add origin <url>' to add a remote",
      });
    }
    return true;
  } catch (err) {
    if (err instanceof NitError) throw err;
    throw new NitError(
      "Failed to check git remotes",
      ErrorCodes.GIT_NO_REMOTE,
      { originalError: err.message },
    );
  }
}

/** Returns true if the working tree has any uncommitted changes. */
export function hasChanges() {
  const status = execCommandSilent("git status --porcelain");
  return status.trim().length > 0;
}

/** Returns the full unified diff (unstaged + staged), optionally excluding nit.json. */
export function getGitDiff(excludeNitJson = false) {
  if (excludeNitJson) {
    return execCommandSilent('git diff HEAD -- . ":(exclude)public/nit.json"');
  }
  return execCommandSilent("git diff HEAD");
}

/** Returns the diff --stat summary, optionally excluding nit.json. */
export function getGitDiffStat(excludeNitJson = false) {
  if (excludeNitJson) {
    return execCommandSilent(
      'git diff HEAD --stat -- . ":(exclude)public/nit.json"',
    );
  }
  return execCommandSilent("git diff HEAD --stat");
}

/** Returns a deduplicated list of changed file paths, optionally excluding nit.json. */
export function getChangedFiles(excludeNitJson = false) {
  const files = execCommandSilent("git diff HEAD --name-only");
  let fileList = [...new Set(files.split("\n").filter(Boolean))];
  if (excludeNitJson) {
    fileList = fileList.filter(
      (f) => f !== "public/nit.json" && f !== "nit.json",
    );
  }
  return fileList;
}

/** Creates a git commit using a temp file to safely pass multi-line messages. */
export function gitCommit(commitMessage) {
  const tempFile = path.join(PROJECT_ROOT, ".commit-msg-temp");
  try {
    fs.writeFileSync(tempFile, commitMessage, "utf-8");
    const result = spawnSync("git", ["commit", "-F", tempFile], {
      encoding: "utf8",
      cwd: PROJECT_ROOT,
    });
    try {
      fs.unlinkSync(tempFile);
    } catch {}
    if (result.status !== 0) {
      const errorMessage = result.stderr || result.stdout || "";
      if (errorMessage.includes("nothing to commit")) {
        throw new NitError(
          "Nothing to commit - all changes may have been reverted",
          ErrorCodes.GIT_COMMIT_FAILED,
          { suggestion: "Make sure there are actual changes to commit" },
        );
      }
      throw new NitError(
        `Git commit failed: ${errorMessage}`,
        ErrorCodes.GIT_COMMIT_FAILED,
        { originalError: errorMessage },
      );
    }
  } catch (err) {
    try {
      fs.unlinkSync(tempFile);
    } catch {}
    if (err instanceof NitError) throw err;
    throw new NitError(
      `Git commit failed: ${err.message}`,
      ErrorCodes.GIT_COMMIT_FAILED,
      { originalError: err.message },
    );
  }
}

/** Pushes to origin, with descriptive errors for common failure modes. */
export function gitPush(branch = "main") {
  validateBranchName(branch);
  try {
    execCommand(`git push origin ${branch}`, { silent: true });
  } catch (err) {
    const errorMsg = err.message || err.stderr || "";
    if (
      errorMsg.includes("rejected") ||
      errorMsg.includes("non-fast-forward")
    ) {
      throw new NitError(
        `Push rejected. Remote has changes not present locally.`,
        ErrorCodes.GIT_PUSH_FAILED,
        {
          branch,
          suggestion: `Pull the latest changes with 'git pull origin ${branch}' and try again`,
        },
      );
    }
    if (
      errorMsg.includes("Permission denied") ||
      errorMsg.includes("authentication")
    ) {
      throw new NitError(
        "Git push failed: Authentication error",
        ErrorCodes.GIT_PUSH_FAILED,
        {
          branch,
          suggestion: "Check your git credentials or SSH keys",
        },
      );
    }
    if (
      errorMsg.includes("does not exist") ||
      errorMsg.includes("Could not read from remote")
    ) {
      throw new NitError(
        "Git push failed: Remote repository not found",
        ErrorCodes.GIT_PUSH_FAILED,
        {
          branch,
          suggestion: "Check your remote URL with 'git remote -v'",
        },
      );
    }
    throw new NitError(
      `Git push failed: ${errorMsg}`,
      ErrorCodes.GIT_PUSH_FAILED,
      { branch, originalError: errorMsg },
    );
  }
}

/**
 * Stages changes according to the specified mode.
 * @param {"all" | "tracked"} mode - "all" stages everything, "tracked" stages only tracked files.
 */
export function stageChanges(mode = "all") {
  const command = mode === "tracked" ? "git add -u" : "git add -A";
  try {
    execCommand(command, { silent: true });
  } catch (err) {
    throw new NitError(
      `Staging failed: ${err.message}`,
      ErrorCodes.GIT_COMMIT_FAILED,
      { originalError: err.message },
    );
  }
}

/**
 * Creates and checks out a new branch.
 * @param {string} branchName - The name for the new branch.
 */
export function createBranch(branchName) {
  validateBranchName(branchName);
  try {
    const result = spawnSync("git", ["checkout", "-b", branchName], {
      encoding: "utf8",
      cwd: PROJECT_ROOT,
    });
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || "Unknown error");
    }
  } catch (err) {
    throw new NitError(
      `Failed to create branch "${branchName}": ${err.message}`,
      ErrorCodes.GIT_BRANCH_FAILED,
      { branch: branchName, originalError: err.message },
    );
  }
}

/**
 * Returns the name of the currently checked-out branch.
 * @returns {string} The current branch name.
 */
export function getCurrentBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
  } catch (err) {
    throw new NitError(
      `Failed to get current branch: ${err.message}`,
      ErrorCodes.GIT_BRANCH_FAILED,
      { originalError: err.message },
    );
  }
}

/**
 * Pushes a new branch to origin with upstream tracking.
 * @param {string} branch - The branch name to push.
 */
export function gitPushNewBranch(branch) {
  validateBranchName(branch);
  try {
    const result = spawnSync("git", ["push", "-u", "origin", branch], {
      encoding: "utf8",
      cwd: PROJECT_ROOT,
    });
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || "Unknown error");
    }
  } catch (err) {
    if (err instanceof NitError) throw err;
    throw new NitError(
      `Failed to push new branch "${branch}": ${err.message}`,
      ErrorCodes.GIT_PUSH_FAILED,
      { branch, originalError: err.message },
    );
  }
}

/** Runs the build command as a child process, capturing stdout/stderr for error reporting. */
export function runBuild(buildCommand) {
  return new Promise((resolve, reject) => {
    const [cmd, ...cmdArgs] = buildCommand.split(" ");
    const child = spawn(cmd, cmdArgs, {
      cwd: PROJECT_ROOT,
      stdio: "pipe",
    });

    let stderrOutput = "";
    let stdoutOutput = "";

    child.stdout.on("data", (data) => {
      stdoutOutput += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderrOutput += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) return resolve();
      const errorOutput = (stderrOutput || stdoutOutput).trim();
      reject(
        new NitError(
          `Build failed with exit code ${code}`,
          ErrorCodes.BUILD_FAILED,
          { command: buildCommand, exitCode: code, output: errorOutput },
        ),
      );
    });

    child.on("error", (err) => {
      reject(
        new NitError(
          `Build process error: ${err.message}`,
          ErrorCodes.BUILD_FAILED,
          { command: buildCommand, originalError: err.message },
        ),
      );
    });
  });
}
