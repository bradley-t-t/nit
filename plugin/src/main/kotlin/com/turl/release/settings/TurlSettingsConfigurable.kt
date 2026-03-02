package com.turl.release.settings

import com.intellij.openapi.options.Configurable
import javax.swing.*
import java.awt.GridBagConstraints
import java.awt.GridBagLayout
import java.awt.Insets

class TurlSettingsConfigurable : Configurable {

    private var panel: JPanel? = null
    private var apiKeyField: JPasswordField? = null
    private var nodePathField: JTextField? = null
    private var defaultBranchField: JTextField? = null
    private var skipUpdateCheckbox: JCheckBox? = null

    override fun getDisplayName(): String = "TURL Release"

    override fun createComponent(): JComponent {
        val settings = TurlSettings.getInstance().state

        panel = JPanel(GridBagLayout())
        val gbc = GridBagConstraints().apply {
            fill = GridBagConstraints.HORIZONTAL
            insets = Insets(5, 5, 5, 5)
            anchor = GridBagConstraints.WEST
        }

        gbc.gridx = 0; gbc.gridy = 0; gbc.weightx = 0.0
        panel!!.add(JLabel("Grok API Key:"), gbc)
        gbc.gridx = 1; gbc.weightx = 1.0
        apiKeyField = JPasswordField(settings.grokApiKey, 30)
        panel!!.add(apiKeyField, gbc)

        gbc.gridx = 0; gbc.gridy = 1; gbc.weightx = 0.0
        panel!!.add(JLabel("Node.js Path (blank = auto-detect):"), gbc)
        gbc.gridx = 1; gbc.weightx = 1.0
        nodePathField = JTextField(settings.nodePath, 30)
        panel!!.add(nodePathField, gbc)

        gbc.gridx = 0; gbc.gridy = 2; gbc.weightx = 0.0
        panel!!.add(JLabel("Default Branch Override:"), gbc)
        gbc.gridx = 1; gbc.weightx = 1.0
        defaultBranchField = JTextField(settings.defaultBranch, 30)
        panel!!.add(defaultBranchField, gbc)

        gbc.gridx = 0; gbc.gridy = 3; gbc.gridwidth = 2
        skipUpdateCheckbox = JCheckBox("Skip turl-release update check on run", settings.skipUpdateOnRun)
        panel!!.add(skipUpdateCheckbox, gbc)

        gbc.gridy = 4; gbc.weighty = 1.0; gbc.fill = GridBagConstraints.BOTH
        panel!!.add(JPanel(), gbc)

        return panel!!
    }

    override fun isModified(): Boolean {
        val settings = TurlSettings.getInstance().state
        return String(apiKeyField?.password ?: charArrayOf()) != settings.grokApiKey ||
                nodePathField?.text != settings.nodePath ||
                defaultBranchField?.text != settings.defaultBranch ||
                skipUpdateCheckbox?.isSelected != settings.skipUpdateOnRun
    }

    override fun apply() {
        val settings = TurlSettings.getInstance()
        settings.loadState(
            TurlSettings.State(
                grokApiKey = String(apiKeyField?.password ?: charArrayOf()),
                nodePath = nodePathField?.text ?: "",
                defaultBranch = defaultBranchField?.text ?: "",
                skipUpdateOnRun = skipUpdateCheckbox?.isSelected ?: true
            )
        )
    }

    override fun reset() {
        val settings = TurlSettings.getInstance().state
        apiKeyField?.text = settings.grokApiKey
        nodePathField?.text = settings.nodePath
        defaultBranchField?.text = settings.defaultBranch
        skipUpdateCheckbox?.isSelected = settings.skipUpdateOnRun
    }

    override fun disposeUIResources() {
        panel = null
        apiKeyField = null
        nodePathField = null
        defaultBranchField = null
        skipUpdateCheckbox = null
    }
}

