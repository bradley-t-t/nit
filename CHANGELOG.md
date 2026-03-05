# Changelog

All notable changes to this project will be documented in this file.

## [8.3] - 2026-03-05

- No functional changes or features were introduced in this release; the update only reflects version increments across configuration files.

## [8.2] - 2026-03-05

- Rebranded the project from "turl-release" to "nit" throughout the codebase, including renaming configuration files, updating documentation, and revising project references in scripts and plugins.
- Updated README.md with a refreshed layout and content, focusing on the new "nit" branding, streamlined installation instructions, and a detailed breakdown of the release pipeline process.
- Enhanced the CLI tool with new options and improved functionality, including support for branch overrides, dry runs, interactive prompts, and update skipping as seen in updated CLI scripts.
- Improved the IntelliJ/WebStorm plugin by refining the user interface in NitPanel.kt, updating action classes for better integration, and adjusting settings and process handling for a smoother release workflow.
- Made minor adjustments to core scripts like api.js, git.js, and config.js to align with the rebranding and improve error handling and configuration management.

## [8.1] - 2026-03-05

- Removed the auto-managed project rules section from copilot-instructions.md, eliminating the TURL rules content that was previously embedded in the documentation.
- Deleted the \_test_rules.js file, which contained a comprehensive list of project rules and validation logic for testing rule compliance.
- Removed several source files including api.js, cli.js, git.js, and rules.js, effectively eliminating significant portions of the CLI tool's functionality and rule management logic.
- Simplified the index.js file by reducing its content, likely streamlining the main entry point of the application.
- Updated constants.js with minor changes to the defined constants.

## [8.1] - 2026-03-05

- Removed the auto-managed project rules section from copilot-instructions.md, eliminating the TURL rules content that was previously embedded in the documentation.
- Deleted the \_test_rules.js file, which contained a comprehensive list of project rules and validation logic for testing rule compliance.
- Removed several source files including api.js, cli.js, git.js, and rules.js, effectively eliminating significant portions of the CLI tool's functionality and rule management logic.
- Simplified the index.js file by reducing its content, likely streamlining the main entry point of the application.
- Updated constants.js with minor changes to the defined constants.

## [8.1] - 2026-03-05

- Removed the auto-managed project rules section from copilot-instructions.md, eliminating the TURL rules content that was previously embedded in the documentation.
- Deleted the \_test_rules.js file, which contained a comprehensive list of project rules and validation logic for testing rule compliance.
- Removed several source files including api.js, cli.js, git.js, and rules.js, effectively eliminating significant portions of the CLI tool's functionality and rule management logic.
- Simplified the index.js file by reducing its content, likely streamlining the main entry point of the application.
- Updated constants.js with minor changes to the defined constants.
- Removed TurlOpenSettingsAction.kt and TurlSettingsConfigurable.kt from the plugin, eliminating specific actions and settings interfaces in the IDE integration.
- Modified ReleasePhases.kt and TurlToolWindowFactory.kt in the plugin, adjusting the release workflow phases and tool window implementation.
- Removed RulesTab.kt and SettingsTab.kt from the plugin, deleting the tabbed interfaces for rules and settings in the IDE tool window.
- Updated plugin.xml to reflect changes in the plugin's configuration or metadata.

## [7.3] - 2026-03-02

- Added a new test file `_test_rules.js` to validate rules using the `isValidRule` function from `rules.js`, ensuring robust rule content constraints with an extensive list of test cases.
- Updated `src/rules.js` to include new functionality or modifications for rule validation and management, enhancing how rules are processed.
- Enhanced `src/api.js` with updates to API integrations, likely improving error handling or adding new endpoints for better interaction with external systems.
- Removed several outdated or redundant guidelines from `.github/copilot-instructions.md`, streamlining the documented rules for clarity and relevance.

## [7.2] - 2026-03-02

- Updated project rules in copilot-instructions.md to streamline guidelines, removing redundant or overly specific instructions and consolidating related rules for clarity.
- Revised commit message formatting rules to include both the project/tool name and specific version number for release updates, ensuring clear context and accurate version history tracking.
- Added a rule to auto-update turl-release at the start of every release to ensure the latest features are utilized before other operations.
- Enhanced rule parsing and file management by combining robust regex patterns for handling various bullet formats with automatic directory creation (e.g., .github/) when writing configuration files.

