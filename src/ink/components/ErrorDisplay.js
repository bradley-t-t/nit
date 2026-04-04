import React from "react";
import { Text, Box } from "ink";

const { createElement: h } = React;

/** Renders an error message with optional multi-line detail. */
export default function ErrorDisplay({ message, detail }) {
  const detailLines = detail
    ? detail
        .split("\n")
        .filter(Boolean)
        .map((line, index) => h(Text, { key: index, color: "red" }, line))
    : [];

  return h(
    Box,
    { flexDirection: "column", paddingLeft: 2 },
    h(
      Box,
      null,
      h(Text, { color: "blue" }, "\u25b8"),
      h(Text, null, ` ${message}`),
    ),
    ...detailLines,
  );
}
