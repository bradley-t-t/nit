package com.turl.release.toolwindow

import com.intellij.icons.AllIcons
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.JBColor
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.components.JBTabbedPane
import com.intellij.ui.components.JBTextArea
import com.intellij.ui.content.ContentFactory
import com.intellij.util.ui.JBUI
import com.turl.release.services.TurlOutputListener
import com.turl.release.services.TurlProcessRunner
import com.turl.release.settings.TurlSettings
import java.awt.*
import java.io.File
import javax.swing.*

class TurlToolWindowFactory : ToolWindowFactory, DumbAware {
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val content = ContentFactory.getInstance().createContent(TurlMainPanel(project), "", false)
        toolWindow.contentManager.addContent(content)
    }
}

private val BG_PRIMARY = JBColor(Color(0xF7F8FA), Color(0x1E1F22))
private val TEXT_PRIMARY = JBColor(Color(0x1A1C20), Color(0xDCDCDC))
private val TEXT_SECONDARY = JBColor(Color(0x6E7681), Color(0x8B8F96))
private val ACCENT = JBColor(Color(0x2E6FE6), Color(0x4A8FF2))
private val GREEN = JBColor(Color(0x1A7F37), Color(0x3FB950))
private val RED = JBColor(Color(0xCF222E), Color(0xF85149))
private val AMBER = JBColor(Color(0x9A6700), Color(0xD29922))
private val CARD_BG = JBColor(Color(0xFFFFFF), Color(0x2B2D30))
private val CARD_SHADOW = JBColor(Color(0, 0, 0, 12), Color(0, 0, 0, 30))
private val BORDER_SUBTLE = JBColor(Color(0xE1E4E8), Color(0x373A3F))
private val PROGRESS_TRACK = JBColor(Color(0xE1E4E8), Color(0x373A3F))
private val PHASE_PENDING_BG = JBColor(Color(0xF3F4F6), Color(0x2B2D30))
private val PHASE_ACTIVE_BG = JBColor(Color(0xE8F0FE), Color(0x1C3150))
private val PHASE_DONE_BG = JBColor(Color(0xE6F6EB), Color(0x1B3228))
private val PHASE_ERROR_BG = JBColor(Color(0xFDE8E8), Color(0x3D1F1F))
private val PHASE_SKIPPED_BG = JBColor(Color(0xFFF8E1), Color(0x3D3520))
private val FIELD_BG = JBColor(Color(0xFFFFFF), Color(0x2B2D30))
private val FIELD_BORDER = JBColor(Color(0xD0D4DA), Color(0x44474C))
private val BADGE_BG = JBColor(Color(0xE8F0FE), Color(0x1C3150))
private val BADGE_FG = JBColor(Color(0x2E6FE6), Color(0x6CA4F7))
private val TIMELINE_LINE = JBColor(Color(0xD0D4DA), Color(0x44474C))
private val CHANGELOG_BG = JBColor(Color(0xF0F7FF), Color(0x1A2636))

private enum class PhaseId {
    UPDATE, PREFLIGHT, ENVIRONMENT, CODE_PREP, VERSIONING, CHANGELOG, BUILD, COMMIT, LEARN
}

private data class PhaseInfo(val id: PhaseId, val label: String, val keywords: List<String>)

private val RELEASE_PHASES = listOf(
    PhaseInfo(PhaseId.UPDATE, "Checking for updates", listOf("Checking for updates", "Update available", "Auto-updating", "Updated to", "Update failed")),
    PhaseInfo(PhaseId.PREFLIGHT, "Pre-flight checks", listOf("Initializing", "Running pre-flight", "Pre-flight failed")),
    PhaseInfo(PhaseId.ENVIRONMENT, "Loading environment", listOf("Loading environment", "Reading project config", "Environment error", "Config error")),
    PhaseInfo(PhaseId.CODE_PREP, "Preparing code", listOf("Running code cleanup", "Running code formatter", "Checking for changes", "No changes detected", "Checking project rules", "Release aborted", "Release skipped")),
    PhaseInfo(PhaseId.VERSIONING, "Updating version", listOf("Preparing release", "Updating version files", "Version update failed", "DRY RUN MODE")),
    PhaseInfo(PhaseId.CHANGELOG, "Generating changelog", listOf("Generating changelog", "Updating CHANGELOG", "Changelog generation failed", "Changelog update failed")),
    PhaseInfo(PhaseId.BUILD, "Building project", listOf("Running production build", "Build failed")),
    PhaseInfo(PhaseId.LEARN, "Learning rules", listOf("Learning from this release")),
    PhaseInfo(PhaseId.COMMIT, "Committing and pushing", listOf("Staging all changes", "Committing and pushing", "Staging failed", "Commit message generation failed", "Commit failed", "Push failed"))
)

