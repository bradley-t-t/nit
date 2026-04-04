import React, { useState } from "react";
import { Text, Box } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";

const { createElement: h } = React;

const STEPS = {
  BRANCH: "branch",
  BUILD: "build",
  FORMAT: "format",
  DONE: "done",
};

const YES_NO_ITEMS = [
  { label: "Yes", value: true },
  { label: "No", value: false },
];

/**
 * Multi-step interactive menu for release options.
 * @param {{ onComplete: (options: object) => void }} props
 */
export default function InteractiveMenu({ onComplete }) {
  const [step, setStep] = useState(STEPS.BRANCH);
  const [branch, setBranch] = useState("");
  const [skipBuild, setSkipBuild] = useState(false);

  const handleBranchSubmit = () => setStep(STEPS.BUILD);

  const handleBuildSelect = (item) => {
    setSkipBuild(!item.value);
    setStep(STEPS.FORMAT);
  };

  const handleFormatSelect = (item) => {
    setStep(STEPS.DONE);
    setTimeout(
      () =>
        onComplete({
          branch: branch.trim() || null,
          skipBuild,
          skipFormat: !item.value,
        }),
      50,
    );
  };

  if (step === STEPS.BRANCH) {
    return h(
      Box,
      { paddingLeft: 2 },
      h(Text, null, "Branch (default): "),
      h(TextInput, {
        value: branch,
        onChange: setBranch,
        onSubmit: handleBranchSubmit,
      }),
    );
  }

  if (step === STEPS.BUILD) {
    return h(
      Box,
      { flexDirection: "column", paddingLeft: 2 },
      branch.trim()
        ? h(Text, { dimColor: true }, `Branch: ${branch.trim()}`)
        : null,
      h(Text, null, "Run build?"),
      h(SelectInput, { items: YES_NO_ITEMS, onSelect: handleBuildSelect }),
    );
  }

  if (step === STEPS.FORMAT) {
    return h(
      Box,
      { flexDirection: "column", paddingLeft: 2 },
      branch.trim()
        ? h(Text, { dimColor: true }, `Branch: ${branch.trim()}`)
        : null,
      h(Text, { dimColor: true }, `Build: ${skipBuild ? "skip" : "yes"}`),
      h(Text, null, "Run formatter?"),
      h(SelectInput, { items: YES_NO_ITEMS, onSelect: handleFormatSelect }),
    );
  }

  return h(
    Box,
    { paddingLeft: 2 },
    h(Text, { dimColor: true }, "Options saved."),
  );
}
