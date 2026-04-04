import React from "react";
import { Text, Box } from "ink";

const { createElement: h } = React;

/** Renders a dimmed verbose-mode message. */
export default function VerboseLine({ message }) {
  return h(
    Box,
    { paddingLeft: 2 },
    h(Text, { dimColor: true }, `\u25b8 ${message}`),
  );
}