private enum class PhaseState { PENDING, ACTIVE, DONE, ERROR, SKIPPED }

private class TurlMainPanel(private val project: Project) : JPanel(BorderLayout()) {
    init {
        background = BG_PRIMARY
        border = JBUI.Borders.empty()

        val tabs = JBTabbedPane().apply {
            tabComponentInsets = JBUI.insets(0)
            border = JBUI.Borders.empty()
            addTab("  Control  ", AllIcons.Actions.Execute, ControlPanelTab(project))
            addTab("  Rules  ", AllIcons.Actions.ListFiles, RulesTab(project))
            addTab("  Settings  ", AllIcons.General.GearPlain, SettingsTab())
        }

        add(tabs, BorderLayout.CENTER)
    }
}

private class ControlPanelTab(private val project: Project) : JPanel(BorderLayout()), TurlOutputListener {

    private val runner = TurlProcessRunner(project)
    private val statusIcon = JLabel()
    private val statusLabel = JLabel("Ready").apply {
        font = font.deriveFont(Font.BOLD, 15f)
        foreground = TEXT_PRIMARY
    }
    private val subtitleLabel = JLabel("Press Release or Dry Run to begin").apply {
        font = font.deriveFont(Font.PLAIN, 11f)
        foreground = TEXT_SECONDARY
    }
    private val progressBar = RoundedProgressBar()
    private val releaseBtn = PillButton("Release", ACCENT, Color.WHITE, true)
    private val dryRunBtn = PillButton("Dry Run", CARD_BG, TEXT_PRIMARY, false)
    private val cancelBtn = PillButton("Cancel", PHASE_ERROR_BG, RED, false).apply { isVisible = false }

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

    private val changelogCard = ShadowCard().apply {
        layout = BorderLayout()
        border = JBUI.Borders.empty(14, 16, 14, 16)
        isVisible = false
        alignmentX = LEFT_ALIGNMENT
    }
    private val changelogContent = JBTextArea().apply {
        font = Font("JetBrains Mono", Font.PLAIN, 11)
        lineWrap = true
        wrapStyleWord = true
        isEditable = false
        background = CHANGELOG_BG
        foreground = TEXT_PRIMARY
        border = JBUI.Borders.empty(10, 12, 10, 12)
    }

    private val scrollContent = JPanel().apply {
        layout = BoxLayout(this, BoxLayout.Y_AXIS)
        isOpaque = false
    }

    init {
        background = BG_PRIMARY
        border = JBUI.Borders.empty(14, 14, 14, 14)
        runner.setOutputListener(this)

        val statusCard = ShadowCard().apply {
            layout = GridBagLayout()
            border = JBUI.Borders.empty(16, 18, 16, 18)
            alignmentX = LEFT_ALIGNMENT
        }

        val gbc = GridBagConstraints().apply {
            anchor = GridBagConstraints.WEST
            fill = GridBagConstraints.HORIZONTAL
        }

        gbc.gridx = 0; gbc.gridy = 0; gbc.weightx = 0.0; gbc.insets = Insets(0, 0, 0, 8)
        statusCard.add(statusIcon, gbc)

        gbc.gridx = 1; gbc.weightx = 1.0; gbc.insets = Insets(0, 0, 0, 0)
        statusCard.add(statusLabel, gbc)

        gbc.gridx = 0; gbc.gridy = 1; gbc.gridwidth = 2; gbc.weightx = 1.0; gbc.insets = Insets(4, 0, 0, 0)
        statusCard.add(subtitleLabel, gbc)

        gbc.gridy = 2; gbc.insets = Insets(12, 0, 0, 0); gbc.fill = GridBagConstraints.HORIZONTAL
        statusCard.add(progressBar, gbc)

        val btnRow = JPanel(FlowLayout(FlowLayout.LEFT, 8, 0)).apply {
            isOpaque = false
            alignmentX = LEFT_ALIGNMENT
            border = JBUI.Borders.empty(12, 0, 0, 0)
            add(releaseBtn)
            add(dryRunBtn)
            add(cancelBtn)
        }

        val changelogHeader = JLabel("CHANGELOG").apply {
            font = font.deriveFont(Font.BOLD, 10f)
            foreground = TEXT_SECONDARY
            border = JBUI.Borders.emptyBottom(8)
        }
        changelogCard.add(changelogHeader, BorderLayout.NORTH)
        changelogCard.add(changelogContent, BorderLayout.CENTER)

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
            add(btnRow)
            add(Box.createVerticalStrut(14))
        }

        add(topSection, BorderLayout.NORTH)
        add(scroll, BorderLayout.CENTER)

