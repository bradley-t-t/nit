package com.turl.release.toolwindow

import com.intellij.icons.AllIcons
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.options.ShowSettingsUtil
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.JBColor
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.content.ContentFactory
import com.intellij.util.ui.JBUI
import com.turl.release.services.TurlOutputListener
import com.turl.release.services.TurlProcessRunner
import java.awt.*
import javax.swing.*

class TurlToolWindowFactory : ToolWindowFactory, DumbAware {
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val content = ContentFactory.getInstance().createContent(TurlPanel(project), "", false)
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
private val CHECK_DIM = JBColor(Color(0xC0C0C0), Color(0x555555))

private enum class PhaseId {
    UPDATE, PREFLIGHT, ENVIRONMENT, CODE_PREP, VERSIONING, CHANGELOG, BUILD, COMMIT, LEARN
}

private data class PhaseInfo(
    val id: PhaseId,
    val label: String,
    val keywords: List<String>
)

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

private class TurlPanel(private val project: Project) : JPanel(BorderLayout()), TurlOutputListener {

    private val runner = TurlProcessRunner(project)

    private val statusIcon = JLabel()
    private val statusLabel = JLabel("Ready")
    private val subtitleLabel = JLabel("Press Release or Dry Run to begin")

    private val progressBar = JProgressBar(0, 100).apply {
        isStringPainted = false
        preferredSize = Dimension(0, 4)
        maximumSize = Dimension(Int.MAX_VALUE, 4)
        isIndeterminate = false
        value = 0
        foreground = ACCENT
        background = PROGRESS_TRACK
        border = null
        isOpaque = true
    }

    private val releaseBtn = PrimaryButton("Release")
    private val dryRunBtn = SecondaryButton("Dry Run")
    private val settingsBtn = JButton(AllIcons.General.GearPlain).apply {
        isBorderPainted = false; isContentAreaFilled = false; isFocusPainted = false
        cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
        toolTipText = "Settings"
    }
    private val cancelBtn = JButton("Cancel").apply {
        isFocusPainted = false; isBorderPainted = false; isContentAreaFilled = false
        cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
        font = font.deriveFont(Font.BOLD, 11f)
        foreground = RED
        isVisible = false
    }

    private val phaseCards = mutableMapOf<PhaseId, PhaseCard>()
    private val phasesContainer = JPanel().apply {
        layout = BoxLayout(this, BoxLayout.Y_AXIS)
        isOpaque = false
    }
    private var completedPhaseCount = 0

    init {
        background = BG
        border = JBUI.Borders.empty()
        runner.setOutputListener(this)
        add(buildMainPanel(), BorderLayout.CENTER)

        settingsBtn.addActionListener { ShowSettingsUtil.getInstance().showSettingsDialog(project, "TURL Release") }
        releaseBtn.addActionListener { launchRelease("release") }
        dryRunBtn.addActionListener { launchRelease("dry-run", "--dry-run") }
        cancelBtn.addActionListener { runner.stop(); setIdle() }
        applyIdleState()
    }

