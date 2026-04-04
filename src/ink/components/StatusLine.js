import React from "react";
import { Text, Box } from "ink";

const { createElement: h } = React;

/** Single status message with a blue arrow prefix. */
export default function StatusLine({ message }) {
  return h(
    Box,
    { paddingLeft: 2 },
    h(Text, { color: "blue" }, "\u25b8"),
    h(Text, null, ` ${message}`),
  );
}
