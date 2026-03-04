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



