import React, { useState } from "react";
import { Text, Box, Newline } from "ink";
import SelectInput from "ink-select-input";
import { SYMBOLS } from "../../utils/constants.js";

const { createElement: h } = React;

const YES_NO_ITEMS = [
  { label: "Yes", value: true },
  { label: "No", value: false },
];

const STEPS = {
  LOGS: "logs",
  CSS: "css",
  DONE: "done",
};

/**
 * Two-step cleanup prompt: console.log removal + unused CSS removal.
 * @param {{ onComplete: (options: { cleanLogs: boolean, cleanCss: boolean }) => void }} props
 */
export default function CleanupPrompt({ onComplete }) {
  const [step, setStep] = useState(STEPS.LOGS);
  const [cleanLogs, setCleanLogs] = useState(true);

  const handleLogsSelect = (item) => {
    setCleanLogs(item.value);
    setStep(STEPS.CSS);
  };

  const handleCssSelect = (item) => {
    setStep(STEPS.DONE);
    setTimeout(() => onComplete({ cleanLogs, cleanCss: item.value }), 50);
  };

  const headerRow = h(
    Box,
    null,
    h(Text, { color: "blue" }, SYMBOLS.arrowRight),
    h(Text, { bold: true }, " Code Cleanup"),
  );

  if (step === STEPS.LOGS) {
    return h(
      Box,
      { flexDirection: "column", paddingLeft: 2 },
      h(Newline, null),
      headerRow,
      h(
        Box,
        { flexDirection: "column", paddingLeft: 2 },
        h(Text, null, "Remove console.log statements?"),
        h(SelectInput, { items: YES_NO_ITEMS, onSelect: handleLogsSelect }),
      ),
      h(Newline, null),
    );
  }

  if (step === STEPS.CSS) {
    return h(
      Box,
      { flexDirection: "column", paddingLeft: 2 },
      h(Newline, null),
      headerRow,
      h(
        Box,
        { flexDirection: "column", paddingLeft: 2 },
        h(
          Text,
          { dimColor: true },
          `Console logs: ${cleanLogs ? "remove" : "keep"}`,
        ),
        h(Text, null, "Remove unused CSS classes?"),
        h(SelectInput, { items: YES_NO_ITEMS, onSelect: handleCssSelect }),
      ),
      h(Newline, null),
    );
  }

  return h(
    Box,
    { flexDirection: "column", paddingLeft: 2 },
    h(Newline, null),
    headerRow,
    h(
      Box,
      { flexDirection: "column", paddingLeft: 2 },
      h(
        Text,
        { dimColor: true },
        `Console logs: ${cleanLogs ? "remove" : "keep"}`,
      ),
      h(Text, { dimColor: true }, "Unused CSS: done"),
    ),
    h(Newline, null),
  );
}
