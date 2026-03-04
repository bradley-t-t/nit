package com.turl.release.toolwindow

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.util.ui.JBUI
import com.turl.release.services.TurlOutputListener
import com.turl.release.services.TurlProcessRunner
import java.awt.*
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import java.awt.geom.Ellipse2D
import java.awt.geom.RoundRectangle2D
import javax.swing.*

/**
 * TURL Release tool window — completely custom-painted, wide-first layout.
 *
 * Visual structure (all on one horizontal plane):
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ [Publish] [Preview]  │  ● ● ● ● ● ● ● ● ●  │  status message        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Result banner + changelog (only when finished)                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
class TurlPanel(private val project: Project) : JPanel(BorderLayout()), TurlOutputListener {

    private val runner = TurlProcessRunner(project)
    private val commandBar = CommandBar()
    private val resultBanner = ResultBanner()

    private val changelogLines = mutableListOf<String>()
    private var capturingChangelog = false
    private var changelogDone = false
    private var releaseSkipped = false
    private var isRunning = false

    init {
        background = TurlTheme.BG
        border = JBUI.Borders.empty()
        runner.setOutputListener(this)

        commandBar.onPublish = { launch(dryRun = false) }
        commandBar.onPreview = { launch(dryRun = true) }

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
        commandBar.statusColor = TurlTheme.BLUE
        if (dryRun) runner.execute("--dry-run") else runner.execute()
    }

    private fun reset() {
        commandBar.resetSteps()
        resultBanner.isVisible = false
        resultBanner.clear()
        changelogLines.clear()
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
                    commandBar.skipFrom(step.id)
                    commandBar.statusMessage = "No changes to release"
                    commandBar.statusColor = TurlTheme.WARN
                    commandBar.setRunning(false)
                }
                isErrorLine(cleanLine) -> {
                    commandBar.failStep(step.id)
                    commandBar.statusMessage = "${step.label} failed"
                    commandBar.statusColor = TurlTheme.DANGER
                }
                else -> {
                    commandBar.advanceTo(step.id)
                    commandBar.statusMessage = step.label
                    commandBar.statusColor = TurlTheme.BLUE
                }
            }
        }
    }

    override fun onProcessFinished(exitCode: Int) {
        ApplicationManager.getApplication().invokeLater {
            if (!releaseSkipped) {
                if (exitCode == 0) {
                    commandBar.completeAll()
                    commandBar.statusMessage = "Release published"
                    commandBar.statusColor = TurlTheme.SUCCESS
                    val changelog = changelogLines.takeIf { it.isNotEmpty() }?.joinToString("\n")
                    resultBanner.show("Release published successfully", TurlTheme.SUCCESS, changelog)
                } else {
                    commandBar.failRunning()
                    commandBar.statusMessage = "Release failed"
                    commandBar.statusColor = TurlTheme.DANGER
                    resultBanner.show("Release failed", TurlTheme.DANGER, null)
                }
            } else {
                resultBanner.show("No changes to release — skipped", TurlTheme.WARN, null)
            }
            resultBanner.isVisible = true
            revalidate()
            repaint()
            finish()
        }
    }

    private fun matchStep(line: String): StepDef? =
        PIPELINE_STEPS.find { step -> step.triggers.any { line.contains(it, ignoreCase = true) } }

    private fun isErrorLine(line: String) =
        line.contains("failed", true) || line.contains("error", true) || line.contains("Release aborted", true)

    private fun isSkipLine(line: String) =
        line.contains("No changes detected", true) || line.contains("Release skipped", true)
}


/**
 * The entire top bar — custom painted, no child Swing components.
 * Contains: two pill buttons, step dots with labels, and a status message — all in one 40px row.
 */
private class CommandBar : JPanel() {

    var onPublish: (() -> Unit)? = null
    var onPreview: (() -> Unit)? = null

    var statusMessage = "Ready"
        set(value) { field = value; repaint() }

    var statusColor: Color = TurlTheme.FG_DIM
        set(value) { field = value; repaint() }

    private data class Dot(val id: StepId, val label: String, var state: StepState = StepState.WAITING)

    private val dots = PIPELINE_STEPS.map { Dot(it.id, it.label) }
    private var running = false
    private var pulse = 0f
    private var buttonsEnabled = true

    private var publishHit = Rectangle()
    private var previewHit = Rectangle()
    private var publishHover = false
    private var previewHover = false

    private val pulseTimer = Timer(45) {
        pulse = (pulse + 0.07f) % 1f
        repaint()
    }

