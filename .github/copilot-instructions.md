# Copilot Instructions

This file provides context to GitHub Copilot for this project.

<!-- TURL-RULES-START -->

## Project Rules (Auto-managed by TURL)

These rules are automatically learned from project commits and enforced during releases.
Do not edit this section manually - it will be overwritten.

- Place turl.json in a public/ directory rather than the project root for cleaner structure.
- Sync version numbers across turl.json and package.json in the same commit to prevent version drift.
- When relocating files, update all code paths and git commands referencing those files to avoid commit failures.
- Use npm view queries for version checking rather than custom registry calls for reliability.
- Prefix commit messages with the project or tool name and include the specific version number for release updates (e.g., "TURL Release Tool: Release vX.Y") to ensure clear context and track version history accurately.
- Auto-update turl-release at the start of every release before any other operations to ensure the latest features are used.
- When checking for rule violations in code, require HIGH confidence (100% certainty) before flagging to minimize false positives.
- Structure violation feedback to show the full rule text and specific explanation so developers understand what to fix.
- Store project rules in .github/copilot-instructions.md for better integration with GitHub Copilot and centralized guidelines.
- When parsing rules from documentation files, use robust regex patterns to handle various bullet formats and filter invalid content, and automatically create necessary directories (e.g., .github/) when writing configuration files.
- When managing subprocess execution in a Node.js CLI tool, set the default stdio behavior to 'pipe' for exec and spawn commands to capture output programmatically, unless explicitly overridden to 'inherit' for user-visible output, to maintain control over process communication.
- When performing updates for a CLI tool, detect whether the installation is global or local by querying npm list commands, and tailor the update command (e.g., npm install -g for global or npm install --save-dev for local) to match the installation type, ensuring compatibility with different user setups.
<!-- TURL-RULES-END -->
