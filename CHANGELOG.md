# Changelog

All notable changes to this project will be documented in this file.

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