## [7.1] - 2026-03-02

- Added a new line in the Copilot instructions file to improve formatting or clarity in the project rules section.

## [7.0] - 2026-03-02

- Added a new feature to consolidate project rules using AI assistance. The `consolidateRules` function merges overlapping rules, removes redundancies, and organizes guidelines by topic to create a more concise and actionable set of rules.
- Updated the rules cleanup process in the main workflow to integrate the new consolidation feature. The `cleanupRulesFile` function is now called with an API key at key points during execution to ensure rules are consolidated effectively.

## [6.9] - 2026-03-02

- Revamped the TURL Release tool window by restructuring and adding new components, including dedicated tabs for Control Panel, Rules, and Settings for a more organized user interface.
- Introduced new UI elements with custom colors and reusable components in the tool window to enhance visual consistency and user experience.
- Enhanced the TurlProcessRunner to improve process execution and output handling, including better ANSI color code processing for terminal output.
- Updated BaseTurlAction to simplify the tool window activation logic for a smoother interaction.
- Removed obsolete flags and update logic from various action classes like TurlDryRunAction, TurlInteractiveAction, TurlReleaseAction, and TurlOpenSettingsAction to streamline their functionality.
- Improved the settings configuration UI in TurlSettingsConfigurable for better usability and clarity.

## [6.8] - 2026-03-02

- Removed the status spinner icon from the Control Panel Tab in the Turl Tool Window, simplifying the UI by eliminating the animated spinner and associated state changes for running, idle, and completion states.
- Updated the layout of the status card in the Control Panel Tab to adjust for the removal of the spinner, ensuring proper alignment of the status label and subtitle label.

## [6.7] - 2026-03-02

- Added a static circular outline to the SpinnerIcon component in the TurlToolWindowFactory when the spinner is not animating, providing a visual placeholder with a consistent style.
- Updated the Copilot instructions file with a minor formatting change to improve readability by adding an extra blank line before the project rules section.

## [6.6] - 2026-03-02

- Enhanced the UI of the Control Panel Tab in the TURL Release Tool with updated button labels for better clarity: "Release" now displays as "▶ Release", "Dry Run" as "○ Preview", and "Cancel" as "✕ Cancel".
- Added descriptive tooltips to the Release and Preview buttons to explain their functionality—Release for publishing a new version with version bump, changelog generation, commit, and push; Preview for simulating a release without changes.
- Replaced the static status icon with a dynamic SpinnerIcon in the Control Panel Tab to visually indicate running states and outcomes with appropriate icons for warnings and errors.
- Updated status text and messaging for better user guidance: changed "Dry Run" to "Preview" in status labels, and updated idle state messages to "Start a release or preview with dry run".
- Adjusted the layout spacing in the Control Panel Tab UI by increasing the inset between the status spinner and label for improved visual alignment.

## [6.5] - 2026-03-02

- Added a spinning animation to the active state of timeline steps in the TURL Tool Window, providing a dynamic visual indicator for ongoing processes.
- Enhanced the progress bar with an indeterminate animation, showing a moving segment when the progress state is indeterminate, improving the user experience during undefined progress states.

## [6.4] - 2026-03-02

- Added a new line in the Copilot instructions file to improve formatting or clarity in the project rules section.

## [6.3] - 2026-03-02

- Enhanced the release progress tracking in the TURL Tool Window by introducing a new method `activatePhaseSequentially` to better manage phase transitions and ensure accurate state updates for each phase.
- Improved the handling of phase completion and error states in the tool window, ensuring that completed phases are properly marked as done and incrementing the completion count for better progress visualization.
- Refined the logic for skipping phases during the release process, updating the state management to reflect skipped phases more accurately in the UI.

## [6.2] - 2026-03-02

- Reordered the release phases in the IntelliJ plugin to prioritize learning rules before committing and pushing, ensuring that the learning step is visually reflected earlier in the process.
- Updated the CLI tool to perform the "Learning from this release" step before staging and committing changes, capturing pre-release diffs and stats for rule generation instead of post-release.
- Removed the additional git commands for amending and force-pushing after learning new rules in the CLI tool, simplifying the release process.

## [6.1] - 2026-03-02

- Added a new line in the copilot-instructions.md file to improve formatting or readability in the project rules section.

