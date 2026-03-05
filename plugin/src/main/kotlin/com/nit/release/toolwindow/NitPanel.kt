package com.nit.release.toolwindow

import com.intellij.icons.AllIcons
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.ui.JBColor
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBScrollPane
import com.intellij.util.ui.JBUI
import com.intellij.util.ui.UIUtil
import com.nit.release.services.NitOutputListener
import com.nit.release.services.NitProcessRunner
import java.awt.*
import javax.swing.*
import javax.swing.text.SimpleAttributeSet
import javax.swing.text.StyleConstants
import javax.swing.text.StyledDocument

/**
 * Nit Release tool window panel.
 *
 * Layout (top → bottom):
 *   [Header]   Publish / Stop buttons
 *   [Progress] Active pipeline step label
 *   [Log]      Scrollable live output stream (styled, no logo spam, no changelog)
 *   [Result]   Outcome banner, shown after each run
 */
class NitPanel(private val project: Project) : JPanel(BorderLayout()), NitOutputListener {

    private val runner = NitProcessRunner(project)

    private val publishButton = actionButton("Publish", AllIcons.Actions.Execute, isPrimary = true)
    private val stopButton    = actionButton("Stop",    AllIcons.Actions.Suspend,  isPrimary = false)
        .apply { isVisible = false }

    private val stepLabel = JBLabel("Ready").apply {
        font       = JBUI.Fonts.smallFont()
        foreground = UIUtil.getContextHelpForeground()
        border     = JBUI.Borders.empty(0, 14, 4, 14)
    }

    private val logPane = JTextPane().apply {
        isEditable  = false
        background  = UIUtil.getPanelBackground()
        font        = Font(Font.MONOSPACED, Font.PLAIN, JBUI.scaleFontSize(11f).toInt())
        border      = JBUI.Borders.empty(6, 10)
    }

    private val resultBanner = ResultBanner()

    private val changelogLines  = mutableListOf<String>()
    private val errorLines      = mutableListOf<String>()
    private var capturingChangelog = false
    private var changelogDone      = false
    private var releaseSkipped     = false
    // Tracks whether the one-time styled header has been printed for this run.
    private var headerPrinted      = false

    init {
        background = UIUtil.getPanelBackground()
        border     = JBUI.Borders.empty()
        runner.setOutputListener(this)

        publishButton.addActionListener { launch() }
        stopButton.addActionListener    { runner.stop(); onStopped() }

        add(buildHeader(), BorderLayout.NORTH)
        add(buildCenter(), BorderLayout.CENTER)
    }

    // ── Layout ────────────────────────────────────────────────────────────

    private fun buildHeader() = JPanel(BorderLayout()).apply {
        isOpaque = false
        border   = JBUI.Borders.empty(8, 8, 4, 8)
        add(JPanel(FlowLayout(FlowLayout.LEFT, 6, 0)).apply {
            isOpaque = false
            add(publishButton)
            add(stopButton)
        }, BorderLayout.WEST)
    }

    private fun buildCenter() = JPanel(BorderLayout()).apply {
        isOpaque = false
        add(stepLabel, BorderLayout.NORTH)
        add(JBScrollPane(logPane).apply {
            border                    = JBUI.Borders.customLine(JBColor.border(), 1, 0, 0, 0)
            horizontalScrollBarPolicy = JScrollPane.HORIZONTAL_SCROLLBAR_NEVER
        }, BorderLayout.CENTER)
        add(resultBanner, BorderLayout.SOUTH)
    }

    // ── Run lifecycle ─────────────────────────────────────────────────────

    private fun launch() {
        if (runner.isRunning) return
        resetState()
        setRunning(true)
        stepLabel.text       = "Starting…"
        stepLabel.foreground = NitTheme.BLUE
        runner.execute()
    }

    private fun resetState() {
        resultBanner.reset()
        logPane.text = ""
        changelogLines.clear()
        errorLines.clear()
        capturingChangelog = false
        changelogDone      = false
        releaseSkipped     = false
        headerPrinted      = false
    }

    private fun setRunning(on: Boolean) {
        publishButton.isEnabled = !on
        stopButton.isVisible    = on
    }

