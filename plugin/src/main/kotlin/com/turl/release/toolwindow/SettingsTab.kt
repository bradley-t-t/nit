package com.turl.release.toolwindow

import com.intellij.ui.components.JBScrollPane
import com.intellij.util.ui.JBUI
import com.turl.release.settings.TurlSettings
import java.awt.*
import javax.swing.*

class SettingsTab : JPanel(BorderLayout()) {

    private val settings = TurlSettings.getInstance()

    private val apiKeyField = RoundedPasswordField()
    private val nodePathField = RoundedTextField()
    private val branchField = RoundedTextField()

    private val skipUpdateCheckbox = JCheckBox("Skip update check before releases").apply {
        isOpaque = false
        foreground = TEXT_PRIMARY
        font = font.deriveFont(Font.PLAIN, 12f)
    }

    private val feedbackLabel = JLabel(" ").apply {
        font = font.deriveFont(Font.PLAIN, 11f)
        foreground = TEXT_SECONDARY
    }

    init {
        background = BG_PRIMARY
        border = JBUI.Borders.empty(14)
        buildLayout()
        loadSettings()
    }

    private fun buildLayout() {
        val sections = JPanel().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)
            isOpaque = false
            add(buildSettingsSection("API", listOf("Grok API Key" to apiKeyField)))
            add(Box.createVerticalStrut(12))
            add(buildSettingsSection("PATHS", listOf("Node.js Path" to nodePathField)))
            add(Box.createVerticalStrut(12))
            add(buildSettingsSection("GIT", listOf("Default Branch" to branchField)))
            add(Box.createVerticalStrut(12))
            add(buildSettingsSection("BEHAVIOR", emptyList(), skipUpdateCheckbox))
            add(Box.createVerticalGlue())
        }

        val scroll = JBScrollPane(sections).apply {
            border = JBUI.Borders.empty()
            isOpaque = false
            viewport.isOpaque = false
        }

        val buttonRow = JPanel(FlowLayout(FlowLayout.LEFT, 8, 0)).apply {
            isOpaque = false
            border = JBUI.Borders.emptyTop(10)
            add(PillButton("Save", ACCENT, Color.WHITE, true).apply {
                addActionListener { saveSettings() }
            })
            add(PillButton("Reset", CARD_BG, TEXT_PRIMARY, false).apply {
                addActionListener { resetDefaults() }
            })
            add(feedbackLabel)
        }

        add(scroll, BorderLayout.CENTER)
        add(buttonRow, BorderLayout.SOUTH)
    }

    private fun buildSettingsSection(
        title: String,
        fields: List<Pair<String, JComponent>>,
        checkbox: JCheckBox? = null
    ): JComponent {
        val card = ShadowCard().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)
            border = JBUI.Borders.empty(14, 16, 14, 16)
            alignmentX = LEFT_ALIGNMENT
        }

        card.add(JLabel(title).apply {
            font = font.deriveFont(Font.BOLD, 10f)
            foreground = TEXT_SECONDARY
            alignmentX = LEFT_ALIGNMENT
        })
        card.add(Box.createVerticalStrut(10))

        fields.forEach { (label, field) ->
            card.add(JLabel(label).apply {
                font = font.deriveFont(Font.PLAIN, 12f)
                foreground = TEXT_PRIMARY
                alignmentX = LEFT_ALIGNMENT
                border = JBUI.Borders.emptyBottom(4)
            })
            field.maximumSize = Dimension(Int.MAX_VALUE, 32)
            field.alignmentX = LEFT_ALIGNMENT
            card.add(field)
            card.add(Box.createVerticalStrut(8))
        }

        checkbox?.let {
            it.alignmentX = LEFT_ALIGNMENT
            card.add(it)
        }

        return card
    }

    private fun loadSettings() {
        val state = settings.state
        apiKeyField.text = state.grokApiKey
        nodePathField.text = state.nodePath
        branchField.text = state.defaultBranch
        skipUpdateCheckbox.isSelected = state.skipUpdateOnRun
    }

    private fun saveSettings() {
        settings.loadState(TurlSettings.State(
            grokApiKey = String(apiKeyField.password),
            nodePath = nodePathField.text,
            defaultBranch = branchField.text,
            skipUpdateOnRun = skipUpdateCheckbox.isSelected
        ))
        feedbackLabel.text = "\u2713 Saved"
        feedbackLabel.foreground = GREEN
    }

    private fun resetDefaults() {
        apiKeyField.text = ""
        nodePathField.text = ""
        branchField.text = ""
        skipUpdateCheckbox.isSelected = true
        saveSettings()
        feedbackLabel.text = "Reset to defaults"
        feedbackLabel.foreground = TEXT_SECONDARY
    }
}