## [6.0] - 2026-03-02

- Changed the default behavior of the TURL plugin to no longer skip updates on run by setting `skipUpdateOnRun` to `false` in `TurlSettings.kt`.
- Enhanced the release process in `TurlToolWindowFactory.kt` by adding a new status message "Release skipped" to the `CODE_PREP` phase, allowing better visibility of skipped releases.
- Improved changelog capture logic in `TurlToolWindowFactory.kt` to handle both changelog entries and section headers, ensuring complete changelog data is captured before marking it as complete.

## [5.9] - 2026-03-02

- Added a new line in the GitHub Copilot instructions file to improve formatting or clarity in the project rules section.

## [5.8] - 2026-03-02

- Added dynamic version resolution for the plugin by reading the version from package.json if available, otherwise falling back to the Gradle property.
- Enhanced the TURL Release Tool UI with a new "Skipped" state for release phases, visually represented with a distinct amber color and background.
- Introduced a timeline view in the control panel, replacing the previous phase cards with timeline steps for better visualization of the release process.
- Added a changelog display feature in the UI, capturing and showing changelog content in a dedicated card with a custom background and text area.
- Implemented new UI elements like timeline lines and changelog background colors to improve the visual hierarchy and user experience in the tool window.

## [5.7] - 2026-03-02

- Added a blank line in the Copilot instructions markdown file to improve readability of the project rules section.

## [5.6] - 2026-03-02

- Updated the UI color scheme in the TURL plugin with a refreshed set of colors for better visual distinction, including new shades for primary background, text, accents, and status indicators.
- Enhanced the UI layout by removing the header section from the main panel and adjusting tab spacing and borders for a cleaner look.
- Refined the control panel tab with updated fonts and text colors for improved readability, and replaced the standard progress bar with a custom rounded progress bar.
- Redesigned buttons in the control panel to use a pill-shaped style for a more modern appearance.
- Adjusted tab names in the main interface for brevity, renaming "Control Panel" to "Control".

## [5.5] - 2026-03-02

- Revamped the TURL Tool Window UI with a new tabbed interface, introducing separate tabs for "Control Panel", "Rules", and "Settings" for better organization and access to different functionalities.
- Updated the layout of the main panel with a header displaying "TURL Release" and improved styling for background and borders.
- Enhanced the control panel tab with updated status and subtitle labels, adjusting font styles and colors for better readability.
- Adjusted the progress bar in the control panel to have a slightly taller height and consistent styling with the new UI theme.

## [5.4] - 2026-03-02

- Updated the UI color scheme in the Turl Tool Window with new color values for background, text, accents, and various states to improve visual clarity and consistency across light and dark themes.
- Introduced a new phase tracking system in the Turl Tool Window with defined release phases like Update, Preflight, Environment, and others, each with specific labels and associated keywords for better process visualization.
- Added dynamic phase state management with visual indicators for Pending, Active, Done, and Error states in the Turl Tool Window to provide clearer feedback during the release process.
- Enhanced the progress bar in the Turl Tool Window by adjusting its height from 3 to 4 pixels for better visibility.
- Revamped the button styles in the Turl Tool Window by replacing ActionButton with PrimaryButton for "Release" and SecondaryButton for "Dry Run" to improve the user interface.
- Updated status messaging in the Turl Tool Window, changing the subtitle text from "Select a release mode to begin" to "Press Release or Dry Run to begin" for clearer user guidance.

## [5.3] - 2026-03-02

- Updated the UI color scheme in the Turl Tool Window with a refreshed set of colors for background, text, accents, and status indicators to improve visual clarity and consistency.
- Redesigned the status display with a bold status label and a dimmed subtitle for better readability and hierarchy.
- Added a progress bar to visually indicate the progress of operations in the tool window.
- Replaced the interactive button with a settings button to access configuration options directly from the UI.
- Updated button styles and visibility, including a new "Cancel" button that appears only when relevant, with distinct coloring for emphasis.
- Refined the layout and styling of step containers for a cleaner presentation of release steps.

## [5.2] - 2026-03-02

- Added a blank line in the Copilot instructions file to improve readability of the project rules section.

## [5.1] - 2026-03-02

