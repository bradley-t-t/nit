package com.nit.release.toolwindow

/** Identifiers for each pipeline step. */
enum class StepId {
    UPDATE, PREFLIGHT, ENVIRONMENT, PREPARE, VERSION, CHANGELOG, BUILD, LEARN, COMMIT
}


/** Maps a pipeline step to the CLI output keywords that trigger it. */
data class StepDef(val id: StepId, val label: String, val triggers: List<String>)

val PIPELINE_STEPS = listOf(
    StepDef(StepId.UPDATE, "Update", listOf("Checking for updates", "Update available", "Auto-updating", "Updated to", "Update failed")),
    StepDef(StepId.PREFLIGHT, "Preflight", listOf("Initializing", "Running pre-flight", "Pre-flight failed")),
    StepDef(StepId.ENVIRONMENT, "Env", listOf("Loading environment", "Reading project config", "Environment error", "Config error")),
    StepDef(StepId.PREPARE, "Prepare", listOf("Running code cleanup", "Running code formatter", "Checking for changes", "No changes detected", "Checking project rules", "Release aborted", "Release skipped")),
    StepDef(StepId.VERSION, "Version", listOf("Preparing release", "Updating version files", "Version update failed", "DRY RUN MODE")),
    StepDef(StepId.CHANGELOG, "Changelog", listOf("Generating changelog", "Updating CHANGELOG", "Changelog generation failed", "Changelog update failed")),
    StepDef(StepId.BUILD, "Build", listOf("Running production build", "Build failed")),
    StepDef(StepId.LEARN, "Learn", listOf("Learning from this release")),
    StepDef(StepId.COMMIT, "Push", listOf("Staging all changes", "Committing and pushing", "Staging failed", "Commit message generation failed", "Commit failed", "Push failed")),
)

