import { isValidRule } from "./src/rules.js";

const currentRules = [
  "Place turl.json in a public/ directory rather than the project root for cleaner structure.",
  "When relocating files, update all code paths and git commands referencing those files to avoid commit failures.",
  "Use the established COLORS and SYMBOLS constants for all terminal UI elements to maintain visual consistency.",
  "Use npm view queries for version checking rather than custom registry calls for reliability.",
  "When updating the terminal UI, use the same box-drawing characters consistently.",
  "Sync version numbers across turl.json and package.json in the same commit to prevent version drift.",
  "When checking for rule violations in code, require HIGH confidence before flagging to minimize false positives.",
  "Structure violation feedback to show the full rule text and specific explanation.",
  "Prefix commit messages with the project or tool name for clear context in version release commits.",
  "Include the specific version number in commit messages for release updates.",
  "Maintain a consistent prefix format in commit messages for release commits.",
  "Increment version numbers sequentially in release commits to maintain a clear version progression.",
  "When adding new commands or features, update the help menu in the same commit.",
  "Include support for command-specific flags (like --quiet or -q) when introducing new commands.",
  "When adding new commands or features, update the help menu and changelog in the same commit.",
  "Store project rules in .github/copilot-instructions.md for better integration.",
  "Use defined section markers when managing rules in documentation files.",
  "Automatically create necessary directories (e.g., .github/) when writing configuration files.",
  "When parsing rules from documentation files, use robust regex patterns.",
  "Implement a dedicated validation function for rules to enforce content constraints.",
  "When implementing auto-update functionality, provide clear feedback messages.",
  "Auto-update turl-release at the start of every release before any other operations.",
  "When consolidating multiple commands into a single command, ensure all relevant functionality is integrated.",
  "When introducing a simplified workflow or major UI change, update all related documentation.",
  "When updating markdown files like copilot-instructions.md, ensure proper spacing.",
  "When restructuring a monolithic codebase into modular files, ensure all functionality is migrated.",
  "When introducing new API integrations, include comprehensive error handling.",
  "When simplifying the UI in a CLI tool, remove complex formatting functions.",
  "When managing subprocess execution in a Node.js CLI tool, set the default stdio behavior to pipe.",
  "When implementing version checking for updates in a CLI tool, dynamically fetch the installed version.",
  "When performing updates for a CLI tool, detect whether the installation is global or local by querying npm list commands.",
  "When implementing an update mechanism in a CLI tool, include functionality to automatically re-execute the tool after update.",
  "When managing UI header display logic in a CLI tool, avoid using global state flags.",
  "When defining project guidelines or rules for AI-assisted code generation, ensure they focus on generic behavioral patterns.",
  "When developing plugins or extensions for IDEs, structure the codebase into modular components.",
  "When creating IDE plugins, include a dedicated settings interface.",
  "When building IDE integrations for CLI tools, provide multiple action types.",
  "When developing IDE plugins, separate process execution logic from UI triggering actions.",
  "When building IDE plugins, implement state management for processes.",
  "When creating IDE plugins, design output handling mechanisms.",
  "When updating the UI design in an IDE plugin, ensure a consistent color scheme.",
  "When enhancing UI elements in a tool window or plugin, incorporate visual feedback mechanisms like progress bars.",
  "When redesigning UI components in an IDE plugin, prioritize readability.",
  "When updating interactive elements in a UI for an IDE plugin, ensure buttons adapt dynamically.",
  "When enhancing process visualization in a UI for an IDE plugin, define clear phases.",
  "When implementing state management for processes in an IDE plugin, include visual indicators.",
  "When designing or updating a tool window, implement a tabbed interface.",
  "When enhancing the UI layout in an IDE plugin, include a prominent header.",
  "When implementing dynamic version resolution in a plugin, prioritize reading from package.json.",
  "When enhancing UI components in a tool window, introduce new visual states like Skipped.",
  "When redesigning process visualization in a UI, consider replacing static layouts with dynamic timeline views.",
  "When updating documentation files for formatting, ensure changes are applied consistently.",
  "When updating the behavior of a plugin regarding automatic updates, ensure default settings reflect intended UX.",
  "When enhancing status messaging in a tool, include specific messages for all possible outcomes.",
  "When defining the sequence of phases in a release workflow, prioritize learning before committing.",
  "When simplifying a release process in a CLI tool, avoid additional post-learning steps.",
  "When managing sequential workflows in a UI, ensure state transitions are handled systematically.",
  "When implementing visual indicators for active processes, incorporate dynamic animations.",
  "When updating UI elements in a tool, enhance button labels with symbolic prefixes.",
  "When designing status indicators in a UI, replace static icons with dynamic animations.",
  "When updating UI messaging for user guidance, ensure consistency in terminology.",
  "When refining UI layouts, adjust spacing and insets between elements.",
  "When implementing spinner or loading animations, include a static visual placeholder.",
  "When simplifying UI components in a tool, remove unnecessary dynamic elements.",
  "When restructuring or modularizing UI components, organize related functionality into separate files.",
  "When enhancing process execution in a plugin, improve output handling mechanisms.",
  "When updating action classes or UI triggering logic, simplify interactions.",
];

let kept = 0,
  rejected = 0;
for (const rule of currentRules) {
  const valid = isValidRule(rule);
  if (!valid) {
    rejected++;
    console.log("REJECTED:", rule.substring(0, 90));
  } else {
    kept++;
    console.log("KEPT:    ", rule.substring(0, 90));
  }
}
console.log(
  "\nKept:",
  kept,
  "| Rejected:",
  rejected,
  "| Total:",
  currentRules.length,
);