- Simplified the BaseTurlAction class by removing console view extraction logic and process execution from the action trigger, focusing solely on showing the TURL Release tool window.
- Enhanced the TurlProcessRunner class with a new RunState enum to track the state of the process (IDLE, RUNNING, SUCCESS, FAILED) and introduced a TurlOutputListener interface for handling output lines and process completion events.
- Significantly updated the TurlToolWindowFactory to improve the user interface and functionality of the TURL Release tool window, incorporating better process state management and output handling.

## [5.0] - 2026-03-02

- Introduced a new IntelliJ plugin for TURL Release, enabling seamless integration with the IDE for release management tasks.
- Added core plugin functionality with actions like BaseTurlAction, TurlDryRunAction, TurlInteractiveAction, TurlOpenSettingsAction, and TurlReleaseAction to support various release workflows directly from the IDE.
- Implemented TurlProcessRunner service to handle process execution and management within the plugin.
- Created TurlSettings and TurlSettingsConfigurable for customizable plugin settings, allowing users to tailor the tool to their needs.
- Developed TurlToolWindowFactory to provide a dedicated tool window in IntelliJ for interacting with TURL Release features.
- Configured the plugin build system using Gradle with Kotlin support, setting up the necessary build scripts and properties for development and deployment.

## [4.9] - 2026-02-27

- Enhanced the API module with improved rule identification logic to ensure rules are generic behavioral guidelines rather than tied to specific files or implementation details.
- Updated the rules module to include validation checks for detecting and filtering out file-specific patterns in rules, ensuring they remain broadly applicable.
- Refined project guidelines in the Copilot instructions to emphasize creating generic, pattern-based rules for better AI code generation support.

## [4.8] - 2026-02-27

- Improved build error handling by capturing and storing both stdout and stderr output from the build command for better debugging.
- Enhanced error reporting in the UI by adding a new `printHeaderWithError` method to display detailed error messages with formatted output in red.
- Updated the main release process to display detailed build error output when a build fails, using the new UI method.
- Added detailed error output display in the release failure handler if error details are available, improving user feedback on failures.

## [4.7] - 2026-02-27

- Added an extra newline before the status message in the UI output to improve readability.
- Updated the Copilot instructions file with a new empty line for better formatting in the project rules section.

## [4.6] - 2026-02-27

- Updated the UI header in src/ui.js to improve the layout by adding a separator line and aligning the title and version information with the ASCII art for a cleaner and more professional look.
- Added a small spacing adjustment in the Copilot instructions file with an extra newline for better readability.

## [4.5] - 2026-02-27

- Simplified the UI header logic by removing the `headerPrinted` flag and consolidating the `printHeader` method into `printHeaderWithStatus` for more direct control over when the header is displayed.
- Added a small formatting update to the Copilot instructions file with an extra blank line for better readability in the project rules section.

## [4.4] - 2026-02-27

- Improved version detection by dynamically fetching the installed version from package.json instead of relying on a static constant, ensuring accurate version comparison during update checks.
- Enhanced update mechanism to detect whether turl-release is installed globally or locally, and apply the appropriate npm install command accordingly.
- Added automatic re-execution of the tool after a successful update, restarting the process with the updated version without manual intervention.
- Removed unnecessary delays in the update process flow for a smoother user experience.

## [4.3] - 2026-02-27

- Simplified the UI module by removing complex formatting functions like box, spinner, and various text styling methods, focusing on a cleaner header display.
- Updated the header printing logic in ui.js to prevent redundant header output by tracking if it has already been printed.
- Moved status message display outside the header function in ui.js, allowing for more flexible UI updates.
- Removed a large set of unused symbols and color codes from constants.js to streamline the codebase.
- Simplified error code definitions in constants.js by removing unused error types.
- Adjusted the help text output in cli.js to directly use colored text instead of relying on the ui module's header.
- Changed the default stdio behavior in git.js for execCommand to use 'pipe' unless explicitly set to silent=false.
- Modified the build command execution in git.js to use 'pipe' instead of 'inherit' for stdio in the spawn process.

## [4.2] - 2026-02-27

- Simplified the interactive menu in the CLI by removing decorative formatting and color prompts, making the interface cleaner and more straightforward with prompts like "Branch (default):" and "Run build? (Y/n):".
- Overhauled the rule violation prompt display by replacing the detailed boxed output with a simple message indicating the number of violations and a basic yes/no question to continue, significantly reducing visual clutter.
- Removed spinner animation during the update process in the CLI to streamline the update experience.

