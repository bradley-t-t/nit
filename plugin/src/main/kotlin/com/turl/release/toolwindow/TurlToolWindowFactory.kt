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

private val BG = JBColor(Color(0xFFFFFF), Color(0x2B2B2B))
private val TEXT_PRIMARY = JBColor(Color(0x1E1E1E), Color(0xD2D2D2))
private val TEXT_DIM = JBColor(Color(0x828282), Color(0x787878))
private val ACCENT = JBColor(Color(0x3884F4), Color(0x4B91EB))
private val GREEN = JBColor(Color(0x28A745), Color(0x50BE6E))
private val RED = JBColor(Color(0xD73A49), Color(0xE15A5A))
private val CARD_BG = JBColor(Color(0xF8F9FA), Color(0x323436))
private val PROGRESS_TRACK = JBColor(Color(0xE4E6EB), Color(0x414346))
private val PHASE_PENDING_BG = JBColor(Color(0xF3F4F6), Color(0x38393B))
private val PHASE_ACTIVE_BG = JBColor(Color(0xEBF2FE), Color(0x2C3A4E))
private val PHASE_DONE_BG = JBColor(Color(0xEEF9F0), Color(0x2A3D2E))
private val PHASE_ERROR_BG = JBColor(Color(0xFDF0F0), Color(0x3D2A2A))
private val BORDER_COLOR = JBColor(Color(0xE0E0E0), Color(0x3C3C3C))
private val FIELD_BG = JBColor(Color(0xFFFFFF), Color(0x333538))

private enum class PhaseId {
    UPDATE, PREFLIGHT, ENVIRONMENT, CODE_PREP, VERSIONING, CHANGELOG, BUILD, COMMIT, LEARN
}

private data class PhaseInfo(val id: PhaseId, val label: String, val keywords: List<String>)

private val RELEASE_PHASES = listOf(
    PhaseInfo(PhaseId.UPDATE, "Checking for updates", listOf("Checking for updates", "Update available", "Auto-updating", "Updated to", "Update failed")),
    PhaseInfo(PhaseId.PREFLIGHT, "Pre-flight checks", listOf("Initializing", "Running pre-flight", "Pre-flight failed")),
    PhaseInfo(PhaseId.ENVIRONMENT, "Loading environment", listOf("Loading environment", "Reading project config", "Environment error", "Config error")),
    PhaseInfo(PhaseId.CODE_PREP, "Preparing code", listOf("Running code cleanup", "Running code formatter", "Checking for changes", "No changes detected", "Checking project rules", "Release aborted")),
    PhaseInfo(PhaseId.VERSIONING, "Updating version", listOf("Preparing release", "Updating version files", "Version update failed", "DRY RUN MODE")),
    PhaseInfo(PhaseId.CHANGELOG, "Generating changelog", listOf("Generating changelog", "Updating CHANGELOG", "Changelog generation failed", "Changelog update failed")),
    PhaseInfo(PhaseId.BUILD, "Building project", listOf("Running production build", "Build failed")),
    PhaseInfo(PhaseId.COMMIT, "Committing and pushing", listOf("Staging all changes", "Committing and pushing", "Staging failed", "Commit message generation failed", "Commit failed", "Push failed")),
    PhaseInfo(PhaseId.LEARN, "Learning rules", listOf("Learning from this release"))
)

private enum class PhaseState { PENDING, ACTIVE, DONE, ERROR }

private class TurlMainPanel(private val project: Project) : JPanel(BorderLayout()) {
    init {
        background = BG
        border = JBUI.Borders.empty()

        val header = JPanel(BorderLayout()).apply {
            isOpaque = false
            border = JBUI.Borders.empty(12, 16, 4, 16)
            add(JLabel("TURL Release").apply {
                font = font.deriveFont(Font.BOLD, 16f)
                foreground = TEXT_PRIMARY
            }, BorderLayout.WEST)
        }

        val tabs = JBTabbedPane().apply {
            tabComponentInsets = JBUI.insets(0)
            addTab("  Control Panel  ", AllIcons.Actions.Execute, ControlPanelTab(project))
            addTab("  Rules  ", AllIcons.Actions.ListFiles, RulesTab(project))
            addTab("  Settings  ", AllIcons.General.GearPlain, SettingsTab())
        }

        add(header, BorderLayout.NORTH)
        add(tabs, BorderLayout.CENTER)
    }
}

