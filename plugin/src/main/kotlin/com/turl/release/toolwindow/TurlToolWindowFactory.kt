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

private val BG: Color = JBColor(Color(255, 255, 255), Color(43, 43, 43))
private val DIVIDER: Color = JBColor(Color(230, 230, 230), Color(60, 63, 65))
private val TEXT_PRIMARY: Color = JBColor(Color(30, 30, 30), Color(210, 210, 210))
private val TEXT_DIM: Color = JBColor(Color(130, 130, 130), Color(120, 120, 120))
private val ACCENT: Color = JBColor(Color(56, 132, 244), Color(75, 145, 235))
private val GREEN: Color = JBColor(Color(40, 167, 69), Color(80, 190, 110))
private val RED: Color = JBColor(Color(215, 58, 73), Color(225, 90, 90))
private val STEP_DONE: Color = JBColor(Color(80, 85, 90), Color(175, 178, 182))
private val CARD_BG: Color = JBColor(Color(248, 249, 250), Color(50, 52, 54))
private val PROGRESS_TRACK: Color = JBColor(Color(228, 230, 235), Color(65, 67, 70))

private class TurlPanel(private val project: Project) : JPanel(BorderLayout()), TurlOutputListener {

    private val runner = TurlProcessRunner(project)

    private val statusLabel = JLabel("Ready").apply {
        font = font.deriveFont(Font.BOLD, 14f)
        foreground = TEXT_PRIMARY
    }
    private val subtitleLabel = JLabel("Select a release mode to begin").apply {
        font = font.deriveFont(Font.PLAIN, 11f)
        foreground = TEXT_DIM
    }

    private val progressBar = JProgressBar(0, 100).apply {
        isStringPainted = false
        preferredSize = Dimension(0, 3)
        maximumSize = Dimension(Int.MAX_VALUE, 3)
        isIndeterminate = false
        value = 0
        foreground = ACCENT
        background = PROGRESS_TRACK
        border = null
        isOpaque = true
    }

    private val releaseBtn = ActionButton("Release", AllIcons.Actions.Execute)
    private val dryRunBtn = ActionButton("Dry Run", AllIcons.Actions.Preview)
    private val settingsBtn = JButton(AllIcons.General.GearPlain).apply {
        isBorderPainted = false; isContentAreaFilled = false; isFocusPainted = false
        cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
        toolTipText = "Settings"
    }
    private val stopBtn = JButton("Cancel").apply {
        isFocusPainted = false
        cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
        font = font.deriveFont(Font.PLAIN, 11f)
        foreground = RED
        isVisible = false
    }

    private val stepsContainer = JPanel().apply {
        layout = BoxLayout(this, BoxLayout.Y_AXIS)
        isOpaque = false
    }

    private val stepRows = mutableListOf<StepRow>()
    private var completedStepCount = 0
    private val totalEstimatedSteps = 12

    init {
        background = BG
        border = JBUI.Borders.empty()
        runner.setOutputListener(this)

        add(buildHeader(), BorderLayout.NORTH)
        add(buildBody(), BorderLayout.CENTER)

        settingsBtn.addActionListener { ShowSettingsUtil.getInstance().showSettingsDialog(project, "TURL Release") }
        releaseBtn.addActionListener { launchRelease("release") }
        dryRunBtn.addActionListener { launchRelease("dry-run", "--dry-run") }
        stopBtn.addActionListener { runner.stop(); setIdle() }

        syncButtons()
    }

    private fun buildHeader(): JPanel = JPanel(BorderLayout()).apply {
        isOpaque = false
        border = JBUI.Borders.empty(16, 18, 12, 18)

        val titleRow = JPanel(BorderLayout()).apply {
            isOpaque = false
            add(JLabel("TURL Release").apply {
                font = font.deriveFont(Font.BOLD, 16f); foreground = TEXT_PRIMARY
            }, BorderLayout.WEST)

            val rightPanel = JPanel(FlowLayout(FlowLayout.RIGHT, 4, 0)).apply {
                isOpaque = false
                add(stopBtn)
                add(settingsBtn)
            }
            add(rightPanel, BorderLayout.EAST)
        }

        add(titleRow, BorderLayout.NORTH)
    }