## [4.1] - 2026-02-27

- Adjusted the padding width in the CLI output display for Project, Version, and Branch fields in the main function of src/index.js to improve alignment and readability by changing the padding calculation from BOX_WIDTH - 15 to BOX_WIDTH - 14.
- Added an empty line in the copilot-instructions.md file under the TURL-RULES-START section for better formatting.

## [4.0] - 2023-10-05

- Introduced a complete codebase restructure by splitting the monolithic index.js into modular files including api.js, cli.js, config.js, constants.js, env.js, errors.js, file-utils.js, git.js, rules.js, and ui.js for better maintainability and clarity.
- Added a new AI-powered feature for generating changelog entries and commit messages using the Grok API, with detailed error handling for network issues and response validation.
- Implemented a comprehensive API module in api.js to handle communication with the Grok API, including functions for generating changelogs, commit messages, and checking rule violations.
- Enhanced the cleanup process in cleanup.js to streamline operations, reducing complexity from the previous version.
- Introduced a dedicated CLI module in cli.js to manage command-line interactions, improving user interface and command handling.
- Added configuration management in config.js to handle settings and preferences for the release tool.
- Created a constants.js file to centralize error codes and other static values used across the tool.
- Implemented environment variable handling in env.js to support configuration through environment settings.
- Developed a custom error handling system in errors.js to provide detailed and specific error messages for various failure scenarios.
- Added utility functions for file operations in file-utils.js to support the tool's functionality.
- Introduced git.js for managing Git operations programmatically, enabling automated version control tasks.
- Created a rules.js module to enforce project guidelines by checking for violations in code changes.
- Added a ui.js module to handle user interface elements and improve interaction with the tool.

## [3.9] - 2026-02-25

- No functional changes or updates to the codebase are visible in this release as the diff only reflects a version number adjustment.

## [4.2] - 2026-02-25

- Added a new guideline in copilot-instructions.md to ensure proper spacing and formatting, such as adding blank lines for readability, when updating markdown files like project rules for clear visual separation of content.

## [4.1] - 2026-02-25

- Added a blank line in the Copilot instructions markdown file for better formatting and readability in the project rules section.

## [4.0] - 2026-02-25

- Added new project rules in the Copilot instructions to ensure that when consolidating multiple commands into a single command, all functionality from the removed commands is either integrated or explicitly documented as removed to prevent feature loss.
- Introduced a rule in the Copilot instructions to mandate updating all related documentation, such as help menus and usage instructions, in the same commit when implementing a simplified workflow or major UI change to avoid user confusion.

## [3.9] - 2026-02-25

- Simplified the tool to a single command, `turl-release`, which now handles the entire release process automatically without the need for subcommands.
- Removed all previous subcommands such as `init`, `analyze`, `sync`, `rules`, `learn`, `forget`, and `cleanup` from the codebase, consolidating their functionality into the main command.
- Updated the help menu to reflect the new streamlined workflow, listing all automated steps like code cleanup, formatting with Prettier, version incrementing, changelog generation, and rule syncing.
- Added a new `--quiet` or `-q` option to minimize output during execution.
- Revised the usage instructions to focus on options rather than commands, providing clear examples for running a release, previewing changes, or specifying a branch.

## [3.8] - 2026-02-25

- Simplified to a single command: just run `turl-release` and everything happens automatically.
- Removed all subcommands (init, analyze, sync, rules, learn, forget, cleanup) - everything is now built into the release process.
- Git hooks are automatically installed on first release.
- Rules are automatically cleaned up and formatted each release.
- No setup required - just run the command.

## [3.7] - 2026-02-25

- Added a new `cleanup` command (also accessible as `fix-rules`) to reformat and fix rules in copilot-instructions.md, ensuring consistent formatting and removing issues like duplicate dashes.
- Enhanced rule parsing and formatting logic with improved regex patterns to handle various bullet styles and whitespace more effectively.
- Updated the help menu to clarify the system's operation by comparing it to "Claude's lessons.md" as a single source of truth for better user understanding.
- Implemented an automatic update check and auto-update mechanism at the start of every release process to ensure the tool uses the latest features before proceeding with any operations.

