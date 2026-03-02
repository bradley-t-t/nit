package com.turl.release.toolwindow

import com.intellij.icons.AllIcons
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.ui.components.JBScrollPane
import com.intellij.util.ui.JBUI
import java.awt.*
import java.io.File
import javax.swing.*

class RulesTab(private val project: Project) : JPanel(BorderLayout()) {

    private val rulesListPanel = JPanel().apply {
        layout = BoxLayout(this, BoxLayout.Y_AXIS)
        isOpaque = false
    }

    private val countLabel = JLabel("0 rules").apply {
        font = font.deriveFont(Font.PLAIN, 11f)
        foreground = TEXT_SECONDARY
    }

    private val feedbackLabel = JLabel(" ").apply {
        font = font.deriveFont(Font.PLAIN, 11f)
        foreground = TEXT_SECONDARY
    }

    private val ruleEntries = mutableListOf<RuleEntryCard>()
    private val rulesFilePath: String get() = "${project.basePath}/.github/copilot-instructions.md"

    private val rulesStartMarker = "<!-- TURL-RULES-START -->"
    private val rulesEndMarker = "<!-- TURL-RULES-END -->"

    init {
        background = BG_PRIMARY
        border = JBUI.Borders.empty(14)
        buildLayout()
        loadRules()
    }

    private fun buildLayout() {
        val headerRow = JPanel(BorderLayout()).apply {
            isOpaque = false
            border = JBUI.Borders.empty(0, 0, 10, 0)
            add(countLabel, BorderLayout.WEST)
            add(buildActionButtons(), BorderLayout.EAST)
        }

        val scroll = JBScrollPane(rulesListPanel).apply {
            border = JBUI.Borders.empty()
            isOpaque = false
            viewport.isOpaque = false
            horizontalScrollBarPolicy = ScrollPaneConstants.HORIZONTAL_SCROLLBAR_NEVER
        }

        val bottomRow = JPanel(FlowLayout(FlowLayout.LEFT, 0, 0)).apply {
            isOpaque = false
            border = JBUI.Borders.emptyTop(6)
            add(feedbackLabel)
        }

        add(headerRow, BorderLayout.NORTH)
        add(scroll, BorderLayout.CENTER)
        add(bottomRow, BorderLayout.SOUTH)
    }

    private fun buildActionButtons() = JPanel(FlowLayout(FlowLayout.RIGHT, 6, 0)).apply {
        isOpaque = false
        add(PillButton("Add", ACCENT, Color.WHITE, true).apply {
            addActionListener { addNewRule() }
        })
        add(PillButton("Save", GREEN, Color.WHITE, true).apply {
            addActionListener { saveRules() }
        })
        add(PillButton("Reload", CARD_BG, TEXT_PRIMARY, false).apply {
            addActionListener { loadRules() }
        })
    }

    private fun addNewRule() {
        ruleEntries.add(RuleEntryCard(ruleEntries.size + 1, "", ::removeRule))
        rebuildList()
        setFeedback("New rule added", ACCENT)
    }

    private fun removeRule(entry: RuleEntryCard) {
        ruleEntries.remove(entry)
        rebuildList()
        setFeedback("Rule removed (save to apply)", TEXT_SECONDARY)
    }

    private fun rebuildList() {
        rulesListPanel.removeAll()
        ruleEntries.forEachIndexed { index, entry ->
            entry.updateNumber(index + 1)
            rulesListPanel.add(entry)
            rulesListPanel.add(Box.createVerticalStrut(6))
        }
        rulesListPanel.add(Box.createVerticalGlue())
        countLabel.text = "${ruleEntries.size} rules"
        rulesListPanel.revalidate()
        rulesListPanel.repaint()
    }

    private fun loadRules() {
        ruleEntries.clear()

        val file = File(rulesFilePath)
        if (!file.exists()) {
            setFeedback("No rules file found", TEXT_SECONDARY)
            rebuildList()
            return
        }

        extractRules(file.readText()).forEachIndexed { index, text ->
            ruleEntries.add(RuleEntryCard(index + 1, text, ::removeRule))
        }
        rebuildList()
        setFeedback("Loaded ${ruleEntries.size} rules", TEXT_SECONDARY)
    }

