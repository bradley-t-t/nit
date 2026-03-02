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
private val SURFACE: Color = JBColor(Color(252, 252, 253), Color(49, 51, 53))
private val HEADER_BG: Color = JBColor(Color(237, 240, 245), Color(60, 63, 65))
private val BORDER_COLOR: Color = JBColor(Color(218, 220, 224), Color(70, 73, 75))
private val TEXT_PRIMARY: Color = JBColor(Color(45, 48, 52), Color(200, 203, 207))
private val TEXT_SECONDARY: Color = JBColor(Color(108, 112, 118), Color(140, 144, 148))
private val TEXT_MUTED: Color = JBColor(Color(155, 160, 165), Color(105, 108, 112))
private val ACCENT: Color = JBColor(Color(55, 120, 200), Color(90, 155, 230))
private val SUCCESS: Color = JBColor(Color(40, 150, 70), Color(75, 185, 105))
private val ERROR_COLOR: Color = JBColor(Color(200, 55, 55), Color(225, 90, 90))
private val STEP_DONE_FG: Color = JBColor(Color(60, 65, 68), Color(175, 178, 182))
private val STEP_ACTIVE_FG: Color = ACCENT
private val LOG_BG: Color = JBColor(Color(244, 245, 247), Color(40, 42, 44))
private val LOG_FG: Color = JBColor(Color(85, 90, 95), Color(160, 163, 167))
private class TurlPanel(private val project: Project) : JPanel(BorderLayout()), TurlOutputListener {
    private val runner = TurlProcessRunner(project)
    private val statusIcon = JLabel()
    private val statusText = JLabel("Ready")
    private val statusDetail = JLabel("Select an action to begin")
    private val releaseBtn = styledButton("Release", AllIcons.Actions.Execute)
    private val dryRunBtn = styledButton("Dry Run", AllIcons.Actions.Preview)
    private val interactiveBtn = styledButton("Interactive", AllIcons.Actions.RunAll)
    private val stopBtn = styledButton("Stop", AllIcons.Actions.Suspend)
    private val stepsBox = JPanel().apply {
        layout = BoxLayout(this, BoxLayout.Y_AXIS)
        isOpaque = false
    }
    private val logArea = JTextArea().apply {
        isEditable = false
        lineWrap = true
        wrapStyleWord = true
        font = Font("JetBrains Mono", Font.PLAIN, 11)
        background = LOG_BG
        foreground = LOG_FG
        border = JBUI.Borders.empty(8, 12)
    }
    private val stepRows = mutableListOf<StepRow>()
    private var activeStepLabel: String? = null
    private var lastMode: String = ""
    init {
        background = SURFACE
        border = JBUI.Borders.empty()
        runner.setOutputListener(this)
        add(headerSection(), BorderLayout.NORTH)
        val body = JPanel(BorderLayout()).apply { isOpaque = false; border = JBUI.Borders.empty(14, 18, 10, 18) }
        body.add(statusSection(), BorderLayout.NORTH)
        val mid = JPanel(BorderLayout()).apply { isOpaque = false }
        mid.add(buttonRow(), BorderLayout.NORTH)
        mid.add(JBScrollPane(stepsBox).apply {
            border = JBUI.Borders.emptyTop(14)
            isOpaque = false; viewport.isOpaque = false
            horizontalScrollBarPolicy = ScrollPaneConstants.HORIZONTAL_SCROLLBAR_NEVER
        }, BorderLayout.CENTER)
        body.add(mid, BorderLayout.CENTER)
        add(body, BorderLayout.CENTER)
        add(logSection(), BorderLayout.SOUTH)
        wireActions()
        syncButtons()
        setIdle()
    }
    private fun headerSection(): JPanel {
        val p = JPanel(BorderLayout()).apply {
            isOpaque = true; background = HEADER_BG
            border = JBUI.Borders.compound(
                JBUI.Borders.customLine(BORDER_COLOR, 0, 0, 1, 0),
                JBUI.Borders.empty(14, 18, 14, 18)
            )
        }
        val left = JPanel().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS); isOpaque = false
            add(JLabel("TURL Release").apply { font = font.deriveFont(Font.BOLD, 15f); foreground = TEXT_PRIMARY })
            add(Box.createVerticalStrut(2))
            add(JLabel("Automated Release Management").apply { font = font.deriveFont(Font.PLAIN, 11f); foreground = TEXT_MUTED })
        }
        p.add(left, BorderLayout.WEST)
        p.add(JButton(AllIcons.General.Settings).apply {
            isBorderPainted = false; isContentAreaFilled = false; isFocusPainted = false
            cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR); toolTipText = "Settings"
            addActionListener { ShowSettingsUtil.getInstance().showSettingsDialog(project, "TURL Release") }
        }, BorderLayout.EAST)
        return p
    }
    private fun statusSection(): JPanel {
        statusText.font = statusText.font.deriveFont(Font.BOLD, 13f)
        statusDetail.font = statusDetail.font.deriveFont(Font.PLAIN, 11f)
        statusDetail.foreground = TEXT_SECONDARY
        val row = JPanel(FlowLayout(FlowLayout.LEFT, 6, 0)).apply { isOpaque = false; add(statusIcon); add(statusText) }
        return JPanel().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS); isOpaque = false
            add(row); add(Box.createVerticalStrut(3)); add(statusDetail)
        }
    }
    private fun buttonRow(): JPanel = JPanel(FlowLayout(FlowLayout.LEFT, 6, 0)).apply {
        isOpaque = false; border = JBUI.Borders.emptyTop(14)
        add(releaseBtn); add(dryRunBtn); add(interactiveBtn)
        add(Box.createHorizontalStrut(10)); add(stopBtn)
    }
    private fun logSection(): JPanel {
        val w = JPanel(BorderLayout()).apply {
            border = JBUI.Borders.compound(JBUI.Borders.customLine(BORDER_COLOR, 1, 0, 0, 0), JBUI.Borders.empty())
            preferredSize = Dimension(0, 130)
        }
        val hdr = JPanel(BorderLayout()).apply {
            isOpaque = true; background = HEADER_BG; border = JBUI.Borders.empty(5, 14)
            add(JLabel("Output Log").apply { font = font.deriveFont(Font.BOLD, 11f); foreground = TEXT_MUTED }, BorderLayout.WEST)
            add(JButton("Clear").apply {
                isBorderPainted = false; isContentAreaFilled = false; isFocusPainted = false
                font = font.deriveFont(10f); foreground = TEXT_MUTED
                cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
                addActionListener { resetAll() }
            }, BorderLayout.EAST)
        }
        w.add(hdr, BorderLayout.NORTH)
        w.add(JBScrollPane(logArea), BorderLayout.CENTER)
        return w
    }
    private fun styledButton(text: String, icon: Icon) = JButton(text, icon).apply {
        isFocusPainted = false; cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
        font = font.deriveFont(Font.PLAIN, 12f); margin = JBUI.insets(6, 14, 6, 14)
    }
    private fun wireActions() {
        releaseBtn.addActionListener { launchRelease("release") }
        dryRunBtn.addActionListener { launchRelease("dry-run", "--dry-run") }
        interactiveBtn.addActionListener { launchRelease("interactive", "--interactive") }
        stopBtn.addActionListener { runner.stop(); syncButtons(); setIdle() }
    }
    private fun launchRelease(mode: String, vararg flags: String) {
        lastMode = mode
        stepRows.clear(); stepsBox.removeAll(); stepsBox.revalidate(); stepsBox.repaint()
        activeStepLabel = null; logArea.text = ""
        setStatus(AllIcons.Process.Step_1, "Starting...", ACCENT, "Launching turl-release...")
        syncButtons()
        runner.execute(*flags)
    }
    private fun resetAll() {
        logArea.text = ""; stepRows.clear(); stepsBox.removeAll()
        activeStepLabel = null; stepsBox.revalidate(); stepsBox.repaint()
        setIdle()
    }
    private fun syncButtons() {
        val r = runner.isRunning
        releaseBtn.isEnabled = !r; dryRunBtn.isEnabled = !r; interactiveBtn.isEnabled = !r; stopBtn.isEnabled = r
    }
    private fun setIdle() = setStatus(AllIcons.General.InspectionsOK, "Ready", TEXT_PRIMARY, "Select an action to begin")
    private fun setStatus(icon: Icon, text: String, color: Color, detail: String) {
        statusIcon.icon = icon; statusText.text = text; statusText.foreground = color; statusDetail.text = detail
    }
    private fun isStepLine(line: String): Boolean {
        val knownPrefixes = listOf(
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
        return knownPrefixes.any { line.contains(it, ignoreCase = true) }
    }
    private fun isErrorStep(line: String): Boolean =
        line.contains("failed", ignoreCase = true) || line.contains("error", ignoreCase = true) ||
        line.contains("Release aborted", ignoreCase = true)
    private fun isTerminalStep(line: String): Boolean =
        line.contains("Release Complete", ignoreCase = true) || line.contains("No changes detected", ignoreCase = true) ||
        line.contains("Release skipped", ignoreCase = true) || line.contains("Release aborted", ignoreCase = true)
    private fun completeActiveStep(success: Boolean) {
        stepRows.lastOrNull { it.state == StepRow.State.ACTIVE }?.let {
            it.state = if (success) StepRow.State.DONE else StepRow.State.ERROR
            it.repaint()
        }
    }
    private fun addStep(label: String, state: StepRow.State) {
        val row = StepRow(label, state)
        stepRows.add(row)
        stepsBox.add(row)
        stepsBox.revalidate(); stepsBox.repaint()
        SwingUtilities.invokeLater {
            (SwingUtilities.getAncestorOfClass(JBScrollPane::class.java, stepsBox) as? JBScrollPane)
                ?.verticalScrollBar?.let { it.value = it.maximum }
        }
    }
    override fun onOutputLine(cleanLine: String) {
        ApplicationManager.getApplication().invokeLater {
            logArea.append("$cleanLine\n")
            logArea.caretPosition = logArea.document.length
            if (!isStepLine(cleanLine)) return@invokeLater
            if (isErrorStep(cleanLine)) {
                completeActiveStep(false)
                addStep(cleanLine, StepRow.State.ERROR)
                setStatus(AllIcons.General.Error, "Error", ERROR_COLOR, cleanLine)
                activeStepLabel = null
            } else if (isTerminalStep(cleanLine)) {
                completeActiveStep(true)
                addStep(cleanLine, StepRow.State.DONE)
                activeStepLabel = null
            } else {
                completeActiveStep(true)
                addStep(cleanLine, StepRow.State.ACTIVE)
                activeStepLabel = cleanLine
                setStatus(AllIcons.Process.Step_1, "Running...", ACCENT, cleanLine)
            }
        }
    }
    override fun onProcessFinished(exitCode: Int) {
        ApplicationManager.getApplication().invokeLater {
            completeActiveStep(exitCode == 0)
            if (exitCode == 0) {
                setStatus(AllIcons.RunConfigurations.TestPassed, "Complete", SUCCESS, "All steps finished successfully")
            } else {
                setStatus(AllIcons.RunConfigurations.TestFailed, "Failed", ERROR_COLOR, "Check output log for details")
            }
            syncButtons()
        }
    }
}
private class StepRow(private val label: String, var state: State) : JPanel(BorderLayout()) {
    enum class State { ACTIVE, DONE, ERROR }
    private val iconLabel = JLabel()
    private val textLabel = JLabel(label)
    init {
        isOpaque = false
        maximumSize = Dimension(Int.MAX_VALUE, 30)
        border = JBUI.Borders.empty(3, 0)
        val inner = JPanel(FlowLayout(FlowLayout.LEFT, 8, 0)).apply { isOpaque = false }
        inner.add(iconLabel)
        inner.add(textLabel)
        add(inner, BorderLayout.WEST)
        applyState()
    }
    override fun paintComponent(g: Graphics) {
        applyState()
        super.paintComponent(g)
    }
    private fun applyState() {
        when (state) {
            State.ACTIVE -> {
                iconLabel.icon = AllIcons.Process.Step_1
                textLabel.foreground = STEP_ACTIVE_FG
                textLabel.font = textLabel.font.deriveFont(Font.BOLD, 12f)
            }
            State.DONE -> {
                iconLabel.icon = AllIcons.RunConfigurations.TestPassed
                textLabel.foreground = STEP_DONE_FG
                textLabel.font = textLabel.font.deriveFont(Font.PLAIN, 12f)
            }
            State.ERROR -> {
                iconLabel.icon = AllIcons.RunConfigurations.TestFailed
                textLabel.foreground = ERROR_COLOR
                textLabel.font = textLabel.font.deriveFont(Font.PLAIN, 12f)
            }
        }
    }
}