        releaseBtn.addActionListener { launchRelease("release") }
        dryRunBtn.addActionListener { launchRelease("dry-run", "--dry-run") }
        cancelBtn.addActionListener { runner.stop(); applyIdleState() }
    }

    private fun launchRelease(mode: String, vararg flags: String) {
        phaseSteps.clear()
        timelineContainer.removeAll()
        completedPhaseCount = 0
        releaseSkipped = false
        changelogLines.clear()
        capturingChangelog = false
        changelogComplete = false
        changelogCard.isVisible = false

        RELEASE_PHASES.forEachIndexed { index, phase ->
            val isLast = index == RELEASE_PHASES.size - 1
            val step = TimelineStep(phase.label, isLast)
            phaseSteps[phase.id] = step
            timelineContainer.add(step)
        }
        timelineContainer.revalidate()
        timelineContainer.repaint()

        statusIcon.icon = AllIcons.Process.Step_1
        statusLabel.text = if (mode == "dry-run") "Dry Run" else "Releasing..."
        statusLabel.foreground = ACCENT
        subtitleLabel.text = if (mode == "dry-run") "Simulating release (no changes)" else "Starting release pipeline"
        progressBar.setIndeterminate(true)
        progressBar.accentColor = ACCENT
        syncButtons(true)
        runner.execute(*flags)
    }

    private fun applyIdleState() {
        statusIcon.icon = null
        statusLabel.text = "Ready"
        statusLabel.foreground = TEXT_PRIMARY
        subtitleLabel.text = "Press Release or Dry Run to begin"
        progressBar.setIndeterminate(false)
        progressBar.progress = 0
        syncButtons(false)
    }

    private fun syncButtons(running: Boolean) {
        releaseBtn.isEnabled = !running
        dryRunBtn.isEnabled = !running
        cancelBtn.isVisible = running
    }

    private fun findPhaseForLine(line: String): PhaseInfo? =
        RELEASE_PHASES.find { phase -> phase.keywords.any { line.contains(it, ignoreCase = true) } }

    private fun isErrorLine(line: String): Boolean =
        line.contains("failed", ignoreCase = true) || line.contains("error", ignoreCase = true) ||
                line.contains("Release aborted", ignoreCase = true)

    private fun isSkippedLine(line: String): Boolean =
        line.contains("No changes detected", ignoreCase = true) || line.contains("Release skipped", ignoreCase = true)

    private fun updateProgress() {
        progressBar.setIndeterminate(false)
        progressBar.progress = ((completedPhaseCount.toFloat() / RELEASE_PHASES.size) * 100).toInt().coerceIn(0, 100)
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
            when {
                index < targetIndex && step.currentState != PhaseState.DONE && step.currentState != PhaseState.ERROR && step.currentState != PhaseState.SKIPPED -> {
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
                isSkippedLine(cleanLine) -> {
                    releaseSkipped = true
                    val reachedPhase = RELEASE_PHASES.indexOfFirst { it.id == phase.id }
                    RELEASE_PHASES.forEachIndexed { index, p ->
                        when {
                            index < reachedPhase -> phaseSteps[p.id]?.let {
                                if (it.currentState != PhaseState.DONE) {
                                    it.setState(PhaseState.DONE)
                                    completedPhaseCount++
                                }
                            }
                            index == reachedPhase -> {
                                phaseSteps[p.id]?.setState(PhaseState.SKIPPED)
                            }
                            else -> phaseSteps[p.id]?.setState(PhaseState.SKIPPED)
                        }
                    }
                    statusIcon.icon = AllIcons.General.Warning
                    statusLabel.text = "Skipped"
                    statusLabel.foreground = AMBER
                    subtitleLabel.text = "No uncommitted changes found \u2014 nothing to release"
                    progressBar.setIndeterminate(false)
                    progressBar.progress = 100
                    progressBar.accentColor = AMBER
                }
                isErrorLine(cleanLine) -> {
                    val targetIndex = RELEASE_PHASES.indexOfFirst { it.id == phase.id }
                    RELEASE_PHASES.forEachIndexed { index, p ->
                        val step = phaseSteps[p.id] ?: return@forEachIndexed
                        if (index < targetIndex && step.currentState == PhaseState.ACTIVE) {
                            step.setState(PhaseState.DONE)
                            completedPhaseCount++
                        }
                    }
                    setPhaseState(phase.id, PhaseState.ERROR)
                    statusIcon.icon = AllIcons.General.Error
                    statusLabel.text = "Error"
                    statusLabel.foreground = RED
                    subtitleLabel.text = cleanLine
                    progressBar.accentColor = RED
                }
                else -> {
                    activatePhaseSequentially(phase)
                    statusLabel.text = "Running..."
                    statusLabel.foreground = ACCENT
                    subtitleLabel.text = phase.label
                }
            }

            SwingUtilities.invokeLater {
                (SwingUtilities.getAncestorOfClass(JBScrollPane::class.java, scrollContent) as? JBScrollPane)
                    ?.verticalScrollBar?.let { it.value = it.maximum }
            }
        }
    }

    override fun onProcessFinished(exitCode: Int) {
        ApplicationManager.getApplication().invokeLater {
            progressBar.setIndeterminate(false)
            if (releaseSkipped) {
                syncButtons(false)
                return@invokeLater
            }
            if (exitCode == 0) {
                phaseSteps.values.forEach { if (it.currentState != PhaseState.ERROR && it.currentState != PhaseState.SKIPPED) it.setState(PhaseState.DONE) }
                progressBar.progress = 100
                progressBar.accentColor = GREEN
                statusIcon.icon = AllIcons.RunConfigurations.TestPassed
                statusLabel.text = "Complete"
                statusLabel.foreground = GREEN
                subtitleLabel.text = "Release finished successfully"
                showChangelogCard()
            } else {
                phaseSteps.values.filter { it.currentState == PhaseState.ACTIVE }.forEach { it.setState(PhaseState.ERROR) }
                progressBar.accentColor = RED
                statusIcon.icon = AllIcons.General.Error
                statusLabel.text = "Failed"
                statusLabel.foreground = RED
                if (!subtitleLabel.text.contains("failed", ignoreCase = true) && !subtitleLabel.text.contains("error", ignoreCase = true)) {
                    subtitleLabel.text = "Release encountered an error"
                }
            }
            syncButtons(false)
        }
    }
}