private class ControlPanelTab(private val project: Project) : JPanel(BorderLayout()), TurlOutputListener {

    private val runner = TurlProcessRunner(project)
    private val statusIcon = JLabel()
    private val statusLabel = JLabel("Ready").apply {
        font = font.deriveFont(Font.BOLD, 14f)
        foreground = TEXT_PRIMARY
    }
    private val subtitleLabel = JLabel("Press Release or Dry Run to begin").apply {
        font = font.deriveFont(Font.PLAIN, 11f)
        foreground = TEXT_DIM
    }
    private val progressBar = JProgressBar(0, 100).apply {
        isStringPainted = false
        preferredSize = Dimension(0, 6)
        maximumSize = Dimension(Int.MAX_VALUE, 6)
        value = 0
        foreground = ACCENT
        background = PROGRESS_TRACK
        border = null
        isOpaque = true
    }
    private val releaseBtn = StyledButton("Release", ACCENT, Color.WHITE, true)
    private val dryRunBtn = StyledButton("Dry Run", CARD_BG, TEXT_PRIMARY, false)
    private val cancelBtn = StyledButton("Cancel", PHASE_ERROR_BG, RED, false).apply { isVisible = false }

    private val phaseCards = mutableMapOf<PhaseId, PhaseCard>()
    private val phasesContainer = JPanel().apply {
        layout = BoxLayout(this, BoxLayout.Y_AXIS)
        isOpaque = false
    }
    private var completedPhaseCount = 0

    init {
        isOpaque = false
        border = JBUI.Borders.empty(8, 12, 12, 12)
        runner.setOutputListener(this)

        val statusCard = RoundedCard().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)
            border = JBUI.Borders.empty(14, 16, 14, 16)

