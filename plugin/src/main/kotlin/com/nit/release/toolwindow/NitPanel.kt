package com.nit.release.toolwindow

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.util.ui.JBUI
import com.nit.release.settings.AiProvider
import com.nit.release.services.NitOutputListener
import com.nit.release.services.NitProcessRunner
import java.awt.*
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import java.awt.geom.RoundRectangle2D
import javax.swing.*

/**
 * Nit Release tool window — custom-painted, wide-first layout.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ [Publish]                                              status message  │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Result banner + changelog (only when finished)                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
class NitPanel(private val project: Project) : JPanel(BorderLayout()), NitOutputListener {

    private val runner = NitProcessRunner(project)
    private val commandBar = CommandBar()
    private val resultBanner = ResultBanner()

    private val changelogLines = mutableListOf<String>()
    private val errorLines = mutableListOf<String>()
    private var capturingChangelog = false
    private var changelogDone = false
    private var releaseSkipped = false
    private var isRunning = false

    init {
        background = NitTheme.BG
        border = JBUI.Borders.empty()
        runner.setOutputListener(this)

        commandBar.onPublish = { launch(dryRun = false) }

        add(commandBar, BorderLayout.NORTH)
        add(resultBanner, BorderLayout.CENTER)
        resultBanner.isVisible = false
    }

    private fun launch(dryRun: Boolean) {
        if (isRunning) return
        reset()
        isRunning = true
        commandBar.setRunning(true)
        commandBar.statusMessage = "Starting..."
        commandBar.statusColor = NitTheme.BLUE
        if (dryRun) runner.execute("--dry-run") else runner.execute()
    }

    private fun reset() {
        resultBanner.isVisible = false
        resultBanner.clear()
        changelogLines.clear()
        errorLines.clear()
        capturingChangelog = false
        changelogDone = false
        releaseSkipped = false
    }

    private fun finish() {
        isRunning = false
        commandBar.setRunning(false)
    }

    override fun onOutputLine(cleanLine: String) {
        ApplicationManager.getApplication().invokeLater {
            val trimmed = cleanLine.trim()

            if (isErrorLine(trimmed)) errorLines.add(trimmed)

            if (capturingChangelog && !changelogDone) {
                if (trimmed.startsWith("- ") || trimmed.startsWith("## [")) {
                    changelogLines.add(trimmed)
                    return@invokeLater
                } else if (trimmed.isNotEmpty()) {
                    capturingChangelog = false
                    changelogDone = true
                }
            }
            if (!changelogDone && trimmed.startsWith("## [")) {
                capturingChangelog = true
                changelogLines.add(trimmed)
                return@invokeLater
            }

            val step = matchStep(cleanLine) ?: return@invokeLater

            when {
                isSkipLine(cleanLine) -> {
                    releaseSkipped = true
                    commandBar.statusMessage = "No changes to release"
                    commandBar.statusColor = NitTheme.WARN
                    commandBar.setRunning(false)
                }
                isErrorLine(cleanLine) -> {
                    commandBar.statusMessage = "${step.label} failed"
                    commandBar.statusColor = NitTheme.DANGER
                }
                else -> {
                    commandBar.statusMessage = step.label
                    commandBar.statusColor = NitTheme.BLUE
                }
            }
        }
    }

    override fun onProcessFinished(exitCode: Int) {
        ApplicationManager.getApplication().invokeLater {
            if (!releaseSkipped) {
                if (exitCode == 0) {
                    commandBar.statusMessage = "Release published"
                    commandBar.statusColor = NitTheme.SUCCESS
                    val changelog = changelogLines.takeIf { it.isNotEmpty() }?.joinToString("\n")
                    resultBanner.show("Release published successfully", NitTheme.SUCCESS, changelog)
                } else {
                    val errorDetail = errorLines.takeIf { it.isNotEmpty() }?.joinToString("\n")
                    val lastError = errorLines.lastOrNull()
                    val statusText = lastError ?: "Release failed"
                    commandBar.statusMessage = statusText
                    commandBar.statusColor = NitTheme.DANGER
                    resultBanner.show("Release failed", NitTheme.DANGER, errorDetail)
                }
            } else {
                resultBanner.show("No changes to release — skipped", NitTheme.WARN, null)
            }
            resultBanner.isVisible = true
            revalidate()
            repaint()
            finish()
        }
    }

    private fun matchStep(line: String): StepDef? =
        PIPELINE_STEPS.find { step -> step.triggers.any { line.contains(it, ignoreCase = true) } }

    private fun isErrorLine(line: String): Boolean {
        val lower = line.lowercase()
        // "unavailable, using fallback" is a warning, not a fatal error
        if (lower.contains("unavailable") && lower.contains("fallback")) return false
        val ERROR_KEYWORDS = listOf(
            "failed", "error", "Release aborted", "Release Failed",
            "not a git repository", "could not find", "ENOENT",
            "permission denied", "EACCES", "timeout", "ETIMEDOUT"
        )
        return ERROR_KEYWORDS.any { line.contains(it, ignoreCase = true) }
    }

    private fun isSkipLine(line: String) =
        line.contains("No changes detected", true) || line.contains("Release skipped", true)
}


/**
 * Top bar — single Publish button on the left, status message right-aligned.
 */
private class CommandBar : JPanel() {

    var onPublish: (() -> Unit)? = null

    var statusMessage = "Ready"
        set(value) { field = value; repaint() }

    var statusColor: Color = NitTheme.FG_DIM
        set(value) { field = value; repaint() }

    private var running = false
    private var buttonsEnabled = true
    private var publishHit = Rectangle()
    private var publishHover = false

