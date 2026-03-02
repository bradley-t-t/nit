package com.turl.release.toolwindow

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.components.JBTextArea
import com.intellij.util.ui.JBUI
import com.turl.release.services.TurlOutputListener
import com.turl.release.services.TurlProcessRunner
import java.awt.*
import javax.swing.*

class ControlPanelTab(private val project: Project) : JPanel(BorderLayout()), TurlOutputListener {

    private val runner = TurlProcessRunner(project)

    private val statusLabel = JLabel("Ready").apply {
        font = font.deriveFont(Font.BOLD, 15f)
        foreground = TEXT_PRIMARY
    }

    private val subtitleLabel = JLabel("Start a release or preview with dry run").apply {
        font = font.deriveFont(Font.PLAIN, 11f)
        foreground = TEXT_SECONDARY
    }

    private val progressBar = RoundedProgressBar()

    private val releaseBtn = PillButton("\u25B6  Release", ACCENT, Color.WHITE, true).apply {
        toolTipText = "Publish a new version \u2014 bumps version, generates changelog, commits, and pushes"
    }

    private val dryRunBtn = PillButton("\u25CB  Preview", CARD_BG, TEXT_PRIMARY, false).apply {
        toolTipText = "Simulate the release without making any changes \u2014 useful to verify before publishing"
    }

    private val cancelBtn = PillButton("\u2715  Cancel", PHASE_ERROR_BG, RED, false).apply {
        isVisible = false
    }

    private val phaseSteps = mutableMapOf<PhaseId, TimelineStep>()
    private val timelineContainer = JPanel().apply {
        layout = BoxLayout(this, BoxLayout.Y_AXIS)
        isOpaque = false
    }

    private var completedPhaseCount = 0
    private var releaseSkipped = false

    private val changelogLines = mutableListOf<String>()
    private var capturingChangelog = false
    private var changelogComplete = false

    private val changelogContent = JBTextArea().apply {
        font = Font("JetBrains Mono", Font.PLAIN, 11)
        lineWrap = true
        wrapStyleWord = true
        isEditable = false
        background = CHANGELOG_BG
        foreground = TEXT_PRIMARY
        border = JBUI.Borders.empty(10, 12, 10, 12)
    }

    private val changelogCard = ShadowCard().apply {
        layout = BorderLayout()
        border = JBUI.Borders.empty(14, 16, 14, 16)
        isVisible = false
        alignmentX = LEFT_ALIGNMENT
        add(JLabel("CHANGELOG").apply {
            font = font.deriveFont(Font.BOLD, 10f)
            foreground = TEXT_SECONDARY
            border = JBUI.Borders.emptyBottom(8)
        }, BorderLayout.NORTH)
        add(changelogContent, BorderLayout.CENTER)
    }

    private val scrollContent = JPanel().apply {
        layout = BoxLayout(this, BoxLayout.Y_AXIS)
        isOpaque = false
    }

    init {
        background = BG_PRIMARY
        border = JBUI.Borders.empty(14)
        runner.setOutputListener(this)
        buildLayout()
        attachListeners()
    }

    private fun buildLayout() {
        val statusCard = ShadowCard().apply {
            layout = GridBagLayout()
            border = JBUI.Borders.empty(16, 18, 16, 18)
            alignmentX = LEFT_ALIGNMENT
        }

        val gbc = GridBagConstraints().apply {
            anchor = GridBagConstraints.WEST
            fill = GridBagConstraints.HORIZONTAL
            gridx = 0
            weightx = 1.0
        }

        gbc.gridy = 0; gbc.insets = Insets(0, 0, 0, 0)
        statusCard.add(statusLabel, gbc)

        gbc.gridy = 1; gbc.insets = Insets(4, 0, 0, 0)
        statusCard.add(subtitleLabel, gbc)

        gbc.gridy = 2; gbc.insets = Insets(12, 0, 0, 0)
        statusCard.add(progressBar, gbc)

        val buttonRow = JPanel(FlowLayout(FlowLayout.LEFT, 8, 0)).apply {
            isOpaque = false
            alignmentX = LEFT_ALIGNMENT
            border = JBUI.Borders.empty(12, 0, 0, 0)
            add(releaseBtn)
            add(dryRunBtn)
            add(cancelBtn)
        }

        scrollContent.add(timelineContainer)
        scrollContent.add(Box.createVerticalStrut(12))
        scrollContent.add(changelogCard)

        val scroll = JBScrollPane(scrollContent).apply {
            border = JBUI.Borders.empty()
            isOpaque = false
            viewport.isOpaque = false
            horizontalScrollBarPolicy = ScrollPaneConstants.HORIZONTAL_SCROLLBAR_NEVER
        }

        val topSection = JPanel().apply {
            isOpaque = false
            layout = BoxLayout(this, BoxLayout.Y_AXIS)
            add(statusCard)
            add(buttonRow)
            add(Box.createVerticalStrut(14))
        }

        add(topSection, BorderLayout.NORTH)
        add(scroll, BorderLayout.CENTER)
    }