    private fun buildMainPanel(): JPanel = JPanel(BorderLayout()).apply {
        isOpaque = false
        border = JBUI.Borders.empty(14, 16, 14, 16)

        val headerRow = JPanel(BorderLayout()).apply {
            isOpaque = false
            add(JLabel("TURL Release").apply {
                font = font.deriveFont(Font.BOLD, 15f); foreground = TEXT_PRIMARY
            }, BorderLayout.WEST)
            val actions = JPanel(FlowLayout(FlowLayout.RIGHT, 2, 0)).apply {
                isOpaque = false; add(cancelBtn); add(settingsBtn)
            }
            add(actions, BorderLayout.EAST)
        }

        val statusCard = RoundedPanel(10).apply {
            background = CARD_BG
            layout = BoxLayout(this, BoxLayout.Y_AXIS)
            border = JBUI.Borders.empty(14, 16, 14, 16)

            val row = JPanel(FlowLayout(FlowLayout.LEFT, 8, 0)).apply {
                isOpaque = false; alignmentX = LEFT_ALIGNMENT
                statusLabel.font = statusLabel.font.deriveFont(Font.BOLD, 14f)
                statusLabel.foreground = TEXT_PRIMARY
                add(statusIcon); add(statusLabel)
            }
            val sub = JPanel(FlowLayout(FlowLayout.LEFT, 0, 0)).apply {
                isOpaque = false; alignmentX = LEFT_ALIGNMENT
                subtitleLabel.font = subtitleLabel.font.deriveFont(Font.PLAIN, 11f)
                subtitleLabel.foreground = TEXT_DIM
                add(subtitleLabel)
            }
            add(row); add(Box.createVerticalStrut(4)); add(sub)
            add(Box.createVerticalStrut(10)); progressBar.alignmentX = LEFT_ALIGNMENT; add(progressBar)
        }

        val btnRow = JPanel(GridLayout(1, 2, 8, 0)).apply {
            isOpaque = false; border = JBUI.Borders.emptyTop(10)
            maximumSize = Dimension(Int.MAX_VALUE, 34)
            add(releaseBtn); add(dryRunBtn)
        }

        val topSection = JPanel().apply {
            isOpaque = false; layout = BoxLayout(this, BoxLayout.Y_AXIS)
            add(headerRow); add(Box.createVerticalStrut(12)); add(statusCard); add(btnRow)
        }

        val scroll = JBScrollPane(phasesContainer).apply {
            border = JBUI.Borders.emptyTop(12)
            isOpaque = false; viewport.isOpaque = false
            horizontalScrollBarPolicy = ScrollPaneConstants.HORIZONTAL_SCROLLBAR_NEVER
        }

        add(topSection, BorderLayout.NORTH)
        add(scroll, BorderLayout.CENTER)
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
        syncButtons()
        runner.execute(*flags)
    }

    private fun setIdle() { applyIdleState() }

    private fun applyIdleState() {
        statusIcon.icon = null
        statusLabel.text = "Ready"
        statusLabel.foreground = TEXT_PRIMARY
        subtitleLabel.text = "Press Release or Dry Run to begin"
        progressBar.isIndeterminate = false
        progressBar.value = 0
        syncButtons()
    }

    private fun syncButtons() {
        val running = runner.isRunning
        releaseBtn.isEnabled = !running
        dryRunBtn.isEnabled = !running
        cancelBtn.isVisible = running
    }

    private fun findPhaseForLine(line: String): PhaseInfo? =
        RELEASE_PHASES.find { phase -> phase.keywords.any { line.contains(it, ignoreCase = true) } }

    private fun isErrorLine(line: String): Boolean =
        line.contains("failed", ignoreCase = true) || line.contains("error", ignoreCase = true) ||
                line.contains("Release aborted", ignoreCase = true)

    private fun isCompleteLine(line: String): Boolean =
        line.contains("Release Complete", ignoreCase = true)

    private fun isNoChangesLine(line: String): Boolean =
        line.contains("No changes detected", ignoreCase = true) || line.contains("Release skipped", ignoreCase = true)

    private fun updateProgress() {
        progressBar.isIndeterminate = false
        val pct = ((completedPhaseCount.toFloat() / RELEASE_PHASES.size) * 100).toInt().coerceIn(0, 100)
        progressBar.value = pct
    }

    private fun setPhaseState(phaseId: PhaseId, state: PhaseState) {
        phaseCards[phaseId]?.setState(state)
        if (state == PhaseState.DONE) completedPhaseCount++
        updateProgress()
    }

    private fun completeAllActiveAsDone() {
        phaseCards.values.filter { it.currentState == PhaseState.ACTIVE }.forEach { it.setState(PhaseState.DONE) }
    }

