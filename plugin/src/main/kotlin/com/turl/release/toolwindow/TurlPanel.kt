package com.turl.release.toolwindow

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBScrollPane
import com.intellij.util.ui.JBUI
import com.turl.release.services.TurlOutputListener
import com.turl.release.services.TurlProcessRunner
import com.turl.release.toolwindow.TurlTheme.BG
import com.turl.release.toolwindow.TurlTheme.BLUE
import com.turl.release.toolwindow.TurlTheme.BLUE_MUTED
import com.turl.release.toolwindow.TurlTheme.BORDER
import com.turl.release.toolwindow.TurlTheme.DANGER
import com.turl.release.toolwindow.TurlTheme.DANGER_MUTED
import com.turl.release.toolwindow.TurlTheme.FG
import com.turl.release.toolwindow.TurlTheme.FG_DIM
import com.turl.release.toolwindow.TurlTheme.FG_MUTED
import com.turl.release.toolwindow.TurlTheme.FONT_BODY
import com.turl.release.toolwindow.TurlTheme.FONT_MONO
import com.turl.release.toolwindow.TurlTheme.FONT_SMALL
import com.turl.release.toolwindow.TurlTheme.SUCCESS
import com.turl.release.toolwindow.TurlTheme.SUCCESS_MUTED
import com.turl.release.toolwindow.TurlTheme.SURFACE
import com.turl.release.toolwindow.TurlTheme.WARN
import com.turl.release.toolwindow.TurlTheme.WARN_MUTED
import java.awt.*
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import java.awt.geom.RoundRectangle2D
import javax.swing.*

/**
 * The entire TURL Release tool window UI.
 *
 * Single-panel, wide horizontal layout optimised for WebStorm's bottom bar:
 * [Actions | Step Indicators | Result/Changelog]
 */
class TurlPanel(private val project: Project) : JPanel(BorderLayout()), TurlOutputListener {

    private val runner = TurlProcessRunner(project)

    private val stepTracker = StepTracker()
    private val resultCard = ResultCard()

    private val publishButton = ActionButton("Publish Release", "Run the full release pipeline: bump, changelog, commit, push", BLUE)
    private val previewButton = ActionButton("Preview", "Simulate everything without making any changes", SURFACE)

    private val statusDot = StatusDot()
    private val statusText = JLabel("Idle").apply { font = FONT_SMALL; foreground = FG_DIM }

    private val changelogLines = mutableListOf<String>()
    private var capturingChangelog = false
    private var changelogDone = false
    private var releaseSkipped = false
    private var isRunning = false

    init {
        background = BG
        border = JBUI.Borders.empty(8, 12)
        runner.setOutputListener(this)
        assembleLayout()
        wireButtons()
    }

    private fun assembleLayout() {
        // Left: status badge + buttons stacked vertically
        val actionsColumn = Box.createVerticalBox().apply {
            border = JBUI.Borders.emptyRight(16)

            val statusRow = JPanel(FlowLayout(FlowLayout.LEFT, 6, 0)).apply {
                isOpaque = false
                maximumSize = Dimension(Int.MAX_VALUE, 20)
                alignmentX = LEFT_ALIGNMENT
                add(statusDot)
                add(statusText)
            }
            add(statusRow)
            add(Box.createVerticalStrut(8))

            val buttonsRow = JPanel(FlowLayout(FlowLayout.LEFT, 6, 0)).apply {
                isOpaque = false
                maximumSize = Dimension(Int.MAX_VALUE, 36)
                alignmentX = LEFT_ALIGNMENT
                add(publishButton)
                add(previewButton)
            }
            add(buttonsRow)
            add(Box.createVerticalGlue())
        }

        // Center: horizontal step indicator strip
        val stepsPane = JPanel(BorderLayout()).apply {
            isOpaque = false
            border = JBUI.Borders.empty(0, 8)
            add(stepTracker, BorderLayout.CENTER)
        }

        // Right: result / changelog card (hidden until needed)
        val resultPane = JPanel(BorderLayout()).apply {
            isOpaque = false
            border = JBUI.Borders.emptyLeft(12)
            preferredSize = Dimension(280, 0)
            add(resultCard, BorderLayout.CENTER)
            isVisible = false
        }

        val main = JPanel(BorderLayout()).apply {
            isOpaque = false
            add(actionsColumn, BorderLayout.WEST)
            add(stepsPane, BorderLayout.CENTER)
            add(resultPane, BorderLayout.EAST)
        }

        add(main, BorderLayout.CENTER)
    }

    private fun wireButtons() {
        publishButton.addActionListener { launch(dryRun = false) }
        previewButton.addActionListener { launch(dryRun = true) }
    }