    private fun buildBody(): JPanel = JPanel(BorderLayout()).apply {
        isOpaque = false
        border = JBUI.Borders.empty(0, 18, 18, 18)

        val statusCard = RoundedPanel(12).apply {
            background = CARD_BG
            layout = BorderLayout()
            border = JBUI.Borders.empty(16, 18, 16, 18)

            val top = JPanel(BorderLayout()).apply {
                isOpaque = false
                add(statusLabel, BorderLayout.WEST)
            }
            val bottom = JPanel().apply {
                isOpaque = false
                layout = BoxLayout(this, BoxLayout.Y_AXIS)
                add(Box.createVerticalStrut(4))
                add(subtitleLabel)
                add(Box.createVerticalStrut(10))
                add(progressBar)
            }
            add(top, BorderLayout.NORTH)
            add(bottom, BorderLayout.CENTER)
        }

        val buttonsRow = JPanel(GridLayout(1, 2, 8, 0)).apply {
            isOpaque = false
            border = JBUI.Borders.emptyTop(12)
            maximumSize = Dimension(Int.MAX_VALUE, 36)
            add(releaseBtn)
            add(dryRunBtn)
        }

        val topSection = JPanel().apply {
            isOpaque = false
            layout = BoxLayout(this, BoxLayout.Y_AXIS)
            add(statusCard)
            add(buttonsRow)
        }

        val stepsScroll = JBScrollPane(stepsContainer).apply {
            border = JBUI.Borders.emptyTop(14)
            isOpaque = false; viewport.isOpaque = false
            horizontalScrollBarPolicy = ScrollPaneConstants.HORIZONTAL_SCROLLBAR_NEVER
        }

        add(topSection, BorderLayout.NORTH)
        add(stepsScroll, BorderLayout.CENTER)
    }

    private fun launchRelease(mode: String, vararg flags: String) {
        stepRows.clear()
        stepsContainer.removeAll()
        stepsContainer.revalidate()
        stepsContainer.repaint()
        completedStepCount = 0

        statusLabel.text = "Starting..."
        statusLabel.foreground = ACCENT
        subtitleLabel.text = if (mode == "dry-run") "Dry run mode" else "Preparing release"
        progressBar.isIndeterminate = true
        progressBar.foreground = ACCENT

        syncButtons()
        runner.execute(*flags)
    }

    private fun setIdle() {
        statusLabel.text = "Ready"
        statusLabel.foreground = TEXT_PRIMARY
        subtitleLabel.text = "Select a release mode to begin"
        progressBar.isIndeterminate = false
        progressBar.value = 0
        syncButtons()
    }

    private fun syncButtons() {
        val running = runner.isRunning
        releaseBtn.isEnabled = !running
        dryRunBtn.isEnabled = !running
        stopBtn.isVisible = running
    }

    private fun isStepLine(line: String): Boolean {
        val prefixes = listOf(
            "Checking for updates", "Initializing", "Running pre-flight",
            "Loading environment", "Reading project config", "Preparing release",
            "DRY RUN MODE", "Running code cleanup", "Running code formatter",
            "Checking for changes", "No changes detected", "Checking project rules",
            "Updating version files", "Generating changelog", "Updating CHANGELOG",
            "Running production build", "Staging all changes", "Committing and pushing",
            "Learning from this release", "Release Complete", "Release Failed",
            "Pre-flight failed", "Environment error", "Config error",
            "Version update failed", "Changelog generation failed", "Changelog update failed",
            "Build failed", "Staging failed", "Commit message generation failed",
            "Commit failed", "Push failed", "Update available", "Auto-updating",
            "Updated to", "Update failed, continuing", "Release aborted"
        )
        return prefixes.any { line.contains(it, ignoreCase = true) }
    }

    private fun isErrorLine(line: String): Boolean =
        line.contains("failed", ignoreCase = true) || line.contains("error", ignoreCase = true) ||
                line.contains("Release aborted", ignoreCase = true)

    private fun isTerminalLine(line: String): Boolean =
        line.contains("Release Complete", ignoreCase = true) || line.contains("No changes detected", ignoreCase = true) ||
                line.contains("Release skipped", ignoreCase = true) || line.contains("Release aborted", ignoreCase = true)

    private fun completeActiveStep(success: Boolean) {
        stepRows.lastOrNull { it.state == StepRow.State.ACTIVE }?.let {
            it.state = if (success) StepRow.State.DONE else StepRow.State.ERROR
            if (success) completedStepCount++
            it.repaint()
        }
    }