private class RulesTab(private val project: Project) : JPanel(BorderLayout()) {

    private val rulesListPanel = JPanel().apply {
        layout = BoxLayout(this, BoxLayout.Y_AXIS)
        isOpaque = false
    }
    private val countLabel = JLabel("0 rules").apply {
        font = font.deriveFont(Font.PLAIN, 11f)
        foreground = TEXT_SECONDARY
    }
    private val feedbackLabel = JLabel(" ").apply {
        font = font.deriveFont(Font.PLAIN, 11f)
        foreground = TEXT_SECONDARY
    }
    private var ruleEntries = mutableListOf<RuleEntryCard>()

    private val rulesFilePath: String get() = "${project.basePath}/.github/copilot-instructions.md"

    init {
        background = BG_PRIMARY
        border = JBUI.Borders.empty(14, 14, 14, 14)

        val headerRow = JPanel(BorderLayout()).apply {
            isOpaque = false
            border = JBUI.Borders.empty(0, 0, 10, 0)

            add(countLabel, BorderLayout.WEST)

            val actions = JPanel(FlowLayout(FlowLayout.RIGHT, 6, 0)).apply {
                isOpaque = false
                add(PillButton("Add", ACCENT, Color.WHITE, true).apply {
                    addActionListener { addNewRule() }
                })
                add(PillButton("Save", GREEN, Color.WHITE, true).apply {
                    addActionListener { saveRules() }
                })
                add(PillButton("Reload", CARD_BG, TEXT_PRIMARY, false).apply {
                    addActionListener { loadRules() }
                })
            }
            add(actions, BorderLayout.EAST)
        }

        val scroll = JBScrollPane(rulesListPanel).apply {
            border = JBUI.Borders.empty()
            isOpaque = false
            viewport.isOpaque = false
            horizontalScrollBarPolicy = ScrollPaneConstants.HORIZONTAL_SCROLLBAR_NEVER
        }

        val bottomRow = JPanel(FlowLayout(FlowLayout.LEFT, 0, 0)).apply {
            isOpaque = false
            border = JBUI.Borders.emptyTop(6)
            add(feedbackLabel)
        }

        add(headerRow, BorderLayout.NORTH)
        add(scroll, BorderLayout.CENTER)
        add(bottomRow, BorderLayout.SOUTH)

        loadRules()
    }

    private fun addNewRule() {
        val entry = RuleEntryCard(ruleEntries.size + 1, "") { removeRule(it) }
        ruleEntries.add(entry)
        rebuildList()
        feedbackLabel.text = "New rule added"
        feedbackLabel.foreground = ACCENT
    }

    private fun removeRule(entry: RuleEntryCard) {
        ruleEntries.remove(entry)
        rebuildList()
        feedbackLabel.text = "Rule removed (save to apply)"
        feedbackLabel.foreground = TEXT_SECONDARY
    }