    override fun onOutputLine(cleanLine: String) {
        ApplicationManager.getApplication().invokeLater {
            val phase = findPhaseForLine(cleanLine) ?: return@invokeLater

            if (isErrorLine(cleanLine)) {
                completeAllActiveAsDone()
                setPhaseState(phase.id, PhaseState.ERROR)
                statusIcon.icon = AllIcons.General.Error
                statusLabel.text = "Error"
                statusLabel.foreground = RED
                subtitleLabel.text = cleanLine
                progressBar.foreground = RED
            } else if (isNoChangesLine(cleanLine)) {
                completeAllActiveAsDone()
                setPhaseState(phase.id, PhaseState.DONE)
                phaseCards.values.filter { it.currentState == PhaseState.PENDING }.forEach { it.setState(PhaseState.DONE) }
                statusIcon.icon = AllIcons.General.Information
                statusLabel.text = "No Changes"
                statusLabel.foreground = TEXT_DIM
                subtitleLabel.text = "Nothing to release"
            } else {
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

            scrollToBottom()
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
            syncButtons()
        }
    }

    private fun scrollToBottom() {
        SwingUtilities.invokeLater {
            (SwingUtilities.getAncestorOfClass(JBScrollPane::class.java, phasesContainer) as? JBScrollPane)
                ?.verticalScrollBar?.let { it.value = it.maximum }
        }
    }
}

private open class RoundedPanel(private val radius: Int) : JPanel() {
    init { isOpaque = false }
    override fun paintComponent(g: Graphics) {
        (g.create() as Graphics2D).apply {
            setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
            color = background
            fillRoundRect(0, 0, width, height, radius, radius)
            dispose()
        }
        super.paintComponent(g)
    }
}

private class PhaseCard(private val label: String) : RoundedPanel(8) {
    var currentState = PhaseState.PENDING; private set
    private val icon = JLabel()
    private val textLabel = JLabel(label)
    private val checkMark = JLabel()

    init {
        layout = BorderLayout()
        border = JBUI.Borders.empty(10, 14, 10, 14)
        maximumSize = Dimension(Int.MAX_VALUE, 40)

        val left = JPanel(FlowLayout(FlowLayout.LEFT, 8, 0)).apply {
            isOpaque = false; add(icon); add(textLabel)
        }
        add(left, BorderLayout.WEST)
        add(checkMark, BorderLayout.EAST)
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
                background = PHASE_PENDING_BG
                icon.icon = null
                textLabel.foreground = TEXT_DIM
                checkMark.icon = null
                checkMark.text = ""
            }
            PhaseState.ACTIVE -> {
                background = PHASE_ACTIVE_BG
                icon.icon = AllIcons.Process.Step_1
                textLabel.foreground = ACCENT
                checkMark.icon = null
                checkMark.text = ""
            }
            PhaseState.DONE -> {
                background = PHASE_DONE_BG
                icon.icon = AllIcons.RunConfigurations.TestPassed
                textLabel.foreground = GREEN
                checkMark.icon = null
                checkMark.foreground = CHECK_DIM
                checkMark.text = "\u2713"
                checkMark.font = checkMark.font.deriveFont(Font.PLAIN, 12f)
            }
            PhaseState.ERROR -> {
                background = PHASE_ERROR_BG
                icon.icon = AllIcons.RunConfigurations.TestFailed
                textLabel.foreground = RED
                checkMark.icon = null
                checkMark.foreground = RED
                checkMark.text = "\u2717"
                checkMark.font = checkMark.font.deriveFont(Font.PLAIN, 12f)
            }
        }
    }
}

private class PrimaryButton(text: String) : JButton(text) {
    init {
        isFocusPainted = false
        cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
        font = font.deriveFont(Font.BOLD, 12f)
        margin = JBUI.insets(8, 16, 8, 16)
        foreground = Color.WHITE
        background = ACCENT
    }
}

private class SecondaryButton(text: String) : JButton(text) {
    init {
        isFocusPainted = false
        cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
        font = font.deriveFont(Font.PLAIN, 12f)
        margin = JBUI.insets(8, 16, 8, 16)
    }
}
