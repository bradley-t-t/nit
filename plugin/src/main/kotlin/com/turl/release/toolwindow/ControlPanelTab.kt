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

/**
 * Wide-layout control panel for TURL Release.
 *
 * Layout: action buttons on the left, a segmented subway-line progress rail
 * across the center, and a slide-in changelog result on the right.
 */
class ControlPanelTab(private val project: Project) : JPanel(BorderLayout()), TurlOutputListener {

    private val runner = TurlProcessRunner(project)

    private val statusLabel = JLabel("Ready").apply {
        font = font.deriveFont(Font.BOLD, 13f)
        foreground = TEXT_PRIMARY
    }

    private val hintLabel = JLabel("Publish or preview a release").apply {
        font = font.deriveFont(Font.PLAIN, 10f)
        foreground = TEXT_SECONDARY
    }

    private val releaseBtn = PillButton("\u25B6  Publish", ACCENT, Color.WHITE, true).apply {
        toolTipText = "Bump version, generate changelog, commit, and push a new release"
    }

    private val dryRunBtn = PillButton("\u25CB  Preview", CARD_BG, TEXT_PRIMARY, false).apply {
        toolTipText = "Simulate the full release without making any changes"
    }

    private val cancelBtn = PillButton("\u2715  Stop", PHASE_ERROR_BG, RED, false).apply {
        isVisible = false
    }

    private val trackRail = TrackRail()

    private val changelogLines = mutableListOf<String>()
    private var capturingChangelog = false
    private var changelogComplete = false
    private var releaseSkipped = false

    private val changelogArea = JBTextArea().apply {
        font = Font("JetBrains Mono", Font.PLAIN, 11)
        lineWrap = true
        wrapStyleWord = true
        isEditable = false
        background = CHANGELOG_BG
        foreground = TEXT_PRIMARY
        border = JBUI.Borders.empty(6)
    }

    private val changelogWrapper = JPanel(BorderLayout()).apply {
        isOpaque = false
        isVisible = false
        preferredSize = Dimension(300, 0)
        border = JBUI.Borders.emptyLeft(10)

        val title = JLabel("CHANGELOG").apply {
            font = font.deriveFont(Font.BOLD, 9f)
            foreground = TEXT_SECONDARY
            border = JBUI.Borders.emptyBottom(3)
        }
        val scroll = JBScrollPane(changelogArea).apply {
            border = BorderFactory.createLineBorder(BORDER_SUBTLE, 1, true)
            isOpaque = false
            viewport.isOpaque = false
        }
        add(title, BorderLayout.NORTH)
        add(scroll, BorderLayout.CENTER)
    }

    init {
        background = BG_PRIMARY
        border = JBUI.Borders.empty(6, 10)
        runner.setOutputListener(this)
        buildUI()
        wireActions()
    }

    private fun buildUI() {
        val leftCol = JPanel().apply {
            isOpaque = false
            layout = BoxLayout(this, BoxLayout.Y_AXIS)
            preferredSize = Dimension(170, 0)
            minimumSize = Dimension(150, 0)
            border = JBUI.Borders.emptyRight(12)

            val info = JPanel().apply {
                isOpaque = false
                layout = BoxLayout(this, BoxLayout.Y_AXIS)
                alignmentX = LEFT_ALIGNMENT
                add(statusLabel)
                add(Box.createVerticalStrut(1))
                add(hintLabel)
            }

            val btns = JPanel(FlowLayout(FlowLayout.LEFT, 5, 0)).apply {
                isOpaque = false
                alignmentX = LEFT_ALIGNMENT
                maximumSize = Dimension(Int.MAX_VALUE, 30)
                add(releaseBtn)
                add(dryRunBtn)
                add(cancelBtn)
            }

            add(info)
            add(Box.createVerticalStrut(6))
            add(btns)
            add(Box.createVerticalGlue())
        }

        val centerCol = JPanel(BorderLayout()).apply {
            isOpaque = false
            add(trackRail, BorderLayout.CENTER)
        }

        val root = JPanel(BorderLayout()).apply {
            isOpaque = false
            add(leftCol, BorderLayout.WEST)
            add(centerCol, BorderLayout.CENTER)
            add(changelogWrapper, BorderLayout.EAST)
        }

        add(root, BorderLayout.CENTER)
    }