    init {
        isOpaque = true
        background = NitTheme.BG
        preferredSize = Dimension(0, 40)
        border = JBUI.Borders.empty(0, 12)

        addMouseListener(object : MouseAdapter() {
            override fun mouseClicked(e: MouseEvent) {
                if (buttonsEnabled && publishHit.contains(e.point)) onPublish?.invoke()
            }
            override fun mouseExited(e: MouseEvent) {
                if (publishHover) {
                    publishHover = false
                    cursor = Cursor.getDefaultCursor()
                    repaint()
                }
            }
        })
        addMouseMotionListener(object : MouseAdapter() {
            override fun mouseMoved(e: MouseEvent) {
                val was = publishHover
                publishHover = buttonsEnabled && publishHit.contains(e.point)
                cursor = if (publishHover)
                    Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
                else Cursor.getDefaultCursor()
                if (was != publishHover) repaint()
            }
        })
    }

    fun setRunning(on: Boolean) {
        running = on
        buttonsEnabled = !on
        repaint()
    }

    override fun paintComponent(g: Graphics) {
        super.paintComponent(g)
        val g2 = (g.create() as Graphics2D).apply {
            setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
            setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_LCD_HRGB)
        }

        val midY = height / 2
        val fm = g2.getFontMetrics(NitTheme.FONT_SMALL)

        // Publish button (left)
        publishHit = paintPill(g2, "Publish", insets.left + 2, midY, NitTheme.BLUE, publishHover, buttonsEnabled)

        // Status message (right-aligned)
        g2.font = NitTheme.FONT_SMALL
        g2.color = statusColor
        val textWidth = fm.stringWidth(statusMessage)
        g2.drawString(statusMessage, width - insets.right - textWidth - 4, midY + fm.ascent / 2 - 1)

        g2.dispose()
    }

    private fun paintPill(
        g2: Graphics2D, text: String, x: Int, midY: Int,
        color: Color, hovered: Boolean, enabled: Boolean
    ): Rectangle {
        val fm = g2.getFontMetrics(NitTheme.FONT_SMALL)
        val textW = fm.stringWidth(text)
        val padX = 14
        val h = 24
        val w = textW + padX * 2
        val top = midY - h / 2

        val bg = when {
            !enabled -> NitTheme.BORDER
            hovered -> brighten(color, 0.1f)
            else -> color
        }

        g2.color = bg
        g2.fill(RoundRectangle2D.Float(x.toFloat(), top.toFloat(), w.toFloat(), h.toFloat(), 8f, 8f))

        g2.font = NitTheme.FONT_SMALL.deriveFont(Font.BOLD)
        g2.color = if (!enabled) NitTheme.FG_MUTED else Color.WHITE
        g2.drawString(text, x + padX, midY + fm.ascent / 2 - 1)

        return Rectangle(x, top, w, h)
    }

    private fun brighten(c: Color, amount: Float): Color {
        val hsb = Color.RGBtoHSB(c.red, c.green, c.blue, null)
        hsb[2] = (hsb[2] + amount).coerceAtMost(1f)
        return Color(Color.HSBtoRGB(hsb[0], hsb[1], hsb[2]))
    }
}


/**
 * Bottom result area — only visible after a run finishes.
 * Shows a colored banner with outcome text and optional changelog.
 */
private class ResultBanner : JPanel(BorderLayout()) {

    private val messageLabel = JLabel().apply {
        font = NitTheme.FONT_BODY.deriveFont(Font.BOLD)
        border = JBUI.Borders.empty(6, 14)
    }

    private val changelogArea = JTextArea().apply {
        font = NitTheme.FONT_MONO
        foreground = NitTheme.FG
        isEditable = false
        lineWrap = true
        wrapStyleWord = true
        border = JBUI.Borders.empty(4, 14, 8, 14)
    }

    private val changelogScroll = JScrollPane(changelogArea).apply {
        border = BorderFactory.createMatteBorder(1, 0, 0, 0, NitTheme.BORDER)
        preferredSize = Dimension(0, 100)
        isOpaque = false
        viewport.isOpaque = false
    }

    init {
        isOpaque = false
        border = JBUI.Borders.empty(2, 12, 6, 12)
        add(messageLabel, BorderLayout.NORTH)
        add(changelogScroll, BorderLayout.CENTER)
        changelogScroll.isVisible = false
    }

    fun show(message: String, accent: Color, changelog: String?) {
        val bgColor = mutedColor(accent)
        messageLabel.text = message
        messageLabel.foreground = accent
        changelogArea.background = bgColor
        background = bgColor
        isOpaque = true

        if (changelog != null) {
            changelogArea.text = changelog
            changelogScroll.isVisible = true
        } else {
            changelogScroll.isVisible = false
        }
        revalidate()
        repaint()
    }

    fun clear() {
        isOpaque = false
        messageLabel.text = ""
        changelogArea.text = ""
        changelogScroll.isVisible = false
    }

    override fun paintComponent(g: Graphics) {
        if (!isOpaque) return
        val g2 = (g.create() as Graphics2D).apply {
            setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        }
        g2.color = background
        g2.fill(RoundRectangle2D.Float(0f, 0f, width.toFloat(), height.toFloat(), 8f, 8f))
        g2.dispose()
    }

    private fun mutedColor(accent: Color): Color = when (accent) {
        NitTheme.SUCCESS -> NitTheme.SUCCESS_MUTED
        NitTheme.DANGER -> NitTheme.DANGER_MUTED
        NitTheme.WARN -> NitTheme.WARN_MUTED
        else -> NitTheme.BLUE_MUTED
    }
}