    private fun onStopped() {
        setRunning(false)
        stepLabel.text       = "Stopped"
        stepLabel.foreground = UIUtil.getContextHelpForeground()
        appendStyledLog("Process stopped.", LogLevel.WARN, "Stop")
    }

    // ── NitOutputListener ─────────────────────────────────────────────────

    override fun onOutputLine(cleanLine: String) {
        ApplicationManager.getApplication().invokeLater {
            val trimmed = cleanLine.trim()
            if (trimmed.isEmpty()) return@invokeLater

            // Suppress ASCII logo lines — they are box-drawing art from the CLI header.
            if (isLogoLine(trimmed)) {
                // Print a single styled "Nit Release" header in place of the raw ASCII block.
                if (!headerPrinted) {
                    headerPrinted = true
                    appendRunHeader()
                }
                return@invokeLater
            }

            // Capture changelog lines for the result banner; never show them in the log pane.
            if (capturingChangelog && !changelogDone) {
                if (trimmed.startsWith("- ") || trimmed.startsWith("## [")) {
                    changelogLines.add(trimmed)
                    return@invokeLater
                } else {
                    capturingChangelog = false
                    changelogDone      = true
                }
            }
            if (!changelogDone && trimmed.startsWith("## [")) {
                capturingChangelog = true
                changelogLines.add(trimmed)
                return@invokeLater
            }

            if (isErrorLine(trimmed)) errorLines.add(trimmed)

            val level = when {
                isErrorLine(trimmed) -> LogLevel.ERROR
                isSkipLine(trimmed)  -> LogLevel.WARN
                else                 -> LogLevel.INFO
            }

            val step = matchStep(cleanLine)
            appendStyledLog(trimmed, level, step?.label)

            when {
                step == null -> return@invokeLater
                isSkipLine(cleanLine) -> {
                    releaseSkipped       = true
                    stepLabel.text       = "No changes to release"
                    stepLabel.foreground = NitTheme.WARN
                    setRunning(false)
                }
                isErrorLine(cleanLine) -> {
                    stepLabel.text       = "${step.label} failed"
                    stepLabel.foreground = NitTheme.DANGER
                }
                else -> {
                    stepLabel.text       = step.label
                    stepLabel.foreground = NitTheme.BLUE
                }
            }
        }
    }

    override fun onProcessFinished(exitCode: Int) {
        ApplicationManager.getApplication().invokeLater {
            val changelog = changelogLines.takeIf { it.isNotEmpty() }?.joinToString("\n")

            when {
                releaseSkipped -> {
                    stepLabel.text       = "Skipped"
                    stepLabel.foreground = NitTheme.WARN
                    resultBanner.show(ResultOutcome.SKIPPED, "No changes detected — release skipped", null)
                }
                exitCode == 0 -> {
                    stepLabel.text       = "Published"
                    stepLabel.foreground = NitTheme.SUCCESS
                    resultBanner.show(ResultOutcome.SUCCESS, "Release published successfully", changelog)
                }
                else -> {
                    val errorSummary = errorLines.lastOrNull() ?: "Release failed"
                    stepLabel.text       = errorSummary
                    stepLabel.foreground = NitTheme.DANGER
                    resultBanner.show(
                        ResultOutcome.FAILURE, "Release failed",
                        errorLines.takeIf { it.isNotEmpty() }?.joinToString("\n")
                    )
                }
            }

            revalidate()
            repaint()
            setRunning(false)
        }
    }

    // ── Log helpers ───────────────────────────────────────────────────────

    private enum class LogLevel { INFO, WARN, ERROR }

    /** Appends a single styled "Nit Release" header row at the top of the log pane. */
    private fun appendRunHeader() {
        val doc      = logPane.styledDocument
        val baseFont = logPane.font

        doc.insertStyledText("\n  Nit Release\n", SimpleAttributeSet().apply {
            StyleConstants.setForeground(this, NitTheme.BLUE)
            StyleConstants.setBold(this, true)
            StyleConstants.setFontFamily(this, baseFont.family)
            StyleConstants.setFontSize(this, baseFont.size + 2)
        })
        doc.insertStyledText("  ───────────────────────────────────────\n\n", SimpleAttributeSet().apply {
            StyleConstants.setForeground(this, JBColor(Color(0xCCCCCC), Color(0x444444)))
            StyleConstants.setFontFamily(this, baseFont.family)
            StyleConstants.setFontSize(this, baseFont.size)
        })
        logPane.caretPosition = doc.length
    }

