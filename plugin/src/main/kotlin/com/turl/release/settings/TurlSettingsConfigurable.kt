package com.turl.release.settings

import com.intellij.openapi.options.Configurable
import java.awt.GridBagConstraints
import java.awt.GridBagLayout
import java.awt.Insets
import javax.swing.*

class TurlSettingsConfigurable : Configurable {

    private var panel: JPanel? = null
    private var apiKeyField: JPasswordField? = null
    private var nodePathField: JTextField? = null
    private var defaultBranchField: JTextField? = null
    private var skipUpdateCheckbox: JCheckBox? = null

    override fun getDisplayName(): String = "TURL Release"

    override fun createComponent(): JComponent {
        val state = TurlSettings.getInstance().state
        panel = JPanel(GridBagLayout())

        val gbc = GridBagConstraints().apply {
            fill = GridBagConstraints.HORIZONTAL
            insets = Insets(5, 5, 5, 5)
            anchor = GridBagConstraints.WEST
        }

        apiKeyField = JPasswordField(state.grokApiKey, 30)
        nodePathField = JTextField(state.nodePath, 30)
        defaultBranchField = JTextField(state.defaultBranch, 30)
        skipUpdateCheckbox = JCheckBox("Skip turl-release update check on run", state.skipUpdateOnRun)

        addLabeledField(gbc, 0, "Grok API Key:", apiKeyField!!)
        addLabeledField(gbc, 1, "Node.js Path (blank = auto-detect):", nodePathField!!)
        addLabeledField(gbc, 2, "Default Branch Override:", defaultBranchField!!)

        gbc.apply { gridx = 0; gridy = 3; gridwidth = 2 }
        panel!!.add(skipUpdateCheckbox, gbc)

        gbc.apply { gridy = 4; weighty = 1.0; fill = GridBagConstraints.BOTH }
        panel!!.add(JPanel(), gbc)

        return panel!!
    }

    private fun addLabeledField(gbc: GridBagConstraints, row: Int, label: String, field: JComponent) {
        gbc.apply { gridx = 0; gridy = row; weightx = 0.0; gridwidth = 1 }
        panel!!.add(JLabel(label), gbc)
        gbc.apply { gridx = 1; weightx = 1.0 }
        panel!!.add(field, gbc)
    }

    override fun isModified(): Boolean {
        val state = TurlSettings.getInstance().state
        return currentApiKey() != state.grokApiKey ||
               nodePathField?.text != state.nodePath ||
               defaultBranchField?.text != state.defaultBranch ||
               skipUpdateCheckbox?.isSelected != state.skipUpdateOnRun
    }

    override fun apply() {
        TurlSettings.getInstance().loadState(TurlSettings.State(
            grokApiKey = currentApiKey(),
            nodePath = nodePathField?.text.orEmpty(),
            defaultBranch = defaultBranchField?.text.orEmpty(),
            skipUpdateOnRun = skipUpdateCheckbox?.isSelected ?: true
        ))
    }

    override fun reset() {
        val state = TurlSettings.getInstance().state
        apiKeyField?.text = state.grokApiKey
        nodePathField?.text = state.nodePath
        defaultBranchField?.text = state.defaultBranch
        skipUpdateCheckbox?.isSelected = state.skipUpdateOnRun
    }

    override fun disposeUIResources() {
        panel = null
        apiKeyField = null
        nodePathField = null
        defaultBranchField = null
        skipUpdateCheckbox = null
    }

    private fun currentApiKey(): String = String(apiKeyField?.password ?: charArrayOf())
}
