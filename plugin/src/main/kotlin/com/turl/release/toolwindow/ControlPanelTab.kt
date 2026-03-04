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

/** Single-panel wide layout designed for bottom tool window placement. */
class ControlPanelTab(private val project: Project) : JPanel(BorderLayout()), TurlOutputListener {

    private val runner = TurlProcessRunner(project)

    private val statusLabel = JLabel("Ready").apply {
        font = font.deriveFont(Font.BOLD, 14f)
        foreground = TEXT_PRIMARY
    }

    private val subtitleLabel = JLabel("Start a release or preview changes").apply {
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

    private val phaseChips = mutableMapOf<PhaseId, HorizontalPhaseChip>()
    private val pipelineRow = JPanel(FlowLayout(FlowLayout.LEFT, 4, 0)).apply {
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
        border = JBUI.Borders.empty(8)
    }

    private val changelogPanel = JPanel(BorderLayout()).apply {
        isOpaque = false
        isVisible = false

        val header = JLabel("CHANGELOG").apply {
            font = font.deriveFont(Font.BOLD, 10f)
            foreground = TEXT_SECONDARY
            border = JBUI.Borders.empty(0, 0, 4, 0)
        }

        val scroll = JBScrollPane(changelogContent).apply {
            border = BorderFactory.createLineBorder(BORDER_SUBTLE, 1, true)
            isOpaque = false
            viewport.isOpaque = false
        }

        add(header, BorderLayout.NORTH)
        add(scroll, BorderLayout.CENTER)
    }

    init {
        background = BG_PRIMARY
        border = JBUI.Borders.empty(8, 12)
        runner.setOutputListener(this)
        buildLayout()
        attachListeners()
    }

    private fun buildLayout() {
        // Left section: status + buttons (fixed width)
        val leftPanel = JPanel().apply {
            isOpaque = false
            layout = BoxLayout(this, BoxLayout.Y_AXIS)
            border = JBUI.Borders.emptyRight(16)
            preferredSize = Dimension(200, 0)
            minimumSize = Dimension(180, 0)

            val statusRow = JPanel(BorderLayout()).apply {
                isOpaque = false
                alignmentX = LEFT_ALIGNMENT
                maximumSize = Dimension(Int.MAX_VALUE, 40)
                add(JPanel().apply {
                    isOpaque = false
                    layout = BoxLayout(this, BoxLayout.Y_AXIS)
                    add(statusLabel)
                    add(Box.createVerticalStrut(2))
                    add(subtitleLabel)
                }, BorderLayout.CENTER)
            }

            val progressRow = JPanel(BorderLayout()).apply {
                isOpaque = false
                alignmentX = LEFT_ALIGNMENT
                maximumSize = Dimension(Int.MAX_VALUE, 4)
                border = JBUI.Borders.empty(6, 0, 8, 0)
                add(progressBar, BorderLayout.CENTER)
            }

            val buttonRow = JPanel(FlowLayout(FlowLayout.LEFT, 6, 0)).apply {
                isOpaque = false
                alignmentX = LEFT_ALIGNMENT
                maximumSize = Dimension(Int.MAX_VALUE, 32)
                add(releaseBtn)
                add(dryRunBtn)
                add(cancelBtn)
            }

            add(statusRow)
            add(progressRow)
            add(buttonRow)
            add(Box.createVerticalGlue())
        }

        // Center section: horizontal pipeline
        val centerPanel = JPanel(BorderLayout()).apply {
            isOpaque = false
            border = JBUI.Borders.empty(0, 8)

            val pipelineLabel = JLabel("PIPELINE").apply {
                font = font.deriveFont(Font.BOLD, 10f)
                foreground = TEXT_SECONDARY
                border = JBUI.Borders.emptyBottom(6)
            }

            val pipelineScroll = JBScrollPane(pipelineRow).apply {
                border = JBUI.Borders.empty()
                isOpaque = false
                viewport.isOpaque = false
                verticalScrollBarPolicy = ScrollPaneConstants.VERTICAL_SCROLLBAR_NEVER
                horizontalScrollBarPolicy = ScrollPaneConstants.HORIZONTAL_SCROLLBAR_AS_NEEDED
            }

            add(pipelineLabel, BorderLayout.NORTH)
            add(pipelineScroll, BorderLayout.CENTER)
        }

        // Right section: changelog (shown after release)
        changelogPanel.preferredSize = Dimension(280, 0)
        changelogPanel.border = JBUI.Borders.emptyLeft(12)

        // Dividers
        val leftDivider = createDivider()
        val rightDivider = createDivider()

        val mainLayout = JPanel(BorderLayout()).apply {
            isOpaque = false

            val leftWithDivider = JPanel(BorderLayout()).apply {
                isOpaque = false
                add(leftPanel, BorderLayout.CENTER)
                add(leftDivider, BorderLayout.EAST)
            }

            val rightWithDivider = JPanel(BorderLayout()).apply {
                isOpaque = false
                add(rightDivider, BorderLayout.WEST)
                add(changelogPanel, BorderLayout.CENTER)
            }

            add(leftWithDivider, BorderLayout.WEST)
            add(centerPanel, BorderLayout.CENTER)
            add(rightWithDivider, BorderLayout.EAST)
        }

        add(mainLayout, BorderLayout.CENTER)
    }

    private fun createDivider() = JPanel().apply {
        isOpaque = true
        background = BORDER_SUBTLE
        preferredSize = Dimension(1, 0)
        maximumSize = Dimension(1, Int.MAX_VALUE)
    }

    private fun attachListeners() {
        releaseBtn.addActionListener { launchRelease("release") }
        dryRunBtn.addActionListener { launchRelease("dry-run", "--dry-run") }
        cancelBtn.addActionListener { runner.stop(); applyIdleState() }
    }

    private fun launchRelease(mode: String, vararg flags: String) {
        resetPipeline()

        RELEASE_PHASES.forEach { phase ->
            val chip = HorizontalPhaseChip(phase.label)
            phaseChips[phase.id] = chip
            pipelineRow.add(chip)
        }
        pipelineRow.revalidate()
        pipelineRow.repaint()

        val isDryRun = mode == "dry-run"
        statusLabel.text = if (isDryRun) "Preview" else "Releasing..."
        statusLabel.foreground = ACCENT
        subtitleLabel.text = if (isDryRun) "Simulating (no changes)" else "Pipeline running"
        progressBar.setIndeterminate(true)
        progressBar.accentColor = ACCENT
        syncButtons(running = true)
        runner.execute(*flags)
    }

    private fun resetPipeline() {
        phaseChips.clear()
        pipelineRow.removeAll()
        completedPhaseCount = 0
        releaseSkipped = false
        changelogLines.clear()
        capturingChangelog = false
        changelogComplete = false
        changelogPanel.isVisible = false
    }

    private fun applyIdleState() {
        statusLabel.text = "Ready"
        statusLabel.foreground = TEXT_PRIMARY
        subtitleLabel.text = "Start a release or preview changes"
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
        phaseChips[phaseId]?.setState(state)
        if (state == PhaseState.DONE) completedPhaseCount++
        updateProgress()
    }

    private fun activatePhaseSequentially(targetPhase: PhaseInfo) {
        val targetIndex = RELEASE_PHASES.indexOfFirst { it.id == targetPhase.id }
        if (targetIndex < 0) return

        RELEASE_PHASES.forEachIndexed { index, phase ->
            val chip = phaseChips[phase.id] ?: return@forEachIndexed
            val isCompletable = chip.currentState != PhaseState.DONE &&
                                chip.currentState != PhaseState.ERROR &&
                                chip.currentState != PhaseState.SKIPPED

            when {
                index < targetIndex && isCompletable -> {
                    chip.setState(PhaseState.DONE)
                    completedPhaseCount++
                }
                index == targetIndex && chip.currentState != PhaseState.ACTIVE -> {
                    chip.setState(PhaseState.ACTIVE)
                }
            }
        }
        updateProgress()
    }

    private fun showChangelogPanel() {
        if (changelogLines.isEmpty()) return
        changelogContent.text = changelogLines.joinToString("\n")
        changelogPanel.isVisible = true
        revalidate()
        repaint()
    }

    private fun handleSkippedLine(phase: PhaseInfo) {
        releaseSkipped = true
        val reachedIndex = RELEASE_PHASES.indexOfFirst { it.id == phase.id }

        RELEASE_PHASES.forEachIndexed { index, p ->
            val chip = phaseChips[p.id] ?: return@forEachIndexed
            when {
                index < reachedIndex && chip.currentState != PhaseState.DONE -> {
                    chip.setState(PhaseState.DONE)
                    completedPhaseCount++
                }
                else -> chip.setState(PhaseState.SKIPPED)
            }
        }

        statusLabel.text = "Skipped"
        statusLabel.foreground = AMBER
        subtitleLabel.text = "No changes to release"
        progressBar.setIndeterminate(false)
        progressBar.progress = 100
        progressBar.accentColor = AMBER
    }

    private fun handleErrorLine(cleanLine: String, phase: PhaseInfo) {
        val targetIndex = RELEASE_PHASES.indexOfFirst { it.id == phase.id }

        RELEASE_PHASES.forEachIndexed { index, p ->
            val chip = phaseChips[p.id] ?: return@forEachIndexed
            if (index < targetIndex && chip.currentState == PhaseState.ACTIVE) {
                chip.setState(PhaseState.DONE)
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
                phaseChips.values.forEach {
                    if (it.currentState != PhaseState.ERROR && it.currentState != PhaseState.SKIPPED) {
                        it.setState(PhaseState.DONE)
                    }
                }
                progressBar.progress = 100
                progressBar.accentColor = GREEN
                statusLabel.text = "Complete"
                statusLabel.foreground = GREEN
                subtitleLabel.text = "Release finished successfully"
                showChangelogPanel()
            } else {
                phaseChips.values
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
}

