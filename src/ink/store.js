import { EventEmitter } from "events";

/**
 * Pipeline step states for the animated UI.
 * @typedef {"pending" | "active" | "done" | "failed" | "skipped" | "warn"} StepStatus
 * @typedef {{ name: string, status: StepStatus, detail?: string }} PipelineStep
 */

/**
 * Centralized state store bridging the imperative pipeline with Ink.
 * Pipeline code calls methods here; the Ink App subscribes via events.
 */
class PipelineStore extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
    this.reset();
  }

  reset() {
    this.state = {
      outputLevel: "normal",
      headerVisible: false,
      /** @type {PipelineStep[]} */
      steps: [],
      /** @type {string[]} */
      dryRunMessages: [],
      errorMessage: null,
      errorDetail: null,
      completed: false,
      exitRequested: false,
    };
  }

  /** @param {"quiet" | "normal" | "verbose"} level */
  setOutputLevel(level) {
    this.state.outputLevel = level;
    this._emit();
  }

  getOutputLevel() {
    return this.state.outputLevel;
  }

  showHeader() {
    this.state.headerVisible = true;
    this._emit();
  }

  /**
   * Adds a step with "active" status and a spinner.
   * Any previously active step is automatically marked "done".
   * @param {string} name
   */
  startStep(name) {
    if (this.state.outputLevel === "quiet") return;
    this._finishActiveStep();
    this.state.steps.push({ name, status: "active" });
    this._emit();
  }

  /**
   * Marks the current active step as done and adds a new completed step.
   * Useful when a step completes instantly (no spinner needed).
   * @param {string} name
   */
  completeStep(name) {
    if (this.state.outputLevel === "quiet") return;
    this._finishActiveStep();
    this.state.steps.push({ name, status: "done" });
    this._emit();
  }

  /**
   * Adds a step with "warn" status (yellow indicator, no spinner).
   * @param {string} name
   */
  warnStep(name) {
    if (this.state.outputLevel === "quiet") return;
    this._finishActiveStep();
    this.state.steps.push({ name, status: "warn" });
    this._emit();
  }

  /** Marks the current active step as failed. */
  failStep(detail) {
    const activeStep = this.state.steps.find((s) => s.status === "active");
    if (activeStep) {
      activeStep.status = "failed";
      activeStep.detail = detail;
    }
    this._emit();
  }

  /**
   * @param {string} message
   * @param {string} [detail]
   */
  setError(message, detail) {
    this._finishActiveStep("failed");
    this.state.errorMessage = message;
    this.state.errorDetail = detail ?? null;
    this._emit();
  }

  /** @param {string} message */
  setDryRun(message) {
    if (this.state.outputLevel === "quiet") return;
    this.state.dryRunMessages.push(message);
    this._emit();
  }

  /** Signal the pipeline is done — triggers Ink exit after a final render. */
  finish() {
    this._finishActiveStep();
    this.state.completed = true;
    this._emit();
  }

  /** Request app exit (called from the Ink side after final render). */
  requestExit() {
    this.state.exitRequested = true;
    this._emit();
  }

  getState() {
    return this.state;
  }

  /** Marks any currently active step as done (or the given status). */
  _finishActiveStep(status = "done") {
    const activeStep = this.state.steps.find((s) => s.status === "active");
    if (activeStep) activeStep.status = status;
  }

  _emit() {
    this.emit("change", this.state);
  }
}

export const store = new PipelineStore();
