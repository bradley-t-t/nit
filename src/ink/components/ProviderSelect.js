import React, { useState } from "react";
import { Text, Box, Newline } from "ink";
import SelectInput from "ink-select-input";
import { AI_PROVIDERS, SYMBOLS } from "../../utils/constants.js";

const { createElement: h } = React;

/**
 * Interactive AI provider picker rendered via Ink.
 * @param {{ onSelect: (providerId: string) => void }} props
 */
export default function ProviderSelect({ onSelect }) {
  const [selected, setSelected] = useState(null);

  const providerItems = Object.entries(AI_PROVIDERS).map(([id, provider]) => {
    const hint = provider.isCli
      ? "uses your Claude subscription"
      : `env: ${provider.envKeys[0]}`;
    return { label: `${provider.name}  (${hint})`, value: id };
  });

  const handleSelect = (item) => {
    setSelected(item.value);
    setTimeout(() => onSelect(item.value), 100);
  };

  if (selected) {
    const provider = AI_PROVIDERS[selected];
    const infoLine = provider.isCli
      ? h(
          Text,
          { dimColor: true },
          "Make sure the 'claude' CLI is installed and authenticated.",
        )
      : h(
          Box,
          { flexDirection: "column" },
          h(
            Text,
            { dimColor: true },
            `Make sure ${provider.envKeys[0]} is set in your .env file.`,
          ),
          h(Text, { dimColor: true }, `Get a key at: ${provider.signupUrl}`),
        );

    return h(
      Box,
      { flexDirection: "column", paddingLeft: 2 },
      h(Newline, null),
      h(
        Box,
        null,
        h(Text, { color: "green" }, SYMBOLS.check),
        h(Text, null, ` Selected: ${provider.name}`),
      ),
      infoLine,
      h(Newline, null),
    );
  }

  return h(
    Box,
    { flexDirection: "column", paddingLeft: 2 },
    h(Newline, null),
    h(Text, { bold: true }, "AI Provider Setup"),
    h(
      Text,
      { dimColor: true },
      "Choose which AI provider nit will use for changelogs and commit messages.",
    ),
    h(Text, { dimColor: true }, "Your choice is saved in public/nit.json."),
    h(Newline, null),
    h(SelectInput, { items: providerItems, onSelect: handleSelect }),
  );
}
