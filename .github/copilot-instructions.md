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
- When updating the terminal UI, use the same box-drawing characters consistently (e.g., use all thin-line ─│┌┐└┘ OR all double-line ═║╔╗╚╝, never mix).
- Sync version numbers across turl.json and package.json in the same commit to prevent version drift.
- When checking for rule violations in code, require HIGH confidence (100% certainty) before flagging to minimize false positives.
- Structure violation feedback to show the full rule text and specific explanation so developers understand what to fix.
- Prefix commit messages with the project or tool name (e.g., "TURL Release Tool:") for clear context in version release commits.
- Include the specific version number in commit messages for release updates (e.g., "Release vX.Y") to track version history accurately.
- Maintain a consistent prefix format in commit messages for release commits (e.g., "TURL Release Tool:" or "Release:") to ensure uniformity across the project history.
- Increment version numbers sequentially in release commits to maintain a clear and logical version progression.
- When adding new commands or features, update the help menu in the same commit to reflect the new functionality and ensure user guidance remains accurate.
- Include support for command-specific flags (like `--quiet` or `-q`) when introducing new commands to allow users to control output verbosity or behavior.
- When adding new commands or features, update the help menu and changelog in the same commit to ensure documentation remains accurate and up-to-date.
- Store project rules in `.github/copilot-instructions.md` instead of a separate text file like `public/turl.txt` for better integration with GitHub Copilot and to maintain a centralized location for development guidelines.
- Use defined section markers (e.g., `<!-- TURL-RULES-START -->` and `.
- Automatically create necessary directories (e.g., `.github/`) when writing configuration or documentation files to prevent errors due to missing paths.
- Store project rules in `.github/copilot-instructions.md` instead of `public/turl.txt` for better integration with GitHub Copilot and improved organization.
- Automatically create necessary directories (e.g., `.github/`) when writing rule files if they do not exist to prevent file operation failures.
<!-- TURL-RULES-END -->`) when managing rules in documentation files to ensure accurate reading and writing of rule content.
<!-- TURL-RULES-END -->`) when managing rules in documentation files to ensure automated updates only affect the intended sections.
<!-- TURL-RULES-END -->