## [3.7] - 2026-02-25

- Implemented automatic update check and auto-update at the very start of every release, before any other operations, ensuring users always have the latest features.
- Added `cleanup` command to fix and reformat all rules in copilot-instructions.md, removing duplicate dashes and ensuring proper formatting.
- Fixed rule parsing to properly strip multiple leading dashes (e.g., "- - - Rule" becomes "Rule") that accumulated from previous formatting issues.
- Improved rule formatting with better regex patterns to handle all bullet variations and whitespace.
- Updated help menu to better describe the system as working "like Claude's lessons.md" with a single source of truth.
- Synced version numbers across package.json (3.7.0), turl.json (3.7), and PACKAGE_VERSION constant.

## [3.6] - 2026-02-25

- Improved the update process by removing the interactive prompt for updates. Now, when an update is available, the tool automatically attempts to update itself without user intervention.
- Added informative messages during the update process, showing the current and latest version numbers, and notifying the user that an auto-update is in progress.
- Updated the messaging for update failures to clearly indicate that the update failed and the tool is continuing with the current version.
- Enhanced user feedback by displaying a restart message after a successful update, instructing the user to restart the tool to use the new version.

## [3.5] - 2026-02-25

- Improved the rule parsing logic in `readTurlRules()` to handle various bullet formats by replacing multiple bullet variations with a more robust regex pattern.
- Added filtering in `readTurlRules()` to exclude rules starting with HTML comment markers like `<!--`, ensuring only valid rules are processed.
- Introduced a new `isValidRule()` function to validate rules by checking for content, length constraints, and excluding specific markers like HTML comments or TURL-specific tags.
- Enhanced rule formatting and filtering in `writeTurlRules()` to ensure only valid and properly formatted rules are written to the documentation file.
- Updated project rules documentation in `.github/copilot-instructions.md` to consolidate and clarify guidelines for better integration with GitHub Copilot.

## [3.4] - 2026-02-25

- Moved project rules from `public/turl.txt` to `.github/copilot-instructions.md` for better organization and integration with GitHub Copilot.
- Updated the rules management system to read from and write to the new `copilot-instructions.md` file using defined section markers for TURL rules.
- Added functionality to format and deduplicate rules when writing to `copilot-instructions.md`, ensuring cleaner and more consistent rule presentation.
- Created the `.github` directory automatically if it doesn't exist to support the new rules file location.

## [3.3] - 2026-02-25

- Added new command-line interface commands to enhance functionality: `init` for setting up automatic learning with git hooks and Copilot sync, `sync` for updating rules to `.github/copilot-instructions.md`, `analyze` for learning from git history, `rules` (or `list-rules`) for listing project rules, `learn` (or `add-rule`) for manually adding rules, and `forget` (or `remove-rule`) for removing rules by number.
- Introduced a new internal command `_post-commit` for handling post-commit operations.
- Updated the help menu to reflect new commands and provide a clearer structure, including a "Quick Start" guide and details on automatic learning via git hooks, Copilot sync, history analysis, and release checks.
- Added support for command-specific arguments, allowing finer control over command behavior through `commandArgs`.
- Implemented functionality to remove rules from `turl.txt` with the `removeTurlRule` function, returning success or error based on rule existence.
- Added an interactive prompt for the `learn` command to capture user input for new rules when no rule is provided via arguments.
- Added a `--quiet` or `-q` flag to suppress output during operations for a less verbose experience.
- Updated commit message guidelines in `turl.txt` to include prefixes like "TURL Release Tool:" for clarity, specify version numbers in release commits, maintain consistent prefix formatting, and ensure sequential version increments.

## [3.2] - 2026-02-25

- Updated the purpose of rules in turl.txt to focus on helping GitHub Copilot generate consistent code, replacing the previous emphasis on learning from past commits and mistakes.
- Revised the editing guidance in turl.txt to clarify that manual edits are preserved but may be reformatted on the next release, replacing the previous warning against manual edits.
- Refined the project rules in turl.txt to be more concise and actionable, focusing on specific guidelines like file structure, consistent UI elements, and version synchronization.
- Improved the rule violation detection logic in src/index.js with a structured, step-by-step analysis framework to ensure violations are only flagged when changes clearly contradict guidelines.
- Enhanced the violation check prompt in src/index.js to emphasize conservative flagging, requiring 100% certainty before identifying a violation, and added detailed context to reduce false positives.