    private fun attachListeners() {
        releaseBtn.addActionListener { launchRelease("release") }
        dryRunBtn.addActionListener { launchRelease("dry-run", "--dry-run") }
        cancelBtn.addActionListener { runner.stop(); applyIdleState() }
    }

    private fun launchRelease(mode: String, vararg flags: String) {
        resetPipeline()

        RELEASE_PHASES.forEachIndexed { index, phase ->
            val step = TimelineStep(phase.label, index == RELEASE_PHASES.lastIndex)
            phaseSteps[phase.id] = step
            timelineContainer.add(step)
        }
        timelineContainer.revalidate()
        timelineContainer.repaint()

        val isDryRun = mode == "dry-run"
        statusLabel.text = if (isDryRun) "Preview" else "Releasing..."
        statusLabel.foreground = ACCENT
        subtitleLabel.text = if (isDryRun) "Simulating release (no changes)" else "Starting release pipeline"
        progressBar.setIndeterminate(true)
        progressBar.accentColor = ACCENT
        syncButtons(running = true)
        runner.execute(*flags)
    }

    private fun resetPipeline() {
        phaseSteps.clear()
        timelineContainer.removeAll()
        completedPhaseCount = 0
        releaseSkipped = false
        changelogLines.clear()
        capturingChangelog = false
        changelogComplete = false
        changelogCard.isVisible = false
    }

    private fun applyIdleState() {
        statusLabel.text = "Ready"
        statusLabel.foreground = TEXT_PRIMARY
        subtitleLabel.text = "Start a release or preview with dry run"
        progressBar.setIndeterminate(false)
        progressBar.progress = 0
        syncButtons(running = false)
    }

    private fun syncButtons(running: Boolean) {
        releaseBtn.isEnabled = !running
        dryRunBtn.isEnabled = !running
        cancelBtn.isVisible = running
    }

    private fun findPhaseForLine(line: String): PhaseInfo? =
        RELEASE_PHASES.find { phase -> phase.keywords.any { line.contains(it, ignoreCase = true) } }

    private fun isErrorLine(line: String): Boolean =
        line.contains("failed", ignoreCase = true) ||
        line.contains("error", ignoreCase = true) ||
        line.contains("Release aborted", ignoreCase = true)

    private fun isSkippedLine(line: String): Boolean =
        line.contains("No changes detected", ignoreCase = true) ||
        line.contains("Release skipped", ignoreCase = true)

    private fun updateProgress() {
        progressBar.setIndeterminate(false)
        val percent = ((completedPhaseCount.toFloat() / RELEASE_PHASES.size) * 100).toInt().coerceIn(0, 100)
        progressBar.progress = percent
    }

    private fun setPhaseState(phaseId: PhaseId, state: PhaseState) {
        phaseSteps[phaseId]?.setState(state)
        if (state == PhaseState.DONE) completedPhaseCount++
        updateProgress()
    }

    private fun activatePhaseSequentially(targetPhase: PhaseInfo) {
        val targetIndex = RELEASE_PHASES.indexOfFirst { it.id == targetPhase.id }
        if (targetIndex < 0) return

        RELEASE_PHASES.forEachIndexed { index, phase ->
            val step = phaseSteps[phase.id] ?: return@forEachIndexed
            val isCompletable = step.currentState != PhaseState.DONE &&
                                step.currentState != PhaseState.ERROR &&
                                step.currentState != PhaseState.SKIPPED

            when {
                index < targetIndex && isCompletable -> {
                    step.setState(PhaseState.DONE)
                    completedPhaseCount++
                }
                index == targetIndex && step.currentState != PhaseState.ACTIVE -> {
                    step.setState(PhaseState.ACTIVE)
                }
            }
        }
        updateProgress()
    }

    private fun showChangelogCard() {
        if (changelogLines.isEmpty()) return
        changelogContent.text = changelogLines.joinToString("\n")
        changelogCard.isVisible = true
        scrollContent.revalidate()
        scrollContent.repaint()
    }

