import { execSync } from "child_process";
import { ErrorCodes } from "../utils/constants.js";
import { NitError } from "../utils/errors.js";
import { ui } from "../cli/ui.js";

/**
 * Executes a named lifecycle hook if configured.
 * Skips silently when no command is registered for the hook name.
 * @param {string} hookName - One of the valid HOOK_NAMES (e.g. "preRelease", "postCommit").
 * @param {object} hooks - The hooks config object from nit.json.
 * @param {object} [options] - Optional flags.
 * @param {boolean} [options.dryRun] - When true, logs the command without executing.
 */
export function executeHook(hookName, hooks, options = {}) {
  const command = hooks?.[hookName];
  if (!command) return;

  if (options.dryRun) {
    ui.dryRun(`Would run hook "${hookName}": ${command}`);
    return;
  }

  ui.verbose(`Running hook "${hookName}": ${command}`);

  try {
    execSync(command, {
      cwd: process.cwd(),
      stdio: ui.getOutputLevel() === "verbose" ? "inherit" : "pipe",
      encoding: "utf-8",
    });
  } catch (err) {
    throw new NitError(
      `Hook "${hookName}" failed: ${err.message}`,
      ErrorCodes.HOOK_FAILED,
      { hook: hookName, command, originalError: err.message },
    );
  }
}