## [3.1] - 2026-02-24

- Improved the rule violation detection prompt in the code review process to be more precise and conservative. The updated prompt now emphasizes that violations must be clear and definitive, provides specific examples of what constitutes a violation versus what does not, and instructs the reviewer to err on the side of no violations when in doubt.
- Enhanced the handling of violation responses by parsing and structuring them with detailed information, including rule numbers and explanations, for better clarity and tracking.
- Revamped the user prompt display for rule violations with a new text wrapping function to ensure content fits within the display box, and improved formatting for better readability with structured headers and rule details.

## [3.0] - 2026-02-24

- Revamped the UI design in the command-line interface with updated color schemes for better visual distinction, replacing old colors like cyan and green with brighter variants such as brightBlue and brightRed.
- Redesigned the header display to feature a more modern and colorful ASCII art representation of the tool name, along with a clearer version and description layout.
- Updated progress bar and step indicators to use brighter colors and improved formatting for enhanced readability and user feedback during operations.
- Adjusted the box drawing style in the UI to use brightBlue for borders, improving the visual appeal of boxed text elements.
- Modified status icons for steps and sub-steps to reflect the new color scheme, ensuring consistency across the interface with distinct colors for running, success, error, and warning states.
- Simplified formatting in the public/turl.txt file by removing redundant dashes from the rules text for cleaner presentation.

## [2.9] - 2026-02-24

- Added a comprehensive UI toolkit with color-coded output, symbols, and formatting utilities for a more visually appealing and interactive command-line experience.
- Introduced new UI components including progress bars, spinners, step indicators, and formatted headers to improve user feedback during operations.
- Implemented a version update checker to detect if a newer version of the tool is available on npm, with a prompt to update if applicable.
- Added interactive user prompts for update confirmation using the readline module for better user control over tool updates.

## [2.8] - 2026-02-24

- Updated the file path for turl.txt to be located in the "public" directory instead of the project root.
- Adjusted the git command to stage the updated path "public/turl.txt" during the commit amendment process.

## [2.7] - 2026-02-24

- Introduced a new feature for managing project-specific rules with a turl.txt file, which logs rules and lessons learned from past commits to prevent future mistakes.
- Added functionality to automatically check code changes against the rules in turl.txt before committing, warning users if any violations are detected.
- Implemented rule learning by analyzing code changes to generate new rules based on patterns, bug fixes, or potential pitfalls, ensuring they don't duplicate existing rules.
- Enhanced the release process to include rule violation checks using an API call to analyze diffs against project rules, with detailed feedback on violations.
- Added user prompting for rule violations, allowing developers to decide whether to proceed with a release despite detected issues.
- Updated the progress tracking in the main function to reflect additional steps (from 12 to 14) related to rule management and violation checks.

## [2.6] - 2026-02-03

- Updated README.md with a restructured layout, renaming "Setup" to "Quick Start" for clearer onboarding.
- Enhanced documentation in README.md with more detailed tables for configuration fields and workflow steps.
- Added explicit instructions in README.md for overriding the branch with command-line options.
- Improved error handling descriptions in README.md, including additional error categories like server errors for API issues.
- Clarified project structure requirements in README.md, specifying the minimum needed files and their purpose.
- Updated commit message and changelog format examples in README.md to reflect AI-generated content based on actual code changes.
- Added emphasis in README.md on strict mode behavior, ensuring releases fail if API key issues or changelog generation fails, preventing generic commits.

## [2.5] - 2026-02-02

- Updated README.md with a new structure including a Table of Contents for better navigation.
- Added detailed sections in README.md for Installation, Setup, Usage, Configuration, What It Does, Error Handling, and Supported Projects.
- Enhanced documentation in README.md with clearer instructions for setting up `.env` file and `turl.json` configuration.
- Updated the commit message format example in README.md to include more detailed changelog entries.
- Added a new "Version Rollback" feature description in README.md for handling failures after version updates.
- Included a "Debug Mode" section in README.md with instructions for running the tool in debug mode.
- Revised error handling documentation in README.md to categorize and list specific errors handled by the tool.
- Updated supported environment variable names in README.md to include `REACT_APP_GROK_API_KEY` as a fallback for API key.
- Added a pre-flight checks step in the "What It Does" section of README.md to ensure git, remote, and node_modules are ready before release.