    private fun handleSkippedLine(phase: PhaseInfo) {
        releaseSkipped = true
        val reachedIndex = RELEASE_PHASES.indexOfFirst { it.id == phase.id }

        RELEASE_PHASES.forEachIndexed { index, p ->
            val step = phaseSteps[p.id] ?: return@forEachIndexed
            when {
                index < reachedIndex && step.currentState != PhaseState.DONE -> {
                    step.setState(PhaseState.DONE)
                    completedPhaseCount++
                }
                else -> step.setState(PhaseState.SKIPPED)
            }
        }

        statusLabel.text = "Skipped"
        statusLabel.foreground = AMBER
        subtitleLabel.text = "No uncommitted changes found \u2014 nothing to release"
        progressBar.setIndeterminate(false)
        progressBar.progress = 100
        progressBar.accentColor = AMBER
    }

    private fun handleErrorLine(cleanLine: String, phase: PhaseInfo) {
        val targetIndex = RELEASE_PHASES.indexOfFirst { it.id == phase.id }

        RELEASE_PHASES.forEachIndexed { index, p ->
            val step = phaseSteps[p.id] ?: return@forEachIndexed
            if (index < targetIndex && step.currentState == PhaseState.ACTIVE) {
                step.setState(PhaseState.DONE)
                completedPhaseCount++
            }
        }

        setPhaseState(phase.id, PhaseState.ERROR)
        statusLabel.text = "Error"
        statusLabel.foreground = RED
        subtitleLabel.text = cleanLine
        progressBar.accentColor = RED
    }

    private fun handleActivePhase(phase: PhaseInfo) {
        activatePhaseSequentially(phase)
        statusLabel.text = "Running..."
        statusLabel.foreground = ACCENT
        subtitleLabel.text = phase.label
    }

    override fun onOutputLine(cleanLine: String) {
        ApplicationManager.getApplication().invokeLater {
            val trimmed = cleanLine.trim()

            if (capturingChangelog && !changelogComplete) {
                if (trimmed.startsWith("- ") || trimmed.startsWith("## [")) {
                    changelogLines.add(trimmed)
                    return@invokeLater
                } else if (trimmed.isNotEmpty()) {
                    capturingChangelog = false
                    changelogComplete = true
                }
            }

            if (!changelogComplete && trimmed.startsWith("## [")) {
                capturingChangelog = true
                changelogLines.add(trimmed)
                return@invokeLater
            }

            val phase = findPhaseForLine(cleanLine) ?: return@invokeLater

            when {
                isSkippedLine(cleanLine) -> handleSkippedLine(phase)
                isErrorLine(cleanLine) -> handleErrorLine(cleanLine, phase)
                else -> handleActivePhase(phase)
            }

            scrollToBottom()
        }
    }

    override fun onProcessFinished(exitCode: Int) {
        ApplicationManager.getApplication().invokeLater {
            progressBar.setIndeterminate(false)

            if (releaseSkipped) {
                syncButtons(running = false)
                return@invokeLater
            }

            if (exitCode == 0) {
                phaseSteps.values.forEach {
                    if (it.currentState != PhaseState.ERROR && it.currentState != PhaseState.SKIPPED) {
                        it.setState(PhaseState.DONE)
                    }
                }
                progressBar.progress = 100
                progressBar.accentColor = GREEN
                statusLabel.text = "Complete"
                statusLabel.foreground = GREEN
                subtitleLabel.text = "Release finished successfully"
                showChangelogCard()
            } else {
                phaseSteps.values
                    .filter { it.currentState == PhaseState.ACTIVE }
                    .forEach { it.setState(PhaseState.ERROR) }
                progressBar.accentColor = RED
                statusLabel.text = "Failed"
                statusLabel.foreground = RED
                val hasErrorSubtitle = subtitleLabel.text.contains("failed", ignoreCase = true) ||
                                       subtitleLabel.text.contains("error", ignoreCase = true)
                if (!hasErrorSubtitle) subtitleLabel.text = "Release encountered an error"
            }

            syncButtons(running = false)
        }
    }

    private fun scrollToBottom() {
        SwingUtilities.invokeLater {
            (SwingUtilities.getAncestorOfClass(JBScrollPane::class.java, scrollContent) as? JBScrollPane)
                ?.verticalScrollBar?.let { it.value = it.maximum }
        }
    }
}

