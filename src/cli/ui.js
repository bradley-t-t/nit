import { store } from "../ink/store.js";

/**
 * UI facade that delegates to the Ink pipeline store.
 * Pipeline output is rendered live by the Ink App component
 * with animated spinners for active steps.
 */
export const ui = {
  /** @param {"quiet" | "normal" | "verbose"} level */
  setOutputLevel: (level) => store.setOutputLevel(level),

  getOutputLevel: () => store.getOutputLevel(),

  verbose: (message) => store.startStep(message),

  showCursor: () => process.stdout.write("\x1b[?25h"),

  printHeader: () => store.showHeader(),

  /** Starts an active step with a spinner. Use before async work. */
  step: (statusMessage) => store.startStep(statusMessage),

  /** Instantly marks a step as done with a checkmark. Use for sync results. */
  done: (statusMessage) => store.completeStep(statusMessage),

  /** Shows a yellow warning indicator. */
  warn: (statusMessage) => store.warnStep(statusMessage),

  /**
   * @deprecated Use `step()` for async work or `done()` for instant results.
   * Kept for backward compat — delegates to startStep (spinner).
   */
  printHeaderWithStatus: (statusMessage) => store.startStep(statusMessage),

  printHeaderWithError: (statusMessage, errorDetail) =>
    store.setError(statusMessage, errorDetail),

  dryRun: (message) => store.setDryRun(message),
};
