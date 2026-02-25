# Copilot Instructions

This file provides context to GitHub Copilot for this project.

<!-- TURL-RULES-START -->

## Project Rules (Auto-managed by TURL)

These rules are automatically learned from project commits and enforced during releases.
Do not edit this section manually - it will be overwritten.

- Place turl.json in a public/ directory rather than the project root for cleaner structure.
- When relocating files, update all code paths and git commands referencing those files to avoid commit failures.
- Use the established COLORS and SYMBOLS constants for all terminal UI elements to maintain visual consistency.
- Use npm view queries for version checking rather than custom registry calls for reliability.
- When updating the terminal UI, use the same box-drawing characters consistently (e.g., use all thin-line or all double-line, never mix).
- Sync version numbers across turl.json and package.json in the same commit to prevent version drift.
- When checking for rule violations in code, require HIGH confidence (100% certainty) before flagging to minimize false positives.
- Structure violation feedback to show the full rule text and specific explanation so developers understand what to fix.
- Prefix commit messages with the project or tool name (e.g., "TURL Release Tool:") for clear context in version release commits.
- Include the specific version number in commit messages for release updates (e.g., "Release vX.Y") to track version history accurately.
- Maintain a consistent prefix format in commit messages for release commits to ensure uniformity across the project history.
- Increment version numbers sequentially in release commits to maintain a clear and logical version progression.
- When adding new commands or features, update the help menu in the same commit to reflect the new functionality.
- Include support for command-specific flags (like --quiet or -q) when introducing new commands to allow users to control output.
- When adding new commands or features, update the help menu and changelog in the same commit to ensure documentation remains accurate.
- Store project rules in .github/copilot-instructions.md for better integration with GitHub Copilot and centralized guidelines.
- Use defined section markers when managing rules in documentation files to ensure accurate reading and writing of rule content.
- Automatically create necessary directories (e.g., .github/) when writing configuration or documentation files.
- When parsing rules from documentation files, use robust regex patterns to handle various bullet formats and filter invalid content.
- Implement a dedicated validation function for rules to enforce content, length, and format constraints.
- When implementing auto-update functionality, provide clear feedback messages including current and latest version numbers.
- Auto-update turl-release at the start of every release before any other operations to ensure latest features are used.
<!-- TURL-RULES-END -->
