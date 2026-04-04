import React from "react";
import { Text, Box, Newline } from "ink";

const { createElement: h } = React;

const SEPARATOR = "\u2500".repeat(35);

function StatusRow({ label, value }) {
  return h(
    Box,
    null,
    h(Text, { color: "blue" }, label.padEnd(12)),
    h(Text, null, value),
  );
}

/**
 * Renders the `nit status` project info view.
 * @param {{ config: object, currentBranch: string, nodeProject: boolean }} props
 */
export default function StatusView({ config, currentBranch, nodeProject }) {
  const hookNames = Object.keys(config.hooks || {});

  return h(
    Box,
    { flexDirection: "column", paddingLeft: 2 },
    h(Newline, null),
    h(Text, { bold: true }, "Project Status"),
    h(Text, { dimColor: true }, SEPARATOR),
    h(StatusRow, { label: "Project", value: config.projectName }),
    h(StatusRow, { label: "Version", value: `v${config.version}` }),
    h(
      Box,
      null,
      h(Text, { color: "blue" }, "Branch".padEnd(12)),
      h(Text, null, `${currentBranch} `),
      h(Text, { dimColor: true }, `(config: ${config.branch})`),
    ),
    h(StatusRow, {
      label: "Provider",
      value: config.provider || "not configured",
    }),
    h(StatusRow, { label: "Node", value: nodeProject ? "yes" : "no" }),
    h(StatusRow, {
      label: "Clean Logs",
      value: config.cleanLogs ? "enabled" : "disabled",
    }),
    h(StatusRow, {
      label: "Clean CSS",
      value: config.cleanCss ? "enabled" : "disabled",
    }),
    h(StatusRow, {
      label: "Hooks",
      value: hookNames.length > 0 ? hookNames.join(", ") : "none",
    }),
    h(Text, { dimColor: true }, SEPARATOR),
    h(Newline, null),
  );
}
