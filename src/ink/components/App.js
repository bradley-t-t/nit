import React, { useEffect } from "react";
import { Box, Text, Static, useApp } from "ink";
import Spinner from "ink-spinner";
import { useStore } from "../hooks.js";
import Header from "./Header.js";

const { createElement: h } = React;

const SYMBOLS = {
  check: "\u2713",
  cross: "\u2717",
  dash: "\u2500",
  warn: "\u26A0",
};

/** A single completed/failed/skipped step rendered in the Static (scrollback) zone. */
function CompletedStep({ step }) {
  const symbolMap = {
    done: h(Text, { color: "green" }, SYMBOLS.check),
    failed: h(Text, { color: "red" }, SYMBOLS.cross),
    skipped: h(Text, { dimColor: true }, SYMBOLS.dash),
    warn: h(Text, { color: "yellow" }, SYMBOLS.warn),
  };

  const colorMap = {
    done: undefined,
    failed: "red",
    skipped: undefined,
    warn: "yellow",
  };

  return h(
    Box,
    { paddingLeft: 2 },
    symbolMap[step.status],
    h(
      Text,
      { color: colorMap[step.status], dimColor: step.status === "skipped" },
      ` ${step.name}`,
    ),
  );
}

/** A dry-run notice rendered in the Static zone. */
function DryRunLine({ message }) {
  return h(
    Box,
    { paddingLeft: 2 },
    h(Text, { color: "yellow", bold: true }, "[DRY RUN]"),
    h(Text, null, ` ${message}`),
  );
}

/** The currently active step with a spinner, rendered in the live zone. */
function ActiveStep({ step }) {
  return h(
    Box,
    { paddingLeft: 2 },
    h(Text, { color: "blue" }, h(Spinner, { type: "dots" })),
    h(Text, null, ` ${step.name}`),
  );
}

/** Error display at the bottom. */
function ErrorBlock({ message, detail }) {
  const detailLines = detail
    ? detail
        .split("\n")
        .filter(Boolean)
        .map((line, i) => h(Text, { key: i, color: "red" }, `    ${line}`))
    : [];

  return h(
    Box,
    { flexDirection: "column", paddingLeft: 2 },
    h(
      Box,
      null,
      h(Text, { color: "red" }, SYMBOLS.cross),
      h(Text, { color: "red" }, ` ${message}`),
    ),
    ...detailLines,
  );
}

/**
 * Root Ink component. Renders the animated pipeline:
 * - Static zone: header + completed steps (scroll up, never re-rendered)
 * - Live zone: current active step with spinner
 */
export default function App() {
  const state = useStore();
  const { exit } = useApp();

  // Exit the Ink app when the pipeline signals completion
  useEffect(() => {
    if (state.completed || state.exitRequested) {
      // Give Ink one more render tick to flush the final state
      const timer = setTimeout(() => exit(), 30);
      return () => clearTimeout(timer);
    }
  }, [state.completed, state.exitRequested, exit]);

  if (state.outputLevel === "quiet") {
    // In quiet mode, just exit immediately
    if (state.completed || state.exitRequested) {
      exit();
    }
    return null;
  }

  // Split steps into completed (Static) and active (live)
  const completedSteps = state.steps.filter(
    (s) => s.status !== "active" && s.status !== "pending",
  );
  const activeStep = state.steps.find((s) => s.status === "active");

  // Build items for Static (rendered once, scrolls up)
  const staticItems = [];
  if (state.headerVisible) {
    staticItems.push({ id: "header", type: "header" });
  }
  completedSteps.forEach((step, i) => {
    staticItems.push({ id: `step-${i}`, type: "step", step });
  });
  state.dryRunMessages.forEach((message, i) => {
    staticItems.push({ id: `dry-${i}`, type: "dryrun", message });
  });
  if (state.errorMessage) {
    staticItems.push({
      id: "error",
      type: "error",
      message: state.errorMessage,
      detail: state.errorDetail,
    });
  }

  const renderStaticItem = (item) => {
    switch (item.type) {
      case "header":
        return h(Header);
      case "step":
        return h(CompletedStep, { step: item.step });
      case "dryrun":
        return h(DryRunLine, { message: item.message });
      case "error":
        return h(ErrorBlock, { message: item.message, detail: item.detail });
      default:
        return null;
    }
  };

  return h(
    Box,
    { flexDirection: "column" },
    // Static zone: header + completed steps (never re-rendered)
    h(Static, { items: staticItems }, (item) =>
      h(Box, { key: item.id }, renderStaticItem(item)),
    ),
    // Live zone: active step with spinner
    activeStep ? h(ActiveStep, { step: activeStep }) : null,
  );
}