    private fun wireActions() {
        releaseBtn.addActionListener { launch("release") }
        dryRunBtn.addActionListener { launch("dry-run", "--dry-run") }
        cancelBtn.addActionListener { runner.stop(); idle() }
    }

    private fun launch(mode: String, vararg flags: String) {
        reset()
        val isDry = mode == "dry-run"
        statusLabel.text = if (isDry) "Preview" else "Releasing\u2026"
        statusLabel.foreground = ACCENT
        hintLabel.text = if (isDry) "Simulating (no changes)" else "Pipeline running"
        trackRail.setRunning(true)
        setButtons(running = true)
        runner.execute(*flags)
    }

    private fun reset() {
        trackRail.resetAll()
        releaseSkipped = false
        changelogLines.clear()
        capturingChangelog = false
        changelogComplete = false
        changelogWrapper.isVisible = false
    }

    private fun idle() {
        statusLabel.text = "Ready"
        statusLabel.foreground = TEXT_PRIMARY
        hintLabel.text = "Publish or preview a release"
        trackRail.setRunning(false)
        setButtons(running = false)
    }

    private fun setButtons(running: Boolean) {
        releaseBtn.isEnabled = !running
        dryRunBtn.isEnabled = !running
        cancelBtn.isVisible = running
    }

    private fun findPhase(line: String): PhaseInfo? =
        RELEASE_PHASES.find { p -> p.keywords.any { line.contains(it, ignoreCase = true) } }

    private fun isError(line: String) =
        line.contains("failed", true) || line.contains("error", true) || line.contains("Release aborted", true)

    private fun isSkip(line: String) =
        line.contains("No changes detected", true) || line.contains("Release skipped", true)

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

            val phase = findPhase(cleanLine) ?: return@invokeLater

            when {
                isSkip(cleanLine) -> handleSkip(phase)
                isError(cleanLine) -> handleError(cleanLine, phase)
                else -> handleActive(phase)
            }
        }
    }

    private fun handleActive(phase: PhaseInfo) {
        trackRail.advanceTo(phase.id)
        statusLabel.text = "Running\u2026"
        statusLabel.foreground = ACCENT
        hintLabel.text = phase.label
    }

    private fun handleSkip(phase: PhaseInfo) {
        releaseSkipped = true
        trackRail.markSkippedFrom(phase.id)
        statusLabel.text = "Skipped"
        statusLabel.foreground = AMBER
        hintLabel.text = "No changes to release"
        trackRail.setRunning(false)
    }

    private fun handleError(line: String, phase: PhaseInfo) {
        trackRail.markError(phase.id)
        statusLabel.text = "Error"
        statusLabel.foreground = RED
        hintLabel.text = line
    }

    override fun onProcessFinished(exitCode: Int) {
        ApplicationManager.getApplication().invokeLater {
            trackRail.setRunning(false)

            if (!releaseSkipped) {
                if (exitCode == 0) {
                    trackRail.completeAll()
                    statusLabel.text = "Complete"
                    statusLabel.foreground = GREEN
                    hintLabel.text = "Release finished successfully"
                    showChangelog()
                } else {
                    trackRail.failActive()
                    statusLabel.text = "Failed"
                    statusLabel.foreground = RED
                    if (!(hintLabel.text.contains("failed", true) || hintLabel.text.contains("error", true))) {
                        hintLabel.text = "Release encountered an error"
                    }
                }
            }

            setButtons(running = false)
        }
    }

    private fun showChangelog() {
        if (changelogLines.isEmpty()) return
        changelogArea.text = changelogLines.joinToString("\n")
        changelogWrapper.isVisible = true
        revalidate()
        repaint()
    }
}