    init {
        isOpaque = true
        background = TurlTheme.BG
        preferredSize = Dimension(0, 40)
        border = JBUI.Borders.empty(0, 12)

        addMouseListener(object : MouseAdapter() {
            override fun mouseClicked(e: MouseEvent) {
                if (!buttonsEnabled) return
                when {
                    publishHit.contains(e.point) -> onPublish?.invoke()
                    previewHit.contains(e.point) -> onPreview?.invoke()
                }
            }
            override fun mouseExited(e: MouseEvent) {
                if (publishHover || previewHover) {
                    publishHover = false
                    previewHover = false
                    cursor = Cursor.getDefaultCursor()
                    repaint()
                }
            }
        })
        addMouseMotionListener(object : MouseAdapter() {
            override fun mouseMoved(e: MouseEvent) {
                val wasPub = publishHover
                val wasPre = previewHover
                publishHover = buttonsEnabled && publishHit.contains(e.point)
                previewHover = buttonsEnabled && previewHit.contains(e.point)
                cursor = if (publishHover || previewHover)
                    Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
                else Cursor.getDefaultCursor()
                if (wasPub != publishHover || wasPre != previewHover) repaint()
            }
        })
    }

    fun setRunning(on: Boolean) {
        running = on
        buttonsEnabled = !on
        if (on) pulseTimer.start() else pulseTimer.stop()
        repaint()
    }

    fun resetSteps() {
        dots.forEach { it.state = StepState.WAITING }
        statusMessage = "Ready"
        statusColor = TurlTheme.FG_DIM
        repaint()
    }

    fun advanceTo(target: StepId) {
        val idx = dots.indexOfFirst { it.id == target }.takeIf { it >= 0 } ?: return
        dots.forEachIndexed { i, d ->
            if (d.state == StepState.FAILED || d.state == StepState.SKIPPED) return@forEachIndexed
            when {
                i < idx -> d.state = StepState.DONE
                i == idx -> d.state = StepState.RUNNING
            }
        }
        repaint()
    }

    fun skipFrom(id: StepId) {
        val idx = dots.indexOfFirst { it.id == id }.takeIf { it >= 0 } ?: return
        dots.forEachIndexed { i, d ->
            when {
                i < idx && d.state != StepState.DONE -> d.state = StepState.DONE
                i >= idx -> d.state = StepState.SKIPPED
            }
        }
        repaint()
    }

    fun failStep(id: StepId) {
        val idx = dots.indexOfFirst { it.id == id }.takeIf { it >= 0 } ?: return
        dots.forEachIndexed { i, d ->
            if (i < idx && d.state == StepState.RUNNING) d.state = StepState.DONE
            if (i == idx) d.state = StepState.FAILED
        }
        repaint()
    }

    fun completeAll() {
        dots.forEach { if (it.state != StepState.FAILED && it.state != StepState.SKIPPED) it.state = StepState.DONE }
        repaint()
    }

    fun failRunning() {
        dots.filter { it.state == StepState.RUNNING }.forEach { it.state = StepState.FAILED }
        repaint()
    }

    override fun paintComponent(g: Graphics) {
        super.paintComponent(g)
        val g2 = (g.create() as Graphics2D).apply {
            setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
            setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_LCD_HRGB)
        }

        val midY = height / 2
        var x = insets.left + 2

        // --- Publish button ---
        val (pubRect, pubEndX) = paintPill(g2, "Publish", x, midY, TurlTheme.BLUE, publishHover, buttonsEnabled, filled = true)
        publishHit = pubRect
        x = pubEndX + 8

        // --- Preview button ---
        val (preRect, preEndX) = paintPill(g2, "Preview", x, midY, TurlTheme.SURFACE, previewHover, buttonsEnabled, filled = false)
        previewHit = preRect
        x = preEndX + 20

        // --- Vertical separator ---
        g2.color = TurlTheme.BORDER
        g2.fillRect(x, midY - 8, 1, 16)
        x += 16

        // --- Step dots with labels and connectors ---
        val dotRadius = 4
        val dotSpacing = 22
        val fm = g2.getFontMetrics(TurlTheme.FONT_SMALL)

