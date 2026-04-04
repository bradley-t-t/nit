import React from "react";
import { Text, Box } from "ink";

const { createElement: h } = React;

/** Renders a dry-run prefixed message in yellow. */
export default function DryRunNotice({ message }) {
  return h(
    Box,
    { paddingLeft: 2 },
    h(Text, { color: "yellow", bold: true }, "[DRY RUN]"),
    h(Text, null, ` ${message}`),
  );
}