    private fun saveRules() {
        val file = File(rulesFilePath)
        file.parentFile?.mkdirs()

        val rulesText = ruleEntries
            .map { it.getRuleText().trim() }
            .filter { it.isNotBlank() }
            .joinToString("\n") { "- $it" }

        val rulesBlock = buildRulesBlock(rulesText)

        if (file.exists()) {
            val existing = file.readText()
            val startIdx = existing.indexOf(rulesStartMarker)
            val endIdx = existing.indexOf(rulesEndMarker)
            val updated = if (startIdx >= 0 && endIdx >= 0) {
                existing.substring(0, startIdx) + rulesBlock + existing.substring(endIdx + rulesEndMarker.length)
            } else {
                "$existing\n\n$rulesBlock\n"
            }
            file.writeText(updated)
        } else {
            file.writeText("# Copilot Instructions\n\nThis file provides context to GitHub Copilot for this project.\n\n$rulesBlock\n")
        }

        LocalFileSystem.getInstance().refreshAndFindFileByPath(rulesFilePath)?.refresh(true, false)
        setFeedback("\u2713 ${ruleEntries.size} rules saved", GREEN)
    }

    private fun buildRulesBlock(rulesText: String) = """
        |$rulesStartMarker
        |## Project Rules (Auto-managed by TURL)
        |
        |These rules are automatically learned from project commits and enforced during releases.
        |Do not edit this section manually - it will be overwritten.
        |
        |$rulesText
        |$rulesEndMarker
    """.trimMargin()

    private fun extractRules(content: String): List<String> {
        val startIdx = content.indexOf(rulesStartMarker)
        val endIdx = content.indexOf(rulesEndMarker)
        if (startIdx < 0 || endIdx < 0) return emptyList()
        return content.substring(startIdx + rulesStartMarker.length, endIdx)
            .lines()
            .filter { it.trimStart().startsWith("- ") }
            .map { it.trimStart().removePrefix("- ").trim() }
            .filter { it.isNotBlank() }
    }

    private fun setFeedback(message: String, color: Color) {
        feedbackLabel.text = message
        feedbackLabel.foreground = color
    }
}

class RuleEntryCard(
    private var number: Int,
    initialText: String,
    private val onDelete: (RuleEntryCard) -> Unit
) : ShadowCard() {

    private val numberLabel = JLabel().apply {
        font = font.deriveFont(Font.BOLD, 11f)
        foreground = BADGE_FG
        horizontalAlignment = SwingConstants.CENTER
        preferredSize = Dimension(26, 26)
    }

    private val badge = object : JPanel(BorderLayout()) {
        init {
            isOpaque = false
            val badgeSize = Dimension(26, 26)
            preferredSize = badgeSize
            minimumSize = badgeSize
            maximumSize = badgeSize
            add(numberLabel, BorderLayout.CENTER)
        }

        override fun paintComponent(g: Graphics) {
            val g2 = g.create() as Graphics2D
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
            g2.color = BADGE_BG
            g2.fillRoundRect(0, 0, width, height, 8, 8)
            g2.dispose()
            super.paintComponent(g)
        }
    }

    private val textArea = com.intellij.ui.components.JBTextArea(initialText).apply {
        font = Font("JetBrains Mono", Font.PLAIN, 11)
        lineWrap = true
        wrapStyleWord = true
        background = CARD_BG
        foreground = TEXT_PRIMARY
        caretColor = TEXT_PRIMARY
        border = JBUI.Borders.empty()
        rows = 2
    }

    private val deleteBtn = JButton(AllIcons.Actions.Close).apply {
        isFocusPainted = false
        isBorderPainted = false
        isContentAreaFilled = false
        cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
        preferredSize = Dimension(22, 22)
        toolTipText = "Remove"
    }

    init {
        layout = BorderLayout(8, 0)
        border = JBUI.Borders.empty(10, 12, 10, 10)
        maximumSize = Dimension(Int.MAX_VALUE, 72)
        updateNumber(number)

        add(JPanel(FlowLayout(FlowLayout.LEFT, 0, 0)).apply {
            isOpaque = false
            border = JBUI.Borders.emptyTop(2)
            add(badge)
        }, BorderLayout.WEST)

        add(textArea, BorderLayout.CENTER)

        add(JPanel(FlowLayout(FlowLayout.RIGHT, 0, 0)).apply {
            isOpaque = false
            add(deleteBtn)
        }, BorderLayout.EAST)

        deleteBtn.addActionListener { onDelete(this) }
    }

    fun updateNumber(n: Int) {
        number = n
        numberLabel.text = "$n"
    }

    fun getRuleText(): String = textArea.text
}