    private fun rebuildList() {
        rulesListPanel.removeAll()
        ruleEntries.forEachIndexed { index, entry ->
            entry.updateNumber(index + 1)
            rulesListPanel.add(entry)
            rulesListPanel.add(Box.createVerticalStrut(6))
        }
        rulesListPanel.add(Box.createVerticalGlue())
        countLabel.text = "${ruleEntries.size} rules"
        rulesListPanel.revalidate()
        rulesListPanel.repaint()
    }

    private fun loadRules() {
        ruleEntries.clear()

        val file = File(rulesFilePath)
        if (!file.exists()) {
            feedbackLabel.text = "No rules file found"
            feedbackLabel.foreground = TEXT_SECONDARY
            rebuildList()
            return
        }

        val rules = extractRules(file.readText())
        rules.forEachIndexed { index, text ->
            ruleEntries.add(RuleEntryCard(index + 1, text) { removeRule(it) })
        }
        rebuildList()
        feedbackLabel.text = "Loaded ${ruleEntries.size} rules"
        feedbackLabel.foreground = TEXT_SECONDARY
    }

    private fun saveRules() {
        val file = File(rulesFilePath)
        file.parentFile?.mkdirs()

        val rulesText = ruleEntries
            .map { it.getRuleText().trim() }
            .filter { it.isNotBlank() }
            .joinToString("\n") { "- $it" }

        val startMarker = "<!-- TURL-RULES-START -->"
        val endMarker = "<!-- TURL-RULES-END -->"
        val rulesBlock = "$startMarker\n## Project Rules (Auto-managed by TURL)\n\nThese rules are automatically learned from project commits and enforced during releases.\nDo not edit this section manually - it will be overwritten.\n\n$rulesText\n$endMarker"

        if (file.exists()) {
            val existing = file.readText()
            val startIdx = existing.indexOf(startMarker)
            val endIdx = existing.indexOf(endMarker)
            val updated = if (startIdx >= 0 && endIdx >= 0) {
                existing.substring(0, startIdx) + rulesBlock + existing.substring(endIdx + endMarker.length)
            } else {
                "$existing\n\n$rulesBlock\n"
            }
            file.writeText(updated)
        } else {
            file.writeText("# Copilot Instructions\n\nThis file provides context to GitHub Copilot for this project.\n\n$rulesBlock\n")
        }

        LocalFileSystem.getInstance().refreshAndFindFileByPath(rulesFilePath)?.refresh(true, false)
        feedbackLabel.text = "\u2713 ${ruleEntries.size} rules saved"
        feedbackLabel.foreground = GREEN
    }

    private fun extractRules(content: String): List<String> {
        val startIdx = content.indexOf("<!-- TURL-RULES-START -->")
        val endIdx = content.indexOf("<!-- TURL-RULES-END -->")
        if (startIdx < 0 || endIdx < 0) return emptyList()
        return content.substring(startIdx + "<!-- TURL-RULES-START -->".length, endIdx)
            .lines()
            .filter { it.trimStart().startsWith("- ") }
            .map { it.trimStart().removePrefix("- ").trim() }
            .filter { it.isNotBlank() }
    }
}

private class RuleEntryCard(
    private var number: Int,
    initialText: String,
    private val onDelete: (RuleEntryCard) -> Unit
) : ShadowCard() {

    private val numberLabel = JLabel().apply {
        font = font.deriveFont(Font.BOLD, 11f)
        foreground = BADGE_FG
        horizontalAlignment = SwingConstants.CENTER
        preferredSize = Dimension(26, 26)
    }

    private val badge = object : JPanel(BorderLayout()) {
        init {
            isOpaque = false
            preferredSize = Dimension(26, 26)
            minimumSize = Dimension(26, 26)
            maximumSize = Dimension(26, 26)
            add(numberLabel, BorderLayout.CENTER)
        }

        override fun paintComponent(g: Graphics) {
            val g2 = g.create() as Graphics2D
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
            g2.color = BADGE_BG
            g2.fillRoundRect(0, 0, width, height, 8, 8)
            g2.dispose()
            super.paintComponent(g)
        }
    }

    private val textArea = JBTextArea(initialText).apply {
        font = Font("JetBrains Mono", Font.PLAIN, 11)
        lineWrap = true
        wrapStyleWord = true
        background = CARD_BG
        foreground = TEXT_PRIMARY
        caretColor = TEXT_PRIMARY
        border = JBUI.Borders.empty()
        rows = 2
    }

    private val deleteBtn = JButton(AllIcons.Actions.Close).apply {
        isFocusPainted = false
        isBorderPainted = false
        isContentAreaFilled = false
        cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
        preferredSize = Dimension(22, 22)
        toolTipText = "Remove"
    }

    init {
        layout = BorderLayout(8, 0)
        border = JBUI.Borders.empty(10, 12, 10, 10)
        maximumSize = Dimension(Int.MAX_VALUE, 72)
        updateNumber(number)

        val left = JPanel(FlowLayout(FlowLayout.LEFT, 0, 0)).apply {
            isOpaque = false
            border = JBUI.Borders.emptyTop(2)
            add(badge)
        }
        val right = JPanel(FlowLayout(FlowLayout.RIGHT, 0, 0)).apply {
            isOpaque = false
            add(deleteBtn)
        }

        add(left, BorderLayout.WEST)
        add(textArea, BorderLayout.CENTER)
        add(right, BorderLayout.EAST)

        deleteBtn.addActionListener { onDelete(this) }
    }

    fun updateNumber(n: Int) {
        number = n
        numberLabel.text = "$n"
    }

    fun getRuleText(): String = textArea.text
}

