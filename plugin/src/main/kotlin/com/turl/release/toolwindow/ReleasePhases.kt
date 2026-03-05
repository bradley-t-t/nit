package com.turl.release.toolwindow

enum class PhaseId {
    UPDATE, PREFLIGHT, ENVIRONMENT, CODE_PREP, VERSIONING, CHANGELOG, BUILD, COMMIT
}

data class PhaseInfo(val id: PhaseId, val label: String, val keywords: List<String>)

enum class PhaseState { PENDING, ACTIVE, DONE, ERROR, SKIPPED }

val RELEASE_PHASES = listOf(
    PhaseInfo(PhaseId.UPDATE, "Checking for updates", listOf("Checking for updates", "Update available", "Auto-updating", "Updated to", "Update failed")),
    PhaseInfo(PhaseId.PREFLIGHT, "Pre-flight checks", listOf("Initializing", "Running pre-flight", "Pre-flight failed")),
    PhaseInfo(PhaseId.ENVIRONMENT, "Loading environment", listOf("Loading environment", "Reading project config", "Environment error", "Config error")),
    PhaseInfo(PhaseId.CODE_PREP, "Preparing code", listOf("Running code cleanup", "Running code formatter", "Checking for changes", "No changes detected", "Release aborted", "Release skipped")),
    PhaseInfo(PhaseId.VERSIONING, "Updating version", listOf("Preparing release", "Updating version files", "Version update failed", "DRY RUN MODE")),
    PhaseInfo(PhaseId.CHANGELOG, "Generating changelog", listOf("Generating changelog", "Updating CHANGELOG", "Changelog generation failed", "Changelog update failed")),
    PhaseInfo(PhaseId.BUILD, "Building project", listOf("Running production build", "Build failed")),
    PhaseInfo(PhaseId.COMMIT, "Committing and pushing", listOf("Staging all changes", "Committing and pushing", "Staging failed", "Commit message generation failed", "Commit failed", "Push failed"))
)

