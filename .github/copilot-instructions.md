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
- When consolidating multiple commands into a single command, ensure that all relevant functionality from the removed commands is either integrated into the new command or explicitly documented as removed to avoid loss of features.
- When introducing a simplified workflow or major UI change, update all related documentation (like help menus and usage instructions) in the same commit to reflect the new structure and prevent user confusion.
- When updating markdown files like copilot-instructions.md, ensure proper spacing and formatting (e.g., adding blank lines for readability) in sections such as project rules to maintain clear visual separation of content.
- When restructuring a monolithic codebase into modular files, ensure that all functionality from the original file (e.g., index.js) is either migrated to the appropriate new modules (e.g., api.js, cli.js) or explicitly documented as removed to prevent accidental loss of features.
- When introducing new API integrations (like Grok API for changelog generation), include comprehensive error handling for network issues, response validation, and API-specific error codes to ensure robust operation and clear user feedback.
- When adding new modules or significant features (e.g., rules.js for guideline enforcement), centralize related logic in dedicated files to improve maintainability and make future updates easier to manage.
- When adjusting padding or alignment in CLI output displays, ensure the calculation accounts for all visual elements (like labels and borders) to maintain proper field alignment and readability, as seen in the change from BOX_WIDTH - 15 to BOX_WIDTH - 14 for Project, Version, and Branch fields.
- When simplifying CLI interfaces, remove unnecessary decorative elements like colors, symbols, and boxed formatting, and replace them with plain, concise prompts to reduce visual clutter and improve user focus, as seen in the changes to interactiveMenu() and promptUserForViolations() in src/cli.js.
- When simplifying the UI in a CLI tool, remove complex formatting functions (like box drawing or spinner animations) and focus on minimal, clear output functions such as headers, ensuring that redundant output is prevented by tracking display states (e.g., using a flag like headerPrinted).
- When managing subprocess execution in a Node.js CLI tool, set the default stdio behavior to 'pipe' for exec and spawn commands to capture output programmatically, unless explicitly overridden to 'inherit' for user-visible output, to maintain control over process communication.
<!-- TURL-RULES-END -->