            val iconTextRow = JPanel(FlowLayout(FlowLayout.LEFT, 8, 0)).apply {
                isOpaque = false
                alignmentX = LEFT_ALIGNMENT
                add(statusIcon)
                add(statusLabel)
            }
            val subRow = JPanel(FlowLayout(FlowLayout.LEFT, 0, 0)).apply {
                isOpaque = false
                alignmentX = LEFT_ALIGNMENT
                add(subtitleLabel)
            }
            add(iconTextRow)
            add(Box.createVerticalStrut(4))
            add(subRow)
            add(Box.createVerticalStrut(10))
            progressBar.alignmentX = LEFT_ALIGNMENT
            add(progressBar)
        }

        val btnRow = JPanel(GridLayout(1, 3, 8, 0)).apply {
            isOpaque = false
            border = JBUI.Borders.emptyTop(10)
            maximumSize = Dimension(Int.MAX_VALUE, 36)
            add(releaseBtn)
            add(dryRunBtn)
            add(cancelBtn)
        }

        val pipelineLabel = JLabel("Pipeline").apply {
            font = font.deriveFont(Font.BOLD, 11f)
            foreground = TEXT_DIM
            alignmentX = LEFT_ALIGNMENT
            border = JBUI.Borders.emptyLeft(2)
        }

        val topSection = JPanel().apply {
            isOpaque = false
            layout = BoxLayout(this, BoxLayout.Y_AXIS)
            add(statusCard)
            add(btnRow)
            add(Box.createVerticalStrut(10))
            add(JSeparator().apply { foreground = BORDER_COLOR; maximumSize = Dimension(Int.MAX_VALUE, 1) })
            add(Box.createVerticalStrut(6))
            add(pipelineLabel)
            add(Box.createVerticalStrut(6))
        }

        val scroll = JBScrollPane(phasesContainer).apply {
            border = JBUI.Borders.empty()
            isOpaque = false
            viewport.isOpaque = false
            horizontalScrollBarPolicy = ScrollPaneConstants.HORIZONTAL_SCROLLBAR_NEVER
        }

        add(topSection, BorderLayout.NORTH)
        add(scroll, BorderLayout.CENTER)

        releaseBtn.addActionListener { launchRelease("release") }
        dryRunBtn.addActionListener { launchRelease("dry-run", "--dry-run") }
        cancelBtn.addActionListener { runner.stop(); applyIdleState() }
    }

    private fun launchRelease(mode: String, vararg flags: String) {
        phaseCards.clear()
        phasesContainer.removeAll()
        completedPhaseCount = 0

        RELEASE_PHASES.forEach { phase ->
            val card = PhaseCard(phase.label)
            phaseCards[phase.id] = card
            phasesContainer.add(card)
            phasesContainer.add(Box.createVerticalStrut(4))
        }
        phasesContainer.revalidate()
        phasesContainer.repaint()

        statusIcon.icon = AllIcons.Process.Step_1
        statusLabel.text = if (mode == "dry-run") "Dry Run" else "Releasing..."
        statusLabel.foreground = ACCENT
        subtitleLabel.text = if (mode == "dry-run") "Simulating release (no changes)" else "Starting release pipeline"
        progressBar.isIndeterminate = true
        progressBar.foreground = ACCENT
        syncButtons(true)
        runner.execute(*flags)
    }

    private fun applyIdleState() {
        statusIcon.icon = null
        statusLabel.text = "Ready"
        statusLabel.foreground = TEXT_PRIMARY
        subtitleLabel.text = "Press Release or Dry Run to begin"
        progressBar.isIndeterminate = false
        progressBar.value = 0
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

    private fun updateProgress() {
        progressBar.isIndeterminate = false
        progressBar.value = ((completedPhaseCount.toFloat() / RELEASE_PHASES.size) * 100).toInt().coerceIn(0, 100)
    }

    private fun setPhaseState(phaseId: PhaseId, state: PhaseState) {
        phaseCards[phaseId]?.setState(state)
        if (state == PhaseState.DONE) completedPhaseCount++
        updateProgress()
    }

    override fun onOutputLine(cleanLine: String) {
        ApplicationManager.getApplication().invokeLater {
            val phase = findPhaseForLine(cleanLine) ?: return@invokeLater

            when {
                isErrorLine(cleanLine) -> {
                    phaseCards.values.filter { it.currentState == PhaseState.ACTIVE }.forEach { it.setState(PhaseState.DONE) }
                    setPhaseState(phase.id, PhaseState.ERROR)
                    statusIcon.icon = AllIcons.General.Error
                    statusLabel.text = "Error"
                    statusLabel.foreground = RED
                    subtitleLabel.text = cleanLine
                    progressBar.foreground = RED
                }
                cleanLine.contains("No changes detected", ignoreCase = true) || cleanLine.contains("Release skipped", ignoreCase = true) -> {
                    phaseCards.values.forEach { if (it.currentState != PhaseState.ERROR) it.setState(PhaseState.DONE) }
                    statusIcon.icon = AllIcons.General.Information
                    statusLabel.text = "No Changes"
                    statusLabel.foreground = TEXT_DIM
                    subtitleLabel.text = "Nothing to release"
                }
                else -> {
                    phaseCards.values.filter { it.currentState == PhaseState.ACTIVE }.forEach {
                        it.setState(PhaseState.DONE)
                        completedPhaseCount++
                    }
                    setPhaseState(phase.id, PhaseState.ACTIVE)
                    statusLabel.text = "Running..."
                    statusLabel.foreground = ACCENT
                    subtitleLabel.text = phase.label
                    updateProgress()
                }
            }

            SwingUtilities.invokeLater {
                (SwingUtilities.getAncestorOfClass(JBScrollPane::class.java, phasesContainer) as? JBScrollPane)
                    ?.verticalScrollBar?.let { it.value = it.maximum }
            }
        }
    }

    override fun onProcessFinished(exitCode: Int) {
        ApplicationManager.getApplication().invokeLater {
            progressBar.isIndeterminate = false
            if (exitCode == 0) {
                phaseCards.values.forEach { if (it.currentState != PhaseState.ERROR) it.setState(PhaseState.DONE) }
                progressBar.value = 100
                progressBar.foreground = GREEN
                statusIcon.icon = AllIcons.RunConfigurations.TestPassed
                statusLabel.text = "Complete"
                statusLabel.foreground = GREEN
                subtitleLabel.text = "Release finished successfully"
            } else {
                phaseCards.values.filter { it.currentState == PhaseState.ACTIVE }.forEach { it.setState(PhaseState.ERROR) }
                progressBar.foreground = RED
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

    private val rulesArea = JBTextArea().apply {
        font = Font("JetBrains Mono", Font.PLAIN, 12)
        lineWrap = true
        wrapStyleWord = true
        background = FIELD_BG
        foreground = TEXT_PRIMARY
        caretColor = TEXT_PRIMARY
        margin = JBUI.insets(10)
    }
    private val feedbackLabel = JLabel(" ").apply {
        font = font.deriveFont(Font.PLAIN, 11f)
        foreground = TEXT_DIM
    }

    private val rulesFilePath: String get() = "${project.basePath}/.github/copilot-instructions.md"

    init {
        isOpaque = false
        border = JBUI.Borders.empty(8, 12, 12, 12)

        val description = JPanel().apply {
            isOpaque = false
            layout = BoxLayout(this, BoxLayout.Y_AXIS)
            add(JLabel("Project Rules").apply {
                font = font.deriveFont(Font.BOLD, 13f)
                foreground = TEXT_PRIMARY
                alignmentX = LEFT_ALIGNMENT
            })
            add(Box.createVerticalStrut(4))
            add(JLabel("Edit rules from .github/copilot-instructions.md").apply {
                font = font.deriveFont(Font.PLAIN, 11f)
                foreground = TEXT_DIM
                alignmentX = LEFT_ALIGNMENT
            })
        }

        val scroll = JBScrollPane(rulesArea).apply {
            border = BorderFactory.createLineBorder(BORDER_COLOR, 1)
            isOpaque = false
        }

        val saveBtn = StyledButton("Save Rules", ACCENT, Color.WHITE, true)
        val reloadBtn = StyledButton("Reload", CARD_BG, TEXT_PRIMARY, false)

        val btnRow = JPanel(FlowLayout(FlowLayout.LEFT, 8, 0)).apply {
            isOpaque = false
            border = JBUI.Borders.emptyTop(8)
            add(saveBtn)
            add(reloadBtn)
            add(feedbackLabel)
        }

        val top = JPanel(BorderLayout()).apply {
            isOpaque = false
            border = JBUI.Borders.emptyBottom(8)
            add(description, BorderLayout.CENTER)
        }

        add(top, BorderLayout.NORTH)
        add(scroll, BorderLayout.CENTER)
        add(btnRow, BorderLayout.SOUTH)

        saveBtn.addActionListener { saveRules() }
        reloadBtn.addActionListener { loadRules() }
        loadRules()
    }

    private fun loadRules() {
        val file = File(rulesFilePath)
        if (!file.exists()) {
            rulesArea.text = ""
            feedbackLabel.text = "No rules file found"
            feedbackLabel.foreground = TEXT_DIM
            return
        }
        val rulesOnly = extractRulesSection(file.readText())
        rulesArea.text = rulesOnly
        feedbackLabel.text = "Loaded ${rulesOnly.lines().count { it.startsWith("- ") }} rules"
        feedbackLabel.foreground = TEXT_DIM
    }

    private fun saveRules() {
        val file = File(rulesFilePath)
        file.parentFile?.mkdirs()

        val newRules = rulesArea.text.trim()
        val startMarker = "<!-- TURL-RULES-START -->"
        val endMarker = "<!-- TURL-RULES-END -->"
        val rulesBlock = "$startMarker\n## Project Rules (Auto-managed by TURL)\n\nThese rules are automatically learned from project commits and enforced during releases.\nDo not edit this section manually - it will be overwritten.\n\n$newRules\n$endMarker"

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
        feedbackLabel.text = "\u2713 Saved"
        feedbackLabel.foreground = GREEN
    }

    private fun extractRulesSection(content: String): String {
        val startIdx = content.indexOf("<!-- TURL-RULES-START -->")
        val endIdx = content.indexOf("<!-- TURL-RULES-END -->")
        if (startIdx < 0 || endIdx < 0) return ""
        return content.substring(startIdx + "<!-- TURL-RULES-START -->".length, endIdx).trim()
            .lines().dropWhile { !it.startsWith("- ") }.joinToString("\n").trim()
    }
}

private class SettingsTab : JPanel(BorderLayout()) {

    private val settings = TurlSettings.getInstance()

    private val apiKeyField = JPasswordField().apply {
        background = FIELD_BG
        foreground = TEXT_PRIMARY
        caretColor = TEXT_PRIMARY
    }
    private val nodePathField = JTextField().apply {
        background = FIELD_BG
        foreground = TEXT_PRIMARY
        caretColor = TEXT_PRIMARY
    }
    private val branchField = JTextField().apply {
        background = FIELD_BG
        foreground = TEXT_PRIMARY
        caretColor = TEXT_PRIMARY
    }
    private val skipUpdateCheckbox = JCheckBox("Skip update check before releases").apply {
        isOpaque = false
        foreground = TEXT_PRIMARY
        font = font.deriveFont(Font.PLAIN, 12f)
    }
    private val feedbackLabel = JLabel(" ").apply {
        font = font.deriveFont(Font.PLAIN, 11f)
        foreground = TEXT_DIM
    }

    init {
        isOpaque = false
        border = JBUI.Borders.empty(8, 12, 12, 12)

        val form = JPanel(GridBagLayout()).apply { isOpaque = false }
        val gbc = GridBagConstraints().apply {
            fill = GridBagConstraints.HORIZONTAL
            insets = Insets(4, 0, 4, 8)
            anchor = GridBagConstraints.WEST
        }
        var row = 0

        fun addSection(title: String) {
            gbc.gridx = 0; gbc.gridy = row; gbc.gridwidth = 2; gbc.weightx = 1.0
            form.add(JLabel(title).apply {
                font = font.deriveFont(Font.BOLD, 12f)
                foreground = TEXT_PRIMARY
                border = JBUI.Borders.emptyTop(if (row > 0) 14 else 0)
            }, gbc)
            row++; gbc.gridwidth = 1
        }

        fun addField(label: String, field: JComponent) {
            gbc.gridx = 0; gbc.gridy = row; gbc.weightx = 0.0
            form.add(JLabel(label).apply {
                font = font.deriveFont(Font.PLAIN, 12f)
                foreground = TEXT_DIM
            }, gbc)
            gbc.gridx = 1; gbc.weightx = 1.0
            form.add(field, gbc)
            row++
        }

        fun addCheckbox(cb: JCheckBox) {
            gbc.gridx = 0; gbc.gridy = row; gbc.gridwidth = 2; gbc.weightx = 1.0
            form.add(cb, gbc)
            row++; gbc.gridwidth = 1
        }

        addSection("API")
        addField("Grok API Key", apiKeyField)

        addSection("Paths")
        addField("Node.js Path", nodePathField)

        addSection("Git")
        addField("Default Branch", branchField)

        addSection("Behavior")
        addCheckbox(skipUpdateCheckbox)

        gbc.gridx = 0; gbc.gridy = row; gbc.gridwidth = 2; gbc.weighty = 1.0
        form.add(Box.createVerticalGlue(), gbc)

        val scroll = JBScrollPane(form).apply {
            border = JBUI.Borders.empty()
            isOpaque = false
            viewport.isOpaque = false
        }

        val saveBtn = StyledButton("Save Settings", ACCENT, Color.WHITE, true)
        val resetBtn = StyledButton("Reset Defaults", CARD_BG, TEXT_PRIMARY, false)

        val btnRow = JPanel(FlowLayout(FlowLayout.LEFT, 8, 0)).apply {
            isOpaque = false
            border = JBUI.Borders.emptyTop(8)
            add(saveBtn)
            add(resetBtn)
            add(feedbackLabel)
        }

        add(scroll, BorderLayout.CENTER)
        add(btnRow, BorderLayout.SOUTH)

        saveBtn.addActionListener { saveSettings() }
        resetBtn.addActionListener { resetDefaults() }
        loadSettings()
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
        feedbackLabel.text = "\u2713 Settings saved"
        feedbackLabel.foreground = GREEN
    }

    private fun resetDefaults() {
        apiKeyField.text = ""
        nodePathField.text = ""
        branchField.text = ""
        skipUpdateCheckbox.isSelected = true
        saveSettings()
        feedbackLabel.text = "Reset to defaults"
        feedbackLabel.foreground = TEXT_DIM
    }
}

private open class RoundedCard : JPanel() {
    init {
        isOpaque = false
        background = CARD_BG
    }

    override fun paintComponent(g: Graphics) {
        (g.create() as Graphics2D).apply {
            setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
            color = background
            fillRoundRect(0, 0, width, height, 10, 10)
            dispose()
        }
        super.paintComponent(g)
    }
}

private class PhaseCard(private val label: String) : RoundedCard() {
    var currentState = PhaseState.PENDING; private set
    private val icon = JLabel()
    private val textLabel = JLabel(label)

    init {
        layout = BorderLayout()
        border = JBUI.Borders.empty(8, 12, 8, 12)
        maximumSize = Dimension(Int.MAX_VALUE, 36)
        val left = JPanel(FlowLayout(FlowLayout.LEFT, 8, 0)).apply {
            isOpaque = false
            add(icon)
            add(textLabel)
        }
        add(left, BorderLayout.WEST)
        applyStyle()
    }

    fun setState(state: PhaseState) {
        currentState = state
        applyStyle()
        repaint()
    }

    private fun applyStyle() {
        textLabel.font = textLabel.font.deriveFont(if (currentState == PhaseState.ACTIVE) Font.BOLD else Font.PLAIN, 12f)
        when (currentState) {
            PhaseState.PENDING -> {
                background = PHASE_PENDING_BG; icon.icon = null; textLabel.foreground = TEXT_DIM
            }
            PhaseState.ACTIVE -> {
                background = PHASE_ACTIVE_BG; icon.icon = AllIcons.Process.Step_1; textLabel.foreground = ACCENT
            }
            PhaseState.DONE -> {
                background = PHASE_DONE_BG; icon.icon = AllIcons.RunConfigurations.TestPassed; textLabel.foreground = GREEN
            }
            PhaseState.ERROR -> {
                background = PHASE_ERROR_BG; icon.icon = AllIcons.RunConfigurations.TestFailed; textLabel.foreground = RED
            }
        }
    }
}

private class StyledButton(text: String, bg: Color, fg: Color, primary: Boolean) : JButton(text) {
    init {
        isFocusPainted = false
        cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
        font = font.deriveFont(if (primary) Font.BOLD else Font.PLAIN, 12f)
        margin = JBUI.insets(6, 16, 6, 16)
        foreground = fg
        background = bg
        border = if (primary) JBUI.Borders.empty(6, 16, 6, 16)
        else BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(BORDER_COLOR, 1),
            JBUI.Borders.empty(5, 15, 5, 15)
        )
    }
}