## [2.4] - 2026-02-02

- Added LICENSE.md file with the full MIT License text
- Updated license information in README.md to reference MIT License and link to LICENSE.md
- Changed license field in package.json from ISC to MIT
- Updated author field in package.json to "Trent"

## [2.3] - 2026-02-02

- Updated README.md with a new tagline and reorganized content for clarity
- Simplified installation instructions in README.md to focus on dev dependency installation
- Added Quick Start section in README.md with streamlined setup steps
- Refined Configuration section in README.md to separate API key and project config details with improved formatting
- Updated Usage section in README.md to include basic release commands and branch override examples
- Reformatted "What It Does" section in README.md into a concise table format
- Added Project Structure section in README.md to outline required project files
- Enhanced Error Handling section in README.md with a categorized table of errors
- Added Supported Projects section in README.md listing compatible project types
- Updated public/turl.json to change default projectName from "my-project" to "my-app"

## [2.2] - 2026-02-02

- Updated configuration management by replacing `public/version.json` with `public/turl.json` to store version, project name, and branch information
- Enhanced README.md with detailed sections on API key setup, project configuration via `turl.json`, command line options, error handling, and debug mode
- Added comprehensive error handling in `src/cleanup.js` with custom `CleanupError` class and detailed error codes for project root validation and file operations
- Improved release process in `src/index.js` to use configuration from `public/turl.json` and support branch overrides via CLI
- Updated commit message generation to include project name from `public/turl.json` (e.g., "my-project: Release v1.3")
- Expanded error handling documentation in README.md to cover pre-flight checks, API errors, file system errors, Git errors, and build/format errors

## [2.1] - 2026-02-02

- Updated environment variable parsing in `loadEnvFromPath` function in `src/index.js` to handle quoted values by removing surrounding quotes.
- Improved key-value splitting logic in `loadEnvFromPath` by using `indexOf` for finding the equals sign instead of splitting, ensuring more accurate parsing.

## [2.0] - 2026-02-02

- Removed usage of `fileURLToPath` and related constants (`__filename`, `__dirname`, `PACKAGE_ROOT`) in `src/index.js`.
- Simplified environment variable loading logic in `loadEnv()` function by removing package-level `.env` loading and self-project checks in `src/index.js`.
- Updated API key check in `loadEnv()` to support both `GROK_API_KEY` and `REACT_APP_GROK_API_KEY` in `src/index.js`.
- Changed `loadEnv()` to no longer return a source value and removed associated source messaging logic in `main()` function in `src/index.js`.
- Updated API key loading success message to always display "from project .env" in `main()` function in `src/index.js`.

## [1.9] - 2026-02-02

- Updated API key configuration in README.md to require each project to provide its own API key in a `.env` file
- Added instructions in README.md for obtaining API key from https://console.x.ai and adding `.env` to `.gitignore`
- Specified in README.md that the tool uses the `grok-3-latest` model for changelog and commit message generation
- Enhanced README.md with detailed error handling information for release failures due to missing API key or failed Grok API calls
- Added self-release instructions in README.md for running the release from the turl-release directory
- Updated release process in README.md to include staging all changes with `git add -A` and failing on Grok API call errors
- Modified `src/index.js` to prioritize loading `.env` from the project root over the package directory
- Updated error message in `src/index.js` to guide users to add `GROK_API_KEY` to their project's `.env` file and provided the API key source URL
- Removed `.env` from the `files` array in `package.json` to exclude it from the published package
- Updated version in `public/version.json` from 1.7 to 1.8 as part of the release process preparation

## [1.7] - 2026-02-02

- Updated version in public/version.json from 1.3 to 1.6
- Enhanced error handling in src/index.js for changelog and commit message generation by throwing errors instead of using fallback text when no diff is available or API response is invalid
- Removed fallback text for changelog and commit message generation in src/index.js when API key is missing or API fails
- Updated main function in src/index.js to exit with an error message if GROK_API_KEY is not found
- Improved logging messages in src/index.js for API key loading and error scenarios

## [1.3] - 2026-02-02

- Version bump

## [1.2] - 2026-02-02

- Version bump

## [1.1] - 2026-02-02

- Version bump