/**
 * A horizontal segmented subway-line rail that visualises release phases as
 * connected stops on a track. Each stop is a labeled station with a dot
 * connected by coloured line segments. Designed for wide, shallow panels.
 */
private class TrackRail : JPanel() {

    private data class Stop(val id: PhaseId, val label: String, var state: PhaseState = PhaseState.PENDING)

    private val stops = RELEASE_PHASES.map { Stop(it.id, it.label) }

    private val dotRadius = 5
    private val railHeight = 2
    private var indeterminate = false
    private var pulsePhase = 0f

    private val pulseTimer = Timer(30) {
        pulsePhase = (pulsePhase + 0.04f) % 1f
        repaint()
    }

    init {
        isOpaque = false
        preferredSize = Dimension(0, 52)
        minimumSize = Dimension(200, 48)
    }

    fun setRunning(running: Boolean) {
        indeterminate = running
        if (running) pulseTimer.start() else pulseTimer.stop()
        repaint()
    }

    fun resetAll() {
        stops.forEach { it.state = PhaseState.PENDING }
        indeterminate = false
        pulseTimer.stop()
        repaint()
    }

    fun advanceTo(targetId: PhaseId) {
        val idx = stops.indexOfFirst { it.id == targetId }.takeIf { it >= 0 } ?: return
        stops.forEachIndexed { i, stop ->
            if (stop.state == PhaseState.ERROR || stop.state == PhaseState.SKIPPED) return@forEachIndexed
            when {
                i < idx -> stop.state = PhaseState.DONE
                i == idx -> stop.state = PhaseState.ACTIVE
            }
        }
        repaint()
    }

    fun markSkippedFrom(phaseId: PhaseId) {
        val idx = stops.indexOfFirst { it.id == phaseId }.takeIf { it >= 0 } ?: return
        stops.forEachIndexed { i, stop ->
            when {
                i < idx && stop.state != PhaseState.DONE -> stop.state = PhaseState.DONE
                i >= idx -> stop.state = PhaseState.SKIPPED
            }
        }
        repaint()
    }

    fun markError(phaseId: PhaseId) {
        val idx = stops.indexOfFirst { it.id == phaseId }.takeIf { it >= 0 } ?: return
        stops.forEachIndexed { i, stop ->
            if (i < idx && stop.state == PhaseState.ACTIVE) stop.state = PhaseState.DONE
            if (i == idx) stop.state = PhaseState.ERROR
        }
        repaint()
    }

    fun completeAll() {
        stops.forEach { if (it.state != PhaseState.ERROR && it.state != PhaseState.SKIPPED) it.state = PhaseState.DONE }
        repaint()
    }

    fun failActive() {
        stops.filter { it.state == PhaseState.ACTIVE }.forEach { it.state = PhaseState.ERROR }
        repaint()
    }

    override fun paintComponent(g: Graphics) {
        super.paintComponent(g)
        if (stops.isEmpty()) return

        val g2 = (g.create() as Graphics2D).apply {
            setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
            setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_LCD_HRGB)
        }

        val insetX = 30
        val trackY = 16
        val usableWidth = width - insetX * 2
        val spacing = if (stops.size > 1) usableWidth.toFloat() / (stops.size - 1) else 0f

        // Rail segments between stops
        for (i in 0 until stops.size - 1) {
            val x1 = insetX + (i * spacing).toInt()
            val x2 = insetX + ((i + 1) * spacing).toInt()
            g2.color = segmentColor(stops[i].state)
            g2.fillRoundRect(x1, trackY - railHeight / 2, x2 - x1, railHeight, railHeight, railHeight)
        }