private class SettingsTab : JPanel(BorderLayout()) {

    private val settings = TurlSettings.getInstance()

    private val apiKeyField = RoundedPasswordField()
    private val nodePathField = RoundedTextField()
    private val branchField = RoundedTextField()
    private val skipUpdateCheckbox = JCheckBox("Skip update check before releases").apply {
        isOpaque = false
        foreground = TEXT_PRIMARY
        font = font.deriveFont(Font.PLAIN, 12f)
    }
    private val feedbackLabel = JLabel(" ").apply {
        font = font.deriveFont(Font.PLAIN, 11f)
        foreground = TEXT_SECONDARY
    }

    init {
        background = BG_PRIMARY
        border = JBUI.Borders.empty(14, 14, 14, 14)

        val sections = JPanel().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)
            isOpaque = false
        }

        sections.add(settingsSection("API", listOf("Grok API Key" to apiKeyField)))
        sections.add(Box.createVerticalStrut(12))
        sections.add(settingsSection("PATHS", listOf("Node.js Path" to nodePathField)))
        sections.add(Box.createVerticalStrut(12))
        sections.add(settingsSection("GIT", listOf("Default Branch" to branchField)))
        sections.add(Box.createVerticalStrut(12))
        sections.add(settingsSection("BEHAVIOR", emptyList(), skipUpdateCheckbox))
        sections.add(Box.createVerticalGlue())

        val scroll = JBScrollPane(sections).apply {
            border = JBUI.Borders.empty()
            isOpaque = false
            viewport.isOpaque = false
        }

        val btnRow = JPanel(FlowLayout(FlowLayout.LEFT, 8, 0)).apply {
            isOpaque = false
            border = JBUI.Borders.emptyTop(10)
            add(PillButton("Save", ACCENT, Color.WHITE, true).apply {
                addActionListener { saveSettings() }
            })
            add(PillButton("Reset", CARD_BG, TEXT_PRIMARY, false).apply {
                addActionListener { resetDefaults() }
            })
            add(feedbackLabel)
        }

        add(scroll, BorderLayout.CENTER)
        add(btnRow, BorderLayout.SOUTH)

        loadSettings()
    }

    private fun settingsSection(title: String, fields: List<Pair<String, JComponent>>, checkbox: JCheckBox? = null): JComponent {
        val card = ShadowCard().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)
            border = JBUI.Borders.empty(14, 16, 14, 16)
            alignmentX = LEFT_ALIGNMENT
        }

        card.add(JLabel(title).apply {
            font = font.deriveFont(Font.BOLD, 10f)
            foreground = TEXT_SECONDARY
            alignmentX = LEFT_ALIGNMENT
        })
        card.add(Box.createVerticalStrut(10))

        fields.forEach { (label, field) ->
            card.add(JLabel(label).apply {
                font = font.deriveFont(Font.PLAIN, 12f)
                foreground = TEXT_PRIMARY
                alignmentX = LEFT_ALIGNMENT
                border = JBUI.Borders.emptyBottom(4)
            })
            field.apply {
                maximumSize = Dimension(Int.MAX_VALUE, 32)
                alignmentX = LEFT_ALIGNMENT
            }
            card.add(field)
            card.add(Box.createVerticalStrut(8))
        }

        if (checkbox != null) {
            checkbox.alignmentX = LEFT_ALIGNMENT
            card.add(checkbox)
        }

        return card
    }

    private fun loadSettings() {
        val state = settings.state
        apiKeyField.text = state.grokApiKey
        nodePathField.text = state.nodePath
        branchField.text = state.defaultBranch
        skipUpdateCheckbox.isSelected = state.skipUpdateOnRun
    }

    private fun saveSettings() {
        settings.loadState(TurlSettings.State(
            grokApiKey = String(apiKeyField.password),
            nodePath = nodePathField.text,
            defaultBranch = branchField.text,
            skipUpdateOnRun = skipUpdateCheckbox.isSelected
        ))
        feedbackLabel.text = "\u2713 Saved"
        feedbackLabel.foreground = GREEN
    }

    private fun resetDefaults() {
        apiKeyField.text = ""
        nodePathField.text = ""
        branchField.text = ""
        skipUpdateCheckbox.isSelected = true
        saveSettings()
        feedbackLabel.text = "Reset to defaults"
        feedbackLabel.foreground = TEXT_SECONDARY
    }
}