        for ((i, dot) in dots.withIndex()) {
            val dotColor = when (dot.state) {
                StepState.DONE -> TurlTheme.SUCCESS
                StepState.RUNNING -> TurlTheme.BLUE
                StepState.FAILED -> TurlTheme.DANGER
                StepState.SKIPPED -> TurlTheme.WARN
                StepState.WAITING -> TurlTheme.BORDER
            }

            val cx = x + dotRadius
            val cy = midY

            // Pulse ring for the currently running dot
            if (dot.state == StepState.RUNNING && running) {
                val ringAlpha = (50 + 70 * kotlin.math.sin(pulse * Math.PI * 2)).toInt().coerceIn(20, 120)
                g2.color = Color(TurlTheme.BLUE.red, TurlTheme.BLUE.green, TurlTheme.BLUE.blue, ringAlpha)
                val ringR = dotRadius + 4
                g2.fill(Ellipse2D.Float((cx - ringR).toFloat(), (cy - ringR).toFloat(), (ringR * 2).toFloat(), (ringR * 2).toFloat()))
            }

            g2.color = dotColor
            g2.fill(Ellipse2D.Float((cx - dotRadius).toFloat(), (cy - dotRadius).toFloat(), (dotRadius * 2).toFloat(), (dotRadius * 2).toFloat()))

            // Micro checkmark / X inside dots for done/failed states
            g2.stroke = BasicStroke(1.4f)
            when (dot.state) {
                StepState.DONE -> {
                    g2.color = TurlTheme.SUCCESS_MUTED
                    g2.drawLine(cx - 2, cy, cx - 1, cy + 2)
                    g2.drawLine(cx - 1, cy + 2, cx + 2, cy - 1)
                }
                StepState.FAILED -> {
                    g2.color = TurlTheme.DANGER_MUTED
                    g2.drawLine(cx - 2, cy - 2, cx + 2, cy + 2)
                    g2.drawLine(cx + 2, cy - 2, cx - 2, cy + 2)
                }
                else -> {}
            }

            // Tiny label below each dot
            g2.font = Font(TurlTheme.FONT_SMALL.family, Font.PLAIN, 9)
            g2.color = if (dot.state == StepState.WAITING) TurlTheme.FG_MUTED else dotColor
            val labelW = g2.fontMetrics.stringWidth(dot.label)
            g2.drawString(dot.label, cx - labelW / 2, cy + dotRadius + 11)

            // Connector line to next dot
            if (i < dots.size - 1) {
                val lineStartX = cx + dotRadius + 1
                val lineEndX = x + dotSpacing + dotRadius * 2 + dotRadius - 1
                val nextDone = dots[i + 1].state in listOf(StepState.DONE, StepState.RUNNING)
                g2.color = if (dot.state == StepState.DONE && nextDone) TurlTheme.SUCCESS else TurlTheme.BORDER
                g2.stroke = BasicStroke(1f)
                g2.drawLine(lineStartX, cy, lineEndX.coerceAtLeast(lineStartX), cy)
            }

            x += dotSpacing + dotRadius * 2
        }

        x += 16

        // --- Vertical separator ---
        g2.color = TurlTheme.BORDER
        g2.fillRect(x, midY - 8, 1, 16)
        x += 16

        // --- Status message ---
        g2.font = TurlTheme.FONT_SMALL
        g2.color = statusColor
        g2.drawString(statusMessage, x, midY + fm.ascent / 2 - 1)

        g2.dispose()
    }

    /** Paints a small pill-shaped button and returns (hitRect, rightEdgeX). */
    private fun paintPill(
        g2: Graphics2D, text: String, x: Int, midY: Int,
        color: Color, hovered: Boolean, enabled: Boolean, filled: Boolean
    ): Pair<Rectangle, Int> {
        val fm = g2.getFontMetrics(TurlTheme.FONT_SMALL)
        val textW = fm.stringWidth(text)
        val padX = 14
        val h = 24
        val w = textW + padX * 2
        val top = midY - h / 2

        val bg = when {
            !enabled -> TurlTheme.BORDER
            hovered -> brighten(color, 0.1f)
            else -> color
        }

        g2.color = bg
        g2.fill(RoundRectangle2D.Float(x.toFloat(), top.toFloat(), w.toFloat(), h.toFloat(), 8f, 8f))

        if (!filled) {
            g2.color = TurlTheme.BORDER
            g2.stroke = BasicStroke(1f)
            g2.draw(RoundRectangle2D.Float(x + 0.5f, top + 0.5f, w - 1f, h - 1f, 8f, 8f))
        }

        g2.font = TurlTheme.FONT_SMALL.deriveFont(Font.BOLD)
        g2.color = when {
            !enabled -> TurlTheme.FG_MUTED
            filled -> Color.WHITE
            else -> TurlTheme.FG
        }
        g2.drawString(text, x + padX, midY + fm.ascent / 2 - 1)

        return Rectangle(x, top, w, h) to (x + w)
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
        font = TurlTheme.FONT_BODY.deriveFont(Font.BOLD)
        border = JBUI.Borders.empty(6, 14)
    }

    private val changelogArea = JTextArea().apply {
        font = TurlTheme.FONT_MONO
        foreground = TurlTheme.FG
        isEditable = false
        lineWrap = true
        wrapStyleWord = true
        border = JBUI.Borders.empty(4, 14, 8, 14)
    }

    private val changelogScroll = JScrollPane(changelogArea).apply {
        border = BorderFactory.createMatteBorder(1, 0, 0, 0, TurlTheme.BORDER)
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
        TurlTheme.SUCCESS -> TurlTheme.SUCCESS_MUTED
        TurlTheme.DANGER -> TurlTheme.DANGER_MUTED
        TurlTheme.WARN -> TurlTheme.WARN_MUTED
        else -> TurlTheme.BLUE_MUTED
    }
}