        // Animated pulse glow on the active segment
        if (indeterminate) {
            val activeIdx = stops.indexOfFirst { it.state == PhaseState.ACTIVE }
            if (activeIdx >= 0) {
                val x1 = insetX + (activeIdx * spacing).toInt() - dotRadius
                val x2 = if (activeIdx < stops.size - 1) insetX + ((activeIdx + 1) * spacing).toInt() + dotRadius
                         else x1 + (spacing * 0.5f).toInt()
                val segLen = x2 - x1
                val glowX = x1 + (pulsePhase * segLen).toInt()
                val glowW = (segLen * 0.35f).toInt().coerceAtLeast(12)
                g2.color = Color(ACCENT.red, ACCENT.green, ACCENT.blue, 70)
                g2.fillRoundRect(glowX, trackY - 3, glowW, 6, 6, 6)
            }
        }

        // Stop dots and labels
        val labelFont = font.deriveFont(Font.PLAIN, 10f)
        val boldLabelFont = font.deriveFont(Font.BOLD, 10f)
        val fm = g2.getFontMetrics(labelFont)

        stops.forEachIndexed { i, stop ->
            val cx = insetX + (i * spacing).toInt()

            g2.color = dotColor(stop.state)
            g2.fillOval(cx - dotRadius, trackY - dotRadius, dotRadius * 2, dotRadius * 2)

            // Pulsing ring around active dot
            if (stop.state == PhaseState.ACTIVE && indeterminate) {
                val alpha = ((0.5 + 0.5 * kotlin.math.sin(pulsePhase * Math.PI * 2)) * 100).toInt().coerceIn(20, 100)
                g2.color = Color(ACCENT.red, ACCENT.green, ACCENT.blue, alpha)
                g2.stroke = BasicStroke(1.5f)
                g2.drawOval(cx - dotRadius - 3, trackY - dotRadius - 3, (dotRadius + 3) * 2, (dotRadius + 3) * 2)
            }

            drawStopIcon(g2, cx, trackY, stop.state)

            g2.font = if (stop.state == PhaseState.ACTIVE) boldLabelFont else labelFont
            g2.color = labelColor(stop.state)
            val labelW = fm.stringWidth(stop.label)
            val labelX = (cx - labelW / 2).coerceIn(0, width - labelW)
            g2.drawString(stop.label, labelX, trackY + dotRadius + 14)
        }

        g2.dispose()
    }

    private fun segmentColor(state: PhaseState): Color = when (state) {
        PhaseState.DONE -> GREEN
        PhaseState.ACTIVE -> ACCENT
        PhaseState.ERROR -> RED
        PhaseState.SKIPPED -> AMBER
        PhaseState.PENDING -> BORDER_SUBTLE
    }

    private fun dotColor(state: PhaseState): Color = when (state) {
        PhaseState.DONE -> GREEN
        PhaseState.ACTIVE -> ACCENT
        PhaseState.ERROR -> RED
        PhaseState.SKIPPED -> AMBER
        PhaseState.PENDING -> BORDER_SUBTLE
    }

    private fun labelColor(state: PhaseState): Color = when (state) {
        PhaseState.DONE -> GREEN
        PhaseState.ACTIVE -> ACCENT
        PhaseState.ERROR -> RED
        PhaseState.SKIPPED -> AMBER
        PhaseState.PENDING -> TEXT_SECONDARY
    }

    private fun drawStopIcon(g2: Graphics2D, cx: Int, cy: Int, state: PhaseState) {
        val r = dotRadius - 1
        g2.color = Color.WHITE
        g2.stroke = BasicStroke(1.4f)
        when (state) {
            PhaseState.DONE -> {
                g2.drawLine(cx - r + 2, cy, cx - 1, cy + r - 1)
                g2.drawLine(cx - 1, cy + r - 1, cx + r - 1, cy - r + 2)
            }
            PhaseState.ERROR -> {
                g2.drawLine(cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2)
                g2.drawLine(cx + r - 2, cy - r + 2, cx - r + 2, cy + r - 2)
            }
            PhaseState.SKIPPED -> {
                g2.drawLine(cx - r + 2, cy, cx + r - 2, cy)
            }
            else -> {}
        }
    }
}