private open class ShadowCard : JPanel() {
    init {
        isOpaque = false
        background = CARD_BG
    }

    override fun paintComponent(g: Graphics) {
        val g2 = g.create() as Graphics2D
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        g2.color = CARD_SHADOW
        g2.fillRoundRect(0, 2, width, height, 10, 10)
        g2.color = background
        g2.fillRoundRect(0, 0, width, height - 2, 10, 10)
        g2.dispose()
        super.paintComponent(g)
    }
}

private class TimelineStep(private val label: String, private val isLast: Boolean) : JPanel() {
    var currentState = PhaseState.PENDING; private set
    private val dotSize = 10
    private val textLabel = JLabel(label)
    private val statusBadge = JLabel()

    init {
        isOpaque = false
        layout = BorderLayout()
        border = JBUI.Borders.empty(0, 0, 0, 0)
        maximumSize = Dimension(Int.MAX_VALUE, if (isLast) 28 else 34)
        preferredSize = Dimension(0, if (isLast) 28 else 34)
        minimumSize = Dimension(0, if (isLast) 28 else 34)

        textLabel.font = textLabel.font.deriveFont(Font.PLAIN, 12f)
        textLabel.foreground = TEXT_SECONDARY
        textLabel.border = JBUI.Borders.emptyLeft(22)

        statusBadge.font = statusBadge.font.deriveFont(Font.PLAIN, 9f)
        statusBadge.foreground = TEXT_SECONDARY

        val right = JPanel(FlowLayout(FlowLayout.RIGHT, 0, 0)).apply { isOpaque = false; add(statusBadge) }

        add(textLabel, BorderLayout.CENTER)
        add(right, BorderLayout.EAST)
    }

    fun setState(state: PhaseState) {
        currentState = state
        applyStyle()
        repaint()
    }

    override fun paintComponent(g: Graphics) {
        super.paintComponent(g)
        val g2 = g.create() as Graphics2D
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)

        val dotX = 2
        val dotY = (28 - dotSize) / 2

        if (!isLast) {
            g2.color = when (currentState) {
                PhaseState.DONE -> GREEN
                PhaseState.ACTIVE -> ACCENT
                PhaseState.ERROR -> RED
                PhaseState.SKIPPED -> AMBER
                else -> TIMELINE_LINE
            }
            g2.stroke = BasicStroke(1.5f)
            g2.drawLine(dotX + dotSize / 2, dotY + dotSize + 2, dotX + dotSize / 2, height)
        }

        when (currentState) {
            PhaseState.DONE -> {
                g2.color = GREEN
                g2.fillOval(dotX, dotY, dotSize, dotSize)
                g2.color = Color.WHITE
                g2.stroke = BasicStroke(1.5f)
                g2.drawLine(dotX + 3, dotY + dotSize / 2, dotX + dotSize / 2 - 1, dotY + dotSize - 3)
                g2.drawLine(dotX + dotSize / 2 - 1, dotY + dotSize - 3, dotX + dotSize - 2, dotY + 2)
            }
            PhaseState.ACTIVE -> {
                g2.color = ACCENT
                g2.fillOval(dotX, dotY, dotSize, dotSize)
                g2.color = Color.WHITE
                g2.fillOval(dotX + 3, dotY + 3, 4, 4)
            }
            PhaseState.ERROR -> {
                g2.color = RED
                g2.fillOval(dotX, dotY, dotSize, dotSize)
                g2.color = Color.WHITE
                g2.stroke = BasicStroke(1.5f)
                g2.drawLine(dotX + 3, dotY + 3, dotX + dotSize - 3, dotY + dotSize - 3)
                g2.drawLine(dotX + dotSize - 3, dotY + 3, dotX + 3, dotY + dotSize - 3)
            }
            PhaseState.SKIPPED -> {
                g2.color = AMBER
                g2.fillOval(dotX, dotY, dotSize, dotSize)
                g2.color = Color.WHITE
                g2.stroke = BasicStroke(1.5f)
                g2.drawLine(dotX + 3, dotY + dotSize / 2, dotX + dotSize - 3, dotY + dotSize / 2)
            }
            PhaseState.PENDING -> {
                g2.color = TIMELINE_LINE
                g2.stroke = BasicStroke(1.5f)
                g2.drawOval(dotX, dotY, dotSize, dotSize)
            }
        }

