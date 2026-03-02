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
- When simplifying the UI in a CLI tool, remove complex formatting functions (like box drawing or spinner animations) and focus on minimal, clear output functions such as headers, ensuring that redundant output is prevented by tracking display states (e.g., using a flag like headerPrinted).
- When managing subprocess execution in a Node.js CLI tool, set the default stdio behavior to 'pipe' for exec and spawn commands to capture output programmatically, unless explicitly overridden to 'inherit' for user-visible output, to maintain control over process communication.
- When implementing version checking for updates in a CLI tool, dynamically fetch the installed version from package.json using a require method (e.g., createRequire) instead of relying on a static constant to ensure accurate version comparison, especially in environments where the constant might be outdated.
- When performing updates for a CLI tool, detect whether the installation is global or local by querying npm list commands, and tailor the update command (e.g., npm install -g for global or npm install --save-dev for local) to match the installation type, ensuring compatibility with different user setups.
- When implementing an update mechanism in a CLI tool, include functionality to automatically re-execute the tool with the same arguments after a successful update (e.g., using execSync with filtered arguments), ensuring a seamless user experience without requiring manual restarts.
- When managing UI header display logic in a CLI tool, avoid using global state flags (like `headerPrinted`) to track whether a header has been displayed. Instead, consolidate related display methods (e.g., merge `printHeader` into `printHeaderWithStatus`) to ensure explicit control over when and how headers are rendered, preventing redundant or unexpected output.
- When defining project guidelines or rules for AI-assisted code generation, ensure they focus on generic behavioral patterns and principles rather than specific implementation details or file references to maintain broad applicability and relevance across the codebase.
- When developing plugins or extensions for IDEs, structure the codebase into modular components (e.g., actions, services, settings, and UI elements) to ensure clear separation of concerns and improve maintainability.
- When creating IDE plugins, include a dedicated settings interface to allow users to customize the tool's behavior, ensuring flexibility and a better user experience.
- When building IDE integrations for CLI tools, provide multiple action types (e.g., dry run, interactive, and standard release) to support diverse workflows directly within the IDE environment.
- When developing IDE plugins, separate process execution logic from UI triggering actions to maintain a clear distinction between user interface interactions and background operations, ensuring actions focus solely on UI updates or tool window visibility.
- When building IDE plugins, implement state management for processes (e.g., idle, running, success, failed) to provide clear feedback to users about the current status of operations, enhancing user experience through transparency.
- When creating IDE plugins, design output handling mechanisms (e.g., listeners for process output and completion events) to ensure real-time feedback and proper error reporting, improving usability and debugging capabilities.
- When updating the UI design in an IDE plugin or tool window, ensure a consistent color scheme by defining a cohesive set of colors for backgrounds, text, accents, and status indicators to improve visual clarity and user experience.
- When enhancing UI elements in a tool window or plugin, incorporate visual feedback mechanisms like progress bars to clearly indicate the status of ongoing operations to users.
- When redesigning UI components in an IDE plugin, prioritize readability by using distinct styling for primary elements (e.g., bold labels) and secondary elements (e.g., dimmed subtitles) to establish a clear visual hierarchy.
- When updating interactive elements in a UI for an IDE plugin, ensure that buttons or controls adapt dynamically to the context (e.g., showing or hiding based on relevance) and use distinct visual cues (e.g., color or style) to emphasize critical actions like cancellation.
- When updating UI color schemes in an IDE plugin or tool window, ensure the new color values are chosen to maintain visual clarity and consistency across both light and dark themes, using tools like JBColor to handle theme-specific color adjustments.
- When enhancing process visualization in a UI for an IDE plugin, define clear phases or steps with associated labels and keywords to guide users through the workflow, ensuring each phase is visually distinct and informative.
- When implementing state management for processes in an IDE plugin, include visual indicators for different states (e.g., pending, active, done, error) to provide immediate feedback on the progress and outcome of operations.
- When adjusting UI elements like progress bars in an IDE plugin, prioritize visibility by fine-tuning dimensions or styling to ensure they are easily noticeable without overwhelming the interface.
- When updating interactive UI components like buttons in an IDE plugin, use distinct button styles (e.g., primary and secondary) to create a clear visual hierarchy and guide user actions effectively.
- When refining user guidance in a UI for an IDE plugin, ensure status messages or prompts are concise and action-oriented to clearly communicate the next steps to the user.
- When designing or updating a tool window or UI panel in an IDE plugin, implement a tabbed interface to organize distinct functionalities (e.g., control, settings, rules) into separate, easily accessible sections for improved user navigation and clarity.
- When enhancing the UI layout in an IDE plugin, include a prominent header with the tool or feature name to provide clear context and branding within the interface.
- When updating the UI color scheme in an IDE plugin or tool window, ensure the new color values are chosen to maintain visual clarity and consistency across both light and dark themes, using tools like JBColor to handle theme-specific color adjustments.
- When implementing dynamic version resolution in a plugin or tool, prioritize reading version information from a primary source like package.json over static configuration values to ensure consistency across the project.
- When enhancing UI components in a tool window or plugin, introduce new visual states (like "Skipped") with distinct color coding to clearly communicate status changes to users.
- When redesigning process visualization in a UI, consider replacing static card-based layouts with dynamic timeline views to better represent sequential workflows and improve user comprehension.
- When updating documentation files for formatting or clarity, ensure that changes like adding new lines or spacing are applied consistently across similar sections to maintain a uniform appearance.
- When updating the behavior of a plugin or tool regarding automatic updates, ensure the default settings reflect the intended user experience, such as enabling or disabling update checks on run, to align with user expectations and workflow efficiency.
- When enhancing status messaging in a tool or plugin, include specific messages for all possible outcomes of a process phase (e.g., skipped, aborted, or completed) to provide clear and comprehensive feedback to users.
- When defining the sequence of phases or steps in a release workflow, prioritize learning or rule generation before committing and pushing to ensure that insights or updates are captured from the pre-release state rather than post-release.
- When simplifying a release process in a CLI tool, avoid additional post-learning steps like amending commits or force-pushing, focusing instead on a streamlined workflow that captures necessary data before finalizing the release.
<!-- TURL-RULES-END -->