    /**
     * Appends a styled log row with a fixed-width step badge and a `▸` separator:
     *   Build        ▸  Running production build...
     *
     * Strips any leading `▸` the CLI already emits so the separator never doubles up.
     */
    private fun appendStyledLog(message: String, level: LogLevel, stepLabel: String?) {
        val doc      = logPane.styledDocument
        val baseFont = logPane.font
        // The CLI prefixes every status line with "▸ " — strip it so our own separator is the only one.
        val displayMessage = message.trimStart().removePrefix("▸").trimStart()

        val badgeColor = when (level) {
            LogLevel.INFO  -> NitTheme.BLUE
            LogLevel.WARN  -> NitTheme.WARN
            LogLevel.ERROR -> NitTheme.DANGER
        }
        val messageColor = when (level) {
            LogLevel.INFO  -> UIUtil.getLabelForeground()
            LogLevel.WARN  -> NitTheme.WARN
            LogLevel.ERROR -> NitTheme.DANGER
        }
        val dimColor = JBColor(Color(0x888888), Color(0x666666))

        if (stepLabel != null) {
            // Fixed-width badge column: right-pad to 12 chars so messages align.
            doc.insertStyledText("  ${stepLabel.padEnd(12)}", SimpleAttributeSet().apply {
                StyleConstants.setForeground(this, badgeColor)
                StyleConstants.setBold(this, true)
                StyleConstants.setFontFamily(this, baseFont.family)
                StyleConstants.setFontSize(this, baseFont.size)
            })
            doc.insertStyledText("▸  ", SimpleAttributeSet().apply {
                StyleConstants.setForeground(this, dimColor)
                StyleConstants.setFontFamily(this, baseFont.family)
                StyleConstants.setFontSize(this, baseFont.size)
            })
        } else {
            doc.insertStyledText("  ", SimpleAttributeSet())
        }

        doc.insertStyledText("$displayMessage\n", SimpleAttributeSet().apply {
            StyleConstants.setForeground(this, messageColor)
            StyleConstants.setFontFamily(this, baseFont.family)
            StyleConstants.setFontSize(this, baseFont.size)
        })

        logPane.caretPosition = doc.length
    }

    private fun StyledDocument.insertStyledText(text: String, attrs: SimpleAttributeSet) =
        insertString(length, text, attrs)

    // ── Line classifiers ──────────────────────────────────────────────────

    /**
     * Detects lines that are part of the CLI ASCII logo block.
     * These are box-drawing characters (╗, ║, ╚, etc.) or version lines.
     */
    private fun isLogoLine(line: String): Boolean {
        val logoChars = listOf("█", "╗", "║", "╚", "╔", "═", "╝", "╠", "╣", "╦", "╩")
        return logoChars.any { line.contains(it) } ||
               line.contains("NIT RELEASE", ignoreCase = false) ||
               line.trimStart().all { it == '─' || it == '-' || it == ' ' } && line.length > 5 ||
               line.contains("Automated Release Management") ||
               line.matches(Regex(".*Version \\d+\\.\\d+.*"))
    }

    private fun matchStep(line: String) =
        PIPELINE_STEPS.find { step -> step.triggers.any { line.contains(it, ignoreCase = true) } }

    private fun isErrorLine(line: String): Boolean {
        val lower = line.lowercase()
        // "unavailable, using fallback" is a soft warning — not a fatal error.
        if (lower.contains("unavailable") && lower.contains("fallback")) return false
        return ERROR_KEYWORDS.any { line.contains(it, ignoreCase = true) }
    }

    private fun isSkipLine(line: String) =
        line.contains("No changes detected", ignoreCase = true) ||
        line.contains("Release skipped",     ignoreCase = true)

