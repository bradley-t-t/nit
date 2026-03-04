package com.turl.release.toolwindow

import com.intellij.util.ui.JBUI
import java.awt.*
import javax.swing.*

open class ShadowCard : JPanel() {
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

class PillButton(
    text: String,
    private val bgColor: Color,
    private val fgColor: Color,
    primary: Boolean
) : JButton(text) {
    init {
        isFocusPainted = false
        cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
        font = font.deriveFont(if (primary) Font.BOLD else Font.PLAIN, 12f)
        foreground = fgColor
        background = bgColor
        isContentAreaFilled = false
        isBorderPainted = false
        border = JBUI.Borders.empty(5, 14, 5, 14)
    }

    override fun paintComponent(g: Graphics) {
        val g2 = g.create() as Graphics2D
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        g2.color = when {
            !isEnabled -> BORDER_SUBTLE
            model.isRollover -> bgColor.brighter()
            else -> bgColor
        }
        g2.fillRoundRect(0, 0, width, height, height, height)
        foreground = if (isEnabled) fgColor else TEXT_SECONDARY
        g2.dispose()
        super.paintComponent(g)
    }
}

class RoundedProgressBar : JPanel() {
    var progress = 0
        set(value) { field = value; repaint() }
    var accentColor: Color = ACCENT
        set(value) { field = value; repaint() }

    private var indeterminate = false
    private var indeterminateOffset = 0f
    private var indeterminateDirection = 1

    private val segmentWidthRatio = 0.35f
    private val animationSpeed = 0.02f

    private val animationTimer = Timer(16) {
        indeterminateOffset += animationSpeed * indeterminateDirection
        if (indeterminateOffset + segmentWidthRatio >= 1f) {
            indeterminateOffset = 1f - segmentWidthRatio
            indeterminateDirection = -1
        } else if (indeterminateOffset <= 0f) {
            indeterminateOffset = 0f
            indeterminateDirection = 1
        }
        repaint()
    }

    init {
        isOpaque = false
        preferredSize = Dimension(0, 4)
        maximumSize = Dimension(Int.MAX_VALUE, 4)
        minimumSize = Dimension(0, 4)
    }

    fun setIndeterminate(value: Boolean) {
        indeterminate = value
        if (value) {
            indeterminateOffset = 0f
            indeterminateDirection = 1
            animationTimer.start()
        } else {
            animationTimer.stop()
        }
        repaint()
    }

    override fun paintComponent(g: Graphics) {
        val g2 = g.create() as Graphics2D
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
        g2.color = PROGRESS_TRACK
        g2.fillRoundRect(0, 0, width, height, height, height)

        if (indeterminate) {
            g2.color = accentColor
            val segmentWidth = (width * segmentWidthRatio).toInt()
            val x = (indeterminateOffset * width).toInt()
            g2.fillRoundRect(x, 0, segmentWidth, height, height, height)
        } else if (progress > 0) {
            g2.color = accentColor
            val fillWidth = width * progress / 100
            if (fillWidth > 0) g2.fillRoundRect(0, 0, fillWidth, height, height, height)
        }

        g2.dispose()
    }
}

class RoundedTextField : JTextField() {
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

class RoundedPasswordField : JPasswordField() {
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

class TimelineStep(private val label: String, private val isLast: Boolean) : JPanel() {
    var currentState = PhaseState.PENDING
        private set

    private val dotSize = 10
    private val textLabel = JLabel(label)
    private val statusBadge = JLabel()
    private var spinAngle = 0
    private val spinTimer = Timer(60) {
        spinAngle = (spinAngle + 30) % 360
        repaint()
    }

    private val stepHeight = if (isLast) 28 else 34

    init {
        isOpaque = false
        layout = BorderLayout()
        border = JBUI.Borders.empty()
        maximumSize = Dimension(Int.MAX_VALUE, stepHeight)
        preferredSize = Dimension(0, stepHeight)
        minimumSize = Dimension(0, stepHeight)

        textLabel.font = textLabel.font.deriveFont(Font.PLAIN, 12f)
        textLabel.foreground = TEXT_SECONDARY
        textLabel.border = JBUI.Borders.emptyLeft(22)

        statusBadge.font = statusBadge.font.deriveFont(Font.PLAIN, 9f)
        statusBadge.foreground = TEXT_SECONDARY

        val rightPanel = JPanel(FlowLayout(FlowLayout.RIGHT, 0, 0)).apply {
            isOpaque = false
            add(statusBadge)
        }

        add(textLabel, BorderLayout.CENTER)
        add(rightPanel, BorderLayout.EAST)
    }

    fun setState(state: PhaseState) {
        currentState = state
        if (state == PhaseState.ACTIVE) spinTimer.start() else spinTimer.stop()
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
            g2.color = timelineLineColor()
            g2.stroke = BasicStroke(1.5f)
            g2.drawLine(dotX + dotSize / 2, dotY + dotSize + 2, dotX + dotSize / 2, height)
        }

        drawDot(g2, dotX, dotY)
        g2.dispose()
    }

    private fun timelineLineColor(): Color = when (currentState) {
        PhaseState.DONE -> GREEN
        PhaseState.ACTIVE -> ACCENT
        PhaseState.ERROR -> RED
        PhaseState.SKIPPED -> AMBER
        PhaseState.PENDING -> TIMELINE_LINE
    }