    private fun launch(dryRun: Boolean) {
        if (isRunning) return
        reset()
        isRunning = true
        setStatus("Running", BLUE)
        stepTracker.setAnimating(true)
        publishButton.isEnabled = false
        previewButton.isEnabled = false

        if (dryRun) runner.execute("--dry-run") else runner.execute()
    }

    private fun reset() {
        stepTracker.resetAll()
        resultCard.clear()
        (resultCard.parent as? JComponent)?.isVisible = false
        changelogLines.clear()
        capturingChangelog = false
        changelogDone = false
        releaseSkipped = false
    }

    private fun setStatus(text: String, color: Color) {
        statusText.text = text
        statusText.foreground = color
        statusDot.color = color
    }

    private fun idle() {
        isRunning = false
        publishButton.isEnabled = true
        previewButton.isEnabled = true
        stepTracker.setAnimating(false)
    }

    // --- Output parsing ---

    override fun onOutputLine(cleanLine: String) {
        ApplicationManager.getApplication().invokeLater {
            val trimmed = cleanLine.trim()

            // Changelog capture
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
                    stepTracker.markSkippedFrom(step.id)
                    setStatus("Skipped", WARN)
                    showResult("No changes to release", WARN, WARN_MUTED)
                    stepTracker.setAnimating(false)
                }
                isErrorLine(cleanLine) -> {
                    stepTracker.markFailed(step.id)
                    setStatus("Error", DANGER)
                }
                else -> {
                    stepTracker.advanceTo(step.id)
                    setStatus(step.label, BLUE)
                }
            }
        }
    }

    override fun onProcessFinished(exitCode: Int) {
        ApplicationManager.getApplication().invokeLater {
            if (!releaseSkipped) {
                if (exitCode == 0) {
                    stepTracker.completeAll()
                    setStatus("Done", SUCCESS)
                    val cl = if (changelogLines.isNotEmpty()) changelogLines.joinToString("\n") else null
                    showResult("Release published successfully", SUCCESS, SUCCESS_MUTED, cl)
                } else {
                    stepTracker.failActive()
                    setStatus("Failed", DANGER)
                    showResult("Release failed", DANGER, DANGER_MUTED)
                }
            }
            idle()
        }
    }

    private fun showResult(message: String, accentColor: Color, bgColor: Color, changelog: String? = null) {
        resultCard.show(message, accentColor, bgColor, changelog)
        (resultCard.parent as? JComponent)?.isVisible = true
        revalidate()
        repaint()
    }

    private fun matchStep(line: String): StepDef? =
        PIPELINE_STEPS.find { step -> step.triggers.any { line.contains(it, ignoreCase = true) } }

    private fun isErrorLine(line: String) =
        line.contains("failed", true) || line.contains("error", true) || line.contains("Release aborted", true)

    private fun isSkipLine(line: String) =
        line.contains("No changes detected", true) || line.contains("Release skipped", true)
}


// ---------------------------------------------------------------------------
// Step Tracker  — horizontal row of small step chips
// ---------------------------------------------------------------------------

private class StepTracker : JPanel() {

    private data class Chip(val id: StepId, val label: String, var state: StepState = StepState.WAITING)

    private val chips = PIPELINE_STEPS.map { Chip(it.id, it.label) }
    private var animating = false
    private var tick = 0f

    private val animator = Timer(40) {
        tick = (tick + 0.06f) % 1f
        repaint()
    }

    init {
        isOpaque = false
        preferredSize = Dimension(0, 48)
        minimumSize = Dimension(200, 44)
    }

    fun setAnimating(on: Boolean) {
        animating = on
        if (on) animator.start() else animator.stop()
        repaint()
    }

    fun resetAll() {
        chips.forEach { it.state = StepState.WAITING }
        animating = false
        animator.stop()
        repaint()
    }

    fun advanceTo(target: StepId) {
        val idx = chips.indexOfFirst { it.id == target }.takeIf { it >= 0 } ?: return
        chips.forEachIndexed { i, c ->
            if (c.state == StepState.FAILED || c.state == StepState.SKIPPED) return@forEachIndexed
            when {
                i < idx -> c.state = StepState.DONE
                i == idx -> c.state = StepState.RUNNING
            }
        }
        repaint()
    }

    fun markSkippedFrom(id: StepId) {
        val idx = chips.indexOfFirst { it.id == id }.takeIf { it >= 0 } ?: return
        chips.forEachIndexed { i, c ->
            when {
                i < idx && c.state != StepState.DONE -> c.state = StepState.DONE
                i >= idx -> c.state = StepState.SKIPPED
            }
        }
        repaint()
    }

