import React from "react";
import { Text, Box } from "ink";
import { PACKAGE_VERSION, PACKAGE_AUTHOR } from "../../utils/constants.js";

const { createElement: h } = React;

const LOGO_LINES = [
  { n: "███╗   ██╗", i: "██║", t: "████████╗" },
  { n: "████╗  ██║", i: "██║", t: "╚══██╔══╝" },
  { n: "██╔██╗ ██║", i: "██║", t: "   ██║   " },
  { n: "██║╚██╗██║", i: "██║", t: "   ██║   " },
  { n: "██║ ╚████║", i: "██║", t: "   ██║   " },
  { n: "╚═╝  ╚═══╝", i: "╚═╝", t: "   ╚═╝   " },
];

const SEPARATOR = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

function LogoLine({ line, index }) {
  const rightContent = {
    1: h(Text, { dimColor: true }, `  ${SEPARATOR}`),
    2: h(
      Text,
      { bold: true, color: "white" },
      "  Automated Release Management",
    ),
    3: h(
      Text,
      { dimColor: true },
      `  v${PACKAGE_VERSION} by ${PACKAGE_AUTHOR}`,
    ),
    4: h(Text, { dimColor: true }, `  ${SEPARATOR}`),
  };

  return h(
    Box,
    null,
    h(Text, { bold: true, color: "red" }, line.n),
    h(Text, { bold: true, color: "white" }, line.i),
    h(Text, { bold: true, color: "blue" }, line.t),
    rightContent[index] ?? null,
  );
}

export default function Header() {
  return h(
    Box,
    { flexDirection: "column", paddingLeft: 2 },
    h(Text, null, " "),
    ...LOGO_LINES.map((line, index) =>
      h(LogoLine, { key: index, line, index }),
    ),
    h(Text, null, " "),
  );
}
