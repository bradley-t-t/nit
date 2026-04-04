import React from "react";
import { render, renderToString } from "ink";
import App from "./components/App.js";
import ProviderSelect from "./components/ProviderSelect.js";
import InteractiveMenu from "./components/InteractiveMenu.js";
import CleanupPrompt from "./components/CleanupPrompt.js";
import HelpView from "./components/HelpView.js";
import StatusView from "./components/StatusView.js";
import { store } from "./store.js";

const { createElement: h } = React;

let inkInstance = null;

/**
 * Starts the animated Ink pipeline UI.
 * The App stays mounted and renders spinners/checkmarks as the store updates.
 */
export function startApp() {
  if (store.getOutputLevel() === "quiet") return;
  if (inkInstance) return;
  inkInstance = render(h(App));
}

/**
 * Signals the pipeline is done and waits for Ink to flush + exit.
 * Must be called instead of process.exit() to ensure final output renders.
 */
export async function stopApp() {
  if (!inkInstance) return;
  store.finish();
  try {
    await inkInstance.waitUntilExit();
  } catch {}
  inkInstance = null;
}

/**
 * Immediately unmounts Ink without waiting.
 * Used before interactive prompts to hand stdin/stdout back.
 */
function unmountApp() {
  if (!inkInstance) return;
  inkInstance.unmount();
  inkInstance = null;
}

/**
 * Renders a one-shot component via renderToString (synchronous).
 * @param {React.ReactElement} element
 */
function renderOnce(element) {
  const output = renderToString(element);
  process.stdout.write(`${output}\n`);
}

/**
 * Renders an interactive component as a full Ink app.
 * Pauses the pipeline app, renders the interactive component,
 * then resumes the pipeline app.
 */
function renderInteractive(componentFactory) {
  return new Promise((resolve) => {
    unmountApp();

    let instance;
    const handleComplete = (value) => {
      if (instance) {
        instance.unmount();
        instance = null;
      }
      startApp();
      resolve(value);
    };

    instance = render(componentFactory(handleComplete));
    instance.waitUntilExit().catch(() => {});
  });
}

/** @returns {Promise<string>} Selected provider ID. */
export function renderProviderSelect() {
  return renderInteractive((onComplete) =>
    h(ProviderSelect, { onSelect: onComplete }),
  );
}

/** @returns {Promise<{ branch: string|null, skipBuild: boolean, skipFormat: boolean }>} */
export function renderInteractiveMenu() {
  return renderInteractive((onComplete) => h(InteractiveMenu, { onComplete }));
}

/** @returns {Promise<{ cleanLogs: boolean, cleanCss: boolean }>} */
export function renderCleanupPrompt() {
  return renderInteractive((onComplete) => h(CleanupPrompt, { onComplete }));
}

/** Renders help text synchronously. */
export function renderHelp() {
  renderOnce(h(HelpView));
}

/**
 * Renders the status view synchronously.
 * @param {{ config: object, currentBranch: string, nodeProject: boolean }} props
 */
export function renderStatusView(props) {
  unmountApp();
  renderOnce(h(StatusView, props));
}