        g2.dispose()
    }

    private fun applyStyle() {
        when (currentState) {
            PhaseState.PENDING -> {
                textLabel.font = textLabel.font.deriveFont(Font.PLAIN, 12f)
                textLabel.foreground = TEXT_SECONDARY
                statusBadge.text = ""
            }
            PhaseState.ACTIVE -> {
                textLabel.font = textLabel.font.deriveFont(Font.BOLD, 12f)
                textLabel.foreground = ACCENT
                statusBadge.text = "running"
                statusBadge.foreground = ACCENT
            }
            PhaseState.DONE -> {
                textLabel.font = textLabel.font.deriveFont(Font.PLAIN, 12f)
                textLabel.foreground = GREEN
                statusBadge.text = ""
            }
            PhaseState.ERROR -> {
                textLabel.font = textLabel.font.deriveFont(Font.BOLD, 12f)
                textLabel.foreground = RED
                statusBadge.text = "failed"
                statusBadge.foreground = RED
            }
            PhaseState.SKIPPED -> {
                textLabel.font = textLabel.font.deriveFont(Font.PLAIN, 12f)
                textLabel.foreground = AMBER
                statusBadge.text = "skipped"
                statusBadge.foreground = AMBER
            }
        }
    }
}

private class PillButton(text: String, private val bgColor: Color, fg: Color, primary: Boolean) : JButton(text) {
    init {
        isFocusPainted = false
        cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
        font = font.deriveFont(if (primary) Font.BOLD else Font.PLAIN, 12f)
        foreground = fg
        background = bgColor
        isContentAreaFilled = false
        isBorderPainted = false
        border = JBUI.Borders.empty(5, 14, 5, 14)
    }

    override fun paintComponent(g: Graphics) {
        val g2 = g.create() as Graphics2D
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        g2.color = if (!isEnabled) BORDER_SUBTLE else if (model.isRollover) bgColor.brighter() else bgColor
        g2.fillRoundRect(0, 0, width, height, height, height)
        if (!isEnabled) {
            foreground = TEXT_SECONDARY
        }
        g2.dispose()
        super.paintComponent(g)
    }
}

private class RoundedProgressBar : JPanel() {
    var progress = 0
        set(value) { field = value; repaint() }
    var accentColor: Color = ACCENT
        set(value) { field = value; repaint() }
    private var indeterminate = false

    init {
        isOpaque = false
        preferredSize = Dimension(0, 4)
        maximumSize = Dimension(Int.MAX_VALUE, 4)
        minimumSize = Dimension(0, 4)
    }

    fun setIndeterminate(value: Boolean) {
        indeterminate = value
        repaint()
    }

    override fun paintComponent(g: Graphics) {
        val g2 = g.create() as Graphics2D
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        g2.color = PROGRESS_TRACK
        g2.fillRoundRect(0, 0, width, height, height, height)
        if (indeterminate || progress > 0) {
            g2.color = accentColor
            val fillWidth = if (indeterminate) width else (width * progress / 100)
            if (fillWidth > 0) g2.fillRoundRect(0, 0, fillWidth, height, height, height)
        }
        g2.dispose()
    }
}

private class RoundedTextField : JTextField() {
    init {
        isOpaque = false
        background = FIELD_BG
        foreground = TEXT_PRIMARY
        caretColor = TEXT_PRIMARY
        border = JBUI.Borders.empty(5, 10, 5, 10)
        font = Font("JetBrains Mono", Font.PLAIN, 12)
    }

    override fun paintComponent(g: Graphics) {
        val g2 = g.create() as Graphics2D
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        g2.color = background
        g2.fillRoundRect(0, 0, width, height, 8, 8)
        g2.color = FIELD_BORDER
        g2.drawRoundRect(0, 0, width - 1, height - 1, 8, 8)
        g2.dispose()
        super.paintComponent(g)
    }
}

private class RoundedPasswordField : JPasswordField() {
    init {
        isOpaque = false
        background = FIELD_BG
        foreground = TEXT_PRIMARY
        caretColor = TEXT_PRIMARY
        border = JBUI.Borders.empty(5, 10, 5, 10)
        font = Font("JetBrains Mono", Font.PLAIN, 12)
    }

    override fun paintComponent(g: Graphics) {
        val g2 = g.create() as Graphics2D
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        g2.color = background
        g2.fillRoundRect(0, 0, width, height, 8, 8)
        g2.color = FIELD_BORDER
        g2.drawRoundRect(0, 0, width - 1, height - 1, 8, 8)
        g2.dispose()
        super.paintComponent(g)
    }
}