    private companion object {
        val ERROR_KEYWORDS = listOf(
            "failed", "error", "Release aborted", "Release Failed",
            "not a git repository", "could not find", "ENOENT",
            "permission denied", "EACCES", "timeout", "ETIMEDOUT"
        )
    }
}

// ── Button factory ────────────────────────────────────────────────────────

private fun actionButton(text: String, icon: Icon, isPrimary: Boolean) =
    JButton(text, icon).apply {
        isFocusPainted = false
        if (isPrimary) putClientProperty("JButton.buttonType", "default")
    }

// ── Result banner ─────────────────────────────────────────────────────────

private enum class ResultOutcome { SUCCESS, SKIPPED, FAILURE }

/**
 * Shown at the bottom of the tool window after each run completes.
 * Displays an outcome icon, headline, and an optional collapsible detail pane.
 */
private class ResultBanner : JPanel(BorderLayout()) {

    private val headlineLabel = JBLabel().apply {
        font   = UIUtil.getLabelFont().deriveFont(Font.BOLD)
        border = JBUI.Borders.empty(8, 12, 6, 12)
    }

    private val detailArea = JTextPane().apply {
        isEditable  = false
        contentType = "text/html"
        border      = JBUI.Borders.empty(4, 12, 8, 12)
    }

    private val detailScroll = JBScrollPane(detailArea).apply {
        border                    = JBUI.Borders.customLine(JBColor.border(), 1, 0, 0, 0)
        preferredSize             = Dimension(0, 160)
        horizontalScrollBarPolicy = JScrollPane.HORIZONTAL_SCROLLBAR_NEVER
        isVisible                 = false
    }

    init {
        isVisible = false
        border    = JBUI.Borders.customLine(JBColor.border(), 1, 0, 0, 0)
        add(headlineLabel, BorderLayout.NORTH)
        add(detailScroll,  BorderLayout.CENTER)
    }

    fun show(outcome: ResultOutcome, headline: String, detail: String?) {
        val (fg, bg, icon) = when (outcome) {
            ResultOutcome.SUCCESS -> Triple(NitTheme.SUCCESS, NitTheme.SUCCESS_MUTED, AllIcons.General.InspectionsOK)
            ResultOutcome.SKIPPED -> Triple(NitTheme.WARN,    NitTheme.WARN_MUTED,    AllIcons.General.Warning)
            ResultOutcome.FAILURE -> Triple(NitTheme.DANGER,  NitTheme.DANGER_MUTED,  AllIcons.General.Error)
        }
        background               = bg
        isOpaque                 = true
        headlineLabel.text       = headline
        headlineLabel.foreground = fg
        headlineLabel.icon       = icon
        detailArea.background    = bg

        if (detail != null) {
            val fgHex   = "#%06X".format(fg.rgb and 0xFFFFFF)
            val bodyHex = "#%06X".format(UIUtil.getLabelForeground().rgb and 0xFFFFFF)
            val dimHex  = "#888888"
            val htmlLines = detail.lines().joinToString("") { line ->
                val escaped = line
                    .replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;")
                when {
                    line.startsWith("## ") -> "<p style='margin:6px 0 2px 0;font-weight:bold;color:$fgHex;'>${escaped.removePrefix("## ")}</p>"
                    line.startsWith("- ")  -> "<p style='margin:1px 0 1px 12px;color:$bodyHex;'><span style='color:$fgHex;'>▸</span> ${escaped.removePrefix("- ")}</p>"
                    line.isBlank()         -> "<p style='margin:2px 0;'>&nbsp;</p>"
                    else                   -> "<p style='margin:1px 0;color:$dimHex;'>$escaped</p>"
                }
            }
            detailArea.text = """
                <html><body style='font-family:monospace;font-size:11px;padding:4px 0;'>
                $htmlLines
                </body></html>
            """.trimIndent()
            detailScroll.isVisible = true
        } else {
            detailScroll.isVisible = false
        }

        isVisible = true
        revalidate()
        repaint()
    }

    fun reset() {
        isVisible              = false
        headlineLabel.text     = ""
        detailArea.text        = ""
        detailScroll.isVisible = false
    }
}