    private fun drawDot(g2: Graphics2D, dotX: Int, dotY: Int) {
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
                val cx = dotX + dotSize / 2.0
                val cy = dotY + dotSize / 2.0
                val radius = dotSize / 2.0
                g2.stroke = BasicStroke(2f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND)
                g2.color = Color(ACCENT.red, ACCENT.green, ACCENT.blue, 60)
                g2.drawArc((cx - radius).toInt(), (cy - radius).toInt(), dotSize, dotSize, 0, 360)
                g2.color = ACCENT
                g2.drawArc((cx - radius).toInt(), (cy - radius).toInt(), dotSize, dotSize, spinAngle, 270)
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

/** Compact horizontal chip for wide bottom-panel pipeline display. */
class HorizontalPhaseChip(private val label: String) : JPanel() {
    var currentState = PhaseState.PENDING
        private set

    private val chipHeight = 28
    private val dotSize = 8
    private var spinAngle = 0

    private val spinTimer = Timer(60) {
        spinAngle = (spinAngle + 30) % 360
        repaint()
    }

    private val nameLabel = JLabel(label).apply {
        font = font.deriveFont(Font.PLAIN, 11f)
        foreground = TEXT_SECONDARY
    }

    init {
        isOpaque = false
        layout = FlowLayout(FlowLayout.LEFT, 4, 0)
        border = JBUI.Borders.empty(4, 8, 4, 8)
        preferredSize = Dimension(preferredSize.width, chipHeight)

        add(Box.createHorizontalStrut(dotSize + 4))
        add(nameLabel)
    }

    fun setState(state: PhaseState) {
        currentState = state
        if (state == PhaseState.ACTIVE) spinTimer.start() else spinTimer.stop()

        when (state) {
            PhaseState.PENDING -> {
                nameLabel.foreground = TEXT_SECONDARY
                nameLabel.font = nameLabel.font.deriveFont(Font.PLAIN, 11f)
            }
            PhaseState.ACTIVE -> {
                nameLabel.foreground = ACCENT
                nameLabel.font = nameLabel.font.deriveFont(Font.BOLD, 11f)
            }
            PhaseState.DONE -> {
                nameLabel.foreground = GREEN
                nameLabel.font = nameLabel.font.deriveFont(Font.PLAIN, 11f)
            }
            PhaseState.ERROR -> {
                nameLabel.foreground = RED
                nameLabel.font = nameLabel.font.deriveFont(Font.BOLD, 11f)
            }
            PhaseState.SKIPPED -> {
                nameLabel.foreground = AMBER
                nameLabel.font = nameLabel.font.deriveFont(Font.PLAIN, 11f)
            }
        }
        repaint()
    }

    override fun paintComponent(g: Graphics) {
        super.paintComponent(g)
        val g2 = g.create() as Graphics2D
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)

        // Background pill shape based on state
        val bgColor = when (currentState) {
            PhaseState.PENDING -> null
            PhaseState.ACTIVE -> PHASE_ACTIVE_BG
            PhaseState.DONE -> PHASE_DONE_BG
            PhaseState.ERROR -> PHASE_ERROR_BG
            PhaseState.SKIPPED -> PHASE_SKIPPED_BG
        }
        bgColor?.let {
            g2.color = it
            g2.fillRoundRect(0, 0, width, height, height, height)
        }

        // Dot indicator
        val dotX = 8
        val dotY = (height - dotSize) / 2
        drawChipDot(g2, dotX, dotY)

        g2.dispose()
    }

    private fun drawChipDot(g2: Graphics2D, x: Int, y: Int) {
        when (currentState) {
            PhaseState.DONE -> {
                g2.color = GREEN
                g2.fillOval(x, y, dotSize, dotSize)
                g2.color = Color.WHITE
                g2.stroke = BasicStroke(1.2f)
                g2.drawLine(x + 2, y + dotSize / 2, x + dotSize / 2 - 1, y + dotSize - 2)
                g2.drawLine(x + dotSize / 2 - 1, y + dotSize - 2, x + dotSize - 2, y + 2)
            }
            PhaseState.ACTIVE -> {
                g2.stroke = BasicStroke(1.5f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND)
                g2.color = Color(ACCENT.red, ACCENT.green, ACCENT.blue, 50)
                g2.drawOval(x, y, dotSize, dotSize)
                g2.color = ACCENT
                g2.drawArc(x, y, dotSize, dotSize, spinAngle, 270)
            }
            PhaseState.ERROR -> {
                g2.color = RED
                g2.fillOval(x, y, dotSize, dotSize)
                g2.color = Color.WHITE
                g2.stroke = BasicStroke(1.2f)
                g2.drawLine(x + 2, y + 2, x + dotSize - 2, y + dotSize - 2)
                g2.drawLine(x + dotSize - 2, y + 2, x + 2, y + dotSize - 2)
            }
            PhaseState.SKIPPED -> {
                g2.color = AMBER
                g2.fillOval(x, y, dotSize, dotSize)
                g2.color = Color.WHITE
                g2.stroke = BasicStroke(1.2f)
                g2.drawLine(x + 2, y + dotSize / 2, x + dotSize - 2, y + dotSize / 2)
            }
            PhaseState.PENDING -> {
                g2.color = TIMELINE_LINE
                g2.stroke = BasicStroke(1.2f)
                g2.drawOval(x, y, dotSize, dotSize)
            }
        }
    }
}