    fun markFailed(id: StepId) {
        val idx = chips.indexOfFirst { it.id == id }.takeIf { it >= 0 } ?: return
        chips.forEachIndexed { i, c ->
            if (i < idx && c.state == StepState.RUNNING) c.state = StepState.DONE
            if (i == idx) c.state = StepState.FAILED
        }
        repaint()
    }

    fun completeAll() {
        chips.forEach { if (it.state != StepState.FAILED && it.state != StepState.SKIPPED) it.state = StepState.DONE }
        repaint()
    }

    fun failActive() {
        chips.filter { it.state == StepState.RUNNING }.forEach { it.state = StepState.FAILED }
        repaint()
    }

    override fun paintComponent(g: Graphics) {
        super.paintComponent(g)
        if (chips.isEmpty()) return
        val g2 = (g.create() as Graphics2D).apply {
            setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
            setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_LCD_HRGB)
        }

        val chipH = 24
        val chipGap = 4
        val fm = g2.getFontMetrics(TurlTheme.FONT_SMALL)
        val labelPadX = 10
        val y = (height - chipH) / 2

        // Connector lines between chips
        var xOffset = 0
        val chipWidths = chips.map { fm.stringWidth(it.label) + labelPadX * 2 }

        for (i in chips.indices) {
            val cw = chipWidths[i]
            val chip = chips[i]

            val bgColor = chipBg(chip.state)
            val fgColor = chipFg(chip.state)

            // Chip rounded rect
            g2.color = bgColor
            g2.fill(RoundRectangle2D.Float(xOffset.toFloat(), y.toFloat(), cw.toFloat(), chipH.toFloat(), 12f, 12f))

            // Animated border pulse for running step
            if (chip.state == StepState.RUNNING && animating) {
                val alpha = (80 + 80 * kotlin.math.sin(tick * Math.PI * 2)).toInt().coerceIn(40, 160)
                g2.color = Color(BLUE.red, BLUE.green, BLUE.blue, alpha)
                g2.stroke = BasicStroke(1.5f)
                g2.draw(RoundRectangle2D.Float(xOffset.toFloat(), y.toFloat(), cw.toFloat(), chipH.toFloat(), 12f, 12f))
            }

            // Small icon for done/failed/skipped
            val iconX = xOffset + 6
            val iconY = y + chipH / 2
            g2.stroke = BasicStroke(1.5f)
            when (chip.state) {
                StepState.DONE -> {
                    g2.color = TurlTheme.SUCCESS
                    g2.drawLine(iconX, iconY, iconX + 3, iconY + 3)
                    g2.drawLine(iconX + 3, iconY + 3, iconX + 7, iconY - 2)
                }
                StepState.FAILED -> {
                    g2.color = TurlTheme.DANGER
                    g2.drawLine(iconX, iconY - 3, iconX + 6, iconY + 3)
                    g2.drawLine(iconX + 6, iconY - 3, iconX, iconY + 3)
                }
                StepState.SKIPPED -> {
                    g2.color = TurlTheme.WARN
                    g2.drawLine(iconX + 1, iconY, iconX + 6, iconY)
                }
                else -> {}
            }

            // Label
            g2.font = TurlTheme.FONT_SMALL
            g2.color = fgColor
            val textX = if (chip.state in listOf(StepState.DONE, StepState.FAILED, StepState.SKIPPED)) {
                xOffset + 16
            } else {
                xOffset + labelPadX
            }
            g2.drawString(chip.label, textX, y + chipH / 2 + fm.ascent / 2 - 1)

            // Connector arrow
            xOffset += cw + chipGap
            if (i < chips.size - 1) {
                g2.color = TurlTheme.BORDER
                g2.stroke = BasicStroke(1f)
                val arrowY = y + chipH / 2
                g2.drawLine(xOffset - chipGap, arrowY, xOffset, arrowY)
                xOffset += chipGap
            }
        }

        g2.dispose()
    }

    private fun chipBg(state: StepState): Color = when (state) {
        StepState.DONE -> TurlTheme.SUCCESS_MUTED
        StepState.RUNNING -> TurlTheme.BLUE_MUTED
        StepState.FAILED -> TurlTheme.DANGER_MUTED
        StepState.SKIPPED -> TurlTheme.WARN_MUTED
        StepState.WAITING -> TurlTheme.SURFACE
    }

    private fun chipFg(state: StepState): Color = when (state) {
        StepState.DONE -> TurlTheme.SUCCESS
        StepState.RUNNING -> TurlTheme.BLUE
        StepState.FAILED -> TurlTheme.DANGER
        StepState.SKIPPED -> TurlTheme.WARN
        StepState.WAITING -> TurlTheme.FG_MUTED
    }
}