    private fun addStep(label: String, state: StepRow.State) {
        val row = StepRow(label, state)
        stepRows.add(row)
        stepsContainer.add(row)
        stepsContainer.revalidate()
        stepsContainer.repaint()
        SwingUtilities.invokeLater {
            (SwingUtilities.getAncestorOfClass(JBScrollPane::class.java, stepsContainer) as? JBScrollPane)
                ?.verticalScrollBar?.let { it.value = it.maximum }
        }
    }

    private fun updateProgress() {
        progressBar.isIndeterminate = false
        val pct = ((completedStepCount.toFloat() / totalEstimatedSteps) * 100).toInt().coerceIn(0, 100)
        progressBar.value = pct
    }

    override fun onOutputLine(cleanLine: String) {
        ApplicationManager.getApplication().invokeLater {
            if (!isStepLine(cleanLine)) return@invokeLater

            if (isErrorLine(cleanLine)) {
                completeActiveStep(false)
                addStep(cleanLine, StepRow.State.ERROR)
                statusLabel.text = "Error"
                statusLabel.foreground = RED
                subtitleLabel.text = cleanLine
                progressBar.foreground = RED
                updateProgress()
            } else if (isTerminalLine(cleanLine)) {
                completeActiveStep(true)
                addStep(cleanLine, StepRow.State.DONE)
                updateProgress()
            } else {
                completeActiveStep(true)
                addStep(cleanLine, StepRow.State.ACTIVE)
                statusLabel.text = "Running..."
                statusLabel.foreground = ACCENT
                subtitleLabel.text = cleanLine
                updateProgress()
            }
        }
    }

    override fun onProcessFinished(exitCode: Int) {
        ApplicationManager.getApplication().invokeLater {
            completeActiveStep(exitCode == 0)
            progressBar.isIndeterminate = false
            if (exitCode == 0) {
                progressBar.value = 100
                progressBar.foreground = GREEN
                statusLabel.text = "Complete"
                statusLabel.foreground = GREEN
                subtitleLabel.text = "All steps finished successfully"
            } else {
                progressBar.foreground = RED
                statusLabel.text = "Failed"
                statusLabel.foreground = RED
                subtitleLabel.text = "Release encountered an error"
            }
            syncButtons()
        }
    }
}

private class RoundedPanel(private val radius: Int) : JPanel() {
    init { isOpaque = false }

    override fun paintComponent(g: Graphics) {
        val g2 = g.create() as Graphics2D
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        g2.color = background
        g2.fillRoundRect(0, 0, width, height, radius, radius)
        g2.dispose()
        super.paintComponent(g)
    }
}

private class ActionButton(text: String, icon: Icon) : JButton(text, icon) {
    init {
        isFocusPainted = false
        cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
        font = font.deriveFont(Font.PLAIN, 12f)
        margin = JBUI.insets(8, 16, 8, 16)
    }
}

private class StepRow(private val label: String, var state: State) : JPanel(BorderLayout()) {
    enum class State { ACTIVE, DONE, ERROR }

    private val indicator = JLabel()
    private val textLabel = JLabel(label)

    init {
        isOpaque = false
        maximumSize = Dimension(Int.MAX_VALUE, 28)
        border = JBUI.Borders.empty(2, 4)
        val inner = JPanel(FlowLayout(FlowLayout.LEFT, 6, 0)).apply { isOpaque = false }
        inner.add(indicator)
        inner.add(textLabel)
        add(inner, BorderLayout.WEST)
        applyState()
    }

    override fun paintComponent(g: Graphics) {
        applyState()
        super.paintComponent(g)
    }

    private fun applyState() {
        textLabel.font = textLabel.font.deriveFont(
            if (state == State.ACTIVE) Font.BOLD else Font.PLAIN, 12f
        )
        when (state) {
            State.ACTIVE -> {
                indicator.icon = AllIcons.Process.Step_1
                textLabel.foreground = ACCENT
            }
            State.DONE -> {
                indicator.icon = AllIcons.RunConfigurations.TestPassed
                textLabel.foreground = STEP_DONE
            }
            State.ERROR -> {
                indicator.icon = AllIcons.RunConfigurations.TestFailed
                textLabel.foreground = RED
            }
        }
    }
}
