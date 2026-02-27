import fs from "fs";
import path from "path";
import { execSync, spawn } from "child_process";
import { ErrorCodes } from "./constants.js";
import { TurlError } from "./errors.js";

const PROJECT_ROOT = process.cwd();

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

export function checkGitInstalled() {
  try {
    execSync("git --version", { stdio: "pipe" });
    return true;
  } catch {
    throw new TurlError(
      "Git is not installed or not in PATH",
      ErrorCodes.GIT_NOT_INSTALLED,
      {
        suggestion: "Install git from https://git-scm.com/downloads",
      },
    );
  }
}

export function checkGitRepository() {
  try {
    execSync("git rev-parse --git-dir", { cwd: PROJECT_ROOT, stdio: "pipe" });
    return true;
  } catch {
    throw new TurlError(
      "Not a git repository",
      ErrorCodes.GIT_NOT_INITIALIZED,
      {
        path: PROJECT_ROOT,
        suggestion: "Run 'git init' to initialize a git repository",
      },
    );
  }
}

export function checkGitRemote() {
  try {
    const remotes = execSync("git remote", {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      stdio: "pipe",
    });
    if (!remotes.trim()) {
      throw new TurlError(
        "No git remote configured",
        ErrorCodes.GIT_NO_REMOTE,
        {
          suggestion: "Run 'git remote add origin <url>' to add a remote",
        },
      );
    }
    return true;
  } catch (err) {
    if (err instanceof TurlError) throw err;
    throw new TurlError(
      "Failed to check git remotes",
      ErrorCodes.GIT_NO_REMOTE,
      { originalError: err.message },
    );
  }
}

export function hasChanges() {
  const status = execCommandSilent("git status --porcelain");
  return status.trim().length > 0;
}

export function getGitDiff(excludeTurlJson = false) {
  if (excludeTurlJson) {
    const diff = execCommandSilent(
      "git diff HEAD -- . ':(exclude)public/turl.json'",
    );
    const stagedDiff = execCommandSilent(
      "git diff --cached -- . ':(exclude)public/turl.json'",
    );
    return diff + stagedDiff;
  }
  return (
    execCommandSilent("git diff HEAD") + execCommandSilent("git diff --cached")
  );
}

export function getGitDiffStat(excludeTurlJson = false) {
  if (excludeTurlJson) {
    const stat = execCommandSilent(
      "git diff HEAD --stat -- . ':(exclude)public/turl.json'",
    );
    const stagedStat = execCommandSilent(
      "git diff --cached --stat -- . ':(exclude)public/turl.json'",
    );
    return stat + stagedStat;
  }
  return (
    execCommandSilent("git diff HEAD --stat") +
    execCommandSilent("git diff --cached --stat")
  );
}

export function getChangedFiles(excludeTurlJson = false) {
  const files = execCommandSilent("git diff HEAD --name-only");
  const stagedFiles = execCommandSilent("git diff --cached --name-only");
  let fileList = [
    ...new Set((files + stagedFiles).split("\n").filter(Boolean)),
  ];
  if (excludeTurlJson) {
    fileList = fileList.filter(
      (f) => f !== "public/turl.json" && f !== "turl.json",
    );
  }
  return fileList;
}

export function gitCommit(commitMessage) {
  const tempFile = path.join(PROJECT_ROOT, ".commit-msg-temp");
  try {
    fs.writeFileSync(tempFile, commitMessage, "utf-8");
    execCommand(`git commit -F "${tempFile}"`, { silent: true });
    try {
      fs.unlinkSync(tempFile);
    } catch {}
  } catch (err) {
    try {
      fs.unlinkSync(tempFile);
    } catch {}
    if (err.message?.includes("nothing to commit")) {
      throw new TurlError(
        "Nothing to commit - all changes may have been reverted",
        ErrorCodes.GIT_COMMIT_FAILED,
        {
          suggestion: "Make sure there are actual changes to commit",
        },
      );
    }
    throw new TurlError(
      `Git commit failed: ${err.message}`,
      ErrorCodes.GIT_COMMIT_FAILED,
      { originalError: err.message },
    );
  }
}

export function gitPush(branch = "main") {
  try {
    execCommand(`git push origin ${branch}`, { silent: true });
  } catch (err) {
    const errorMsg = err.message || err.stderr || "";
    if (
      errorMsg.includes("rejected") ||
      errorMsg.includes("non-fast-forward")
    ) {
      throw new TurlError(
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
      throw new TurlError(
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
      throw new TurlError(
        "Git push failed: Remote repository not found",
        ErrorCodes.GIT_PUSH_FAILED,
        {
          branch,
          suggestion: "Check your remote URL with 'git remote -v'",
        },
      );
    }
    throw new TurlError(
      `Git push failed: ${errorMsg}`,
      ErrorCodes.GIT_PUSH_FAILED,
      { branch, originalError: errorMsg },
    );
  }
}

export function ensureGitHooksInstalled() {
  const hooksDir = path.join(PROJECT_ROOT, ".git", "hooks");
  if (!fs.existsSync(hooksDir)) return false;

  const postCommitPath = path.join(hooksDir, "post-commit");
  if (
    !fs.existsSync(postCommitPath) ||
    !fs.readFileSync(postCommitPath, "utf-8").includes("turl-release")
  ) {
    const hookContent = `#!/bin/sh
# TURL Auto-Learning Hook
if command -v turl-release &> /dev/null; then
  (turl-release _post-commit &> /dev/null &)
fi
`;
    let content = hookContent;
    if (fs.existsSync(postCommitPath)) {
      const existing = fs.readFileSync(postCommitPath, "utf-8");
      if (!existing.includes("turl-release")) {
        content = existing.trim() + "\n\n" + hookContent;
      } else {
        return true;
      }
    }
    fs.writeFileSync(postCommitPath, content, { mode: 0o755 });
    return true;
  }
  return true;
}

export function runBuild(buildCommand) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = buildCommand.split(" ");
    const child = spawn(cmd, args, {
      cwd: PROJECT_ROOT,
      stdio: "pipe",
      shell: true,
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new TurlError(
            `Build failed with exit code ${code}`,
            ErrorCodes.BUILD_FAILED,
            { command: buildCommand, exitCode: code },
          ),
        );
    });

    child.on("error", (err) => {
      reject(
        new TurlError(
          `Build process error: ${err.message}`,
          ErrorCodes.BUILD_FAILED,
          { command: buildCommand, originalError: err.message },
        ),
      );
    });
  });
}