// ---------------------------------------------------------------------------
// Result Card — slide-in panel showing outcome + changelog
// ---------------------------------------------------------------------------

private class ResultCard : JPanel(BorderLayout()) {

    private val messageLabel = JLabel().apply {
        font = TurlTheme.FONT_BODY.deriveFont(Font.BOLD)
        border = JBUI.Borders.empty(8, 10)
    }

    private val changelogArea = JTextArea().apply {
        font = FONT_MONO
        lineWrap = true
        wrapStyleWord = true
        isEditable = false
        foreground = FG
        border = JBUI.Borders.empty(6, 10)
    }

    private val changelogScroll = JBScrollPane(changelogArea).apply {
        border = BorderFactory.createMatteBorder(1, 0, 0, 0, BORDER)
        isOpaque = false
        viewport.isOpaque = false
    }

    init {
        isOpaque = false
        add(messageLabel, BorderLayout.NORTH)
        add(changelogScroll, BorderLayout.CENTER)
        changelogScroll.isVisible = false
    }

    fun show(message: String, accentColor: Color, bgColor: Color, changelog: String? = null) {
        background = bgColor
        isOpaque = true
        messageLabel.text = message
        messageLabel.foreground = accentColor

        if (changelog != null) {
            changelogArea.text = changelog
            changelogArea.background = bgColor
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
        if (isOpaque) {
            val g2 = (g.create() as Graphics2D).apply {
                setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
            }
            g2.color = background
            g2.fill(RoundRectangle2D.Float(0f, 0f, width.toFloat(), height.toFloat(), 10f, 10f))
            g2.dispose()
        }
    }
}


// ---------------------------------------------------------------------------
// Action Button — flat, rounded, clean
// ---------------------------------------------------------------------------

private class ActionButton(
    label: String,
    tooltip: String,
    private val baseColor: Color
) : JButton(label) {

    private var hovered = false

    init {
        toolTipText = tooltip
        font = TurlTheme.FONT_BODY.deriveFont(Font.BOLD)
        foreground = if (baseColor == SURFACE) FG else Color.WHITE
        cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
        isFocusPainted = false
        isContentAreaFilled = false
        isBorderPainted = false
        border = JBUI.Borders.empty(6, 16)

        addMouseListener(object : MouseAdapter() {
            override fun mouseEntered(e: MouseEvent) { hovered = true; repaint() }
            override fun mouseExited(e: MouseEvent) { hovered = false; repaint() }
        })
    }

    override fun paintComponent(g: Graphics) {
        val g2 = (g.create() as Graphics2D).apply {
            setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        }

        val bg = when {
            !isEnabled -> TurlTheme.BORDER
            hovered -> brighter(baseColor, 0.15f)
            else -> baseColor
        }
        g2.color = bg
        g2.fill(RoundRectangle2D.Float(0f, 0f, width.toFloat(), height.toFloat(), 10f, 10f))

        // Subtle border for secondary (surface-colored) buttons
        if (baseColor == SURFACE) {
            g2.color = TurlTheme.BORDER
            g2.stroke = BasicStroke(1f)
            g2.draw(RoundRectangle2D.Float(0.5f, 0.5f, width - 1f, height - 1f, 10f, 10f))
        }

        foreground = when {
            !isEnabled -> FG_MUTED
            baseColor == SURFACE -> FG
            else -> Color.WHITE
        }
        g2.dispose()
        super.paintComponent(g)
    }

    private fun brighter(c: Color, amount: Float): Color {
        val hsb = Color.RGBtoHSB(c.red, c.green, c.blue, null)
        hsb[2] = (hsb[2] + amount).coerceAtMost(1f)
        val rgb = Color.HSBtoRGB(hsb[0], hsb[1], hsb[2])
        return Color(rgb)
    }
}


// ---------------------------------------------------------------------------
// Status Dot — small colored circle next to status text
// ---------------------------------------------------------------------------

private class StatusDot : JComponent() {
    var color: Color = FG_MUTED
        set(value) { field = value; repaint() }

    init {
        preferredSize = Dimension(8, 8)
        minimumSize = Dimension(8, 8)
        maximumSize = Dimension(8, 8)
    }

    override fun paintComponent(g: Graphics) {
        val g2 = (g.create() as Graphics2D).apply {
            setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        }
        g2.color = color
        g2.fillOval(0, 0, 8, 8)
        g2.dispose()
    }
}

