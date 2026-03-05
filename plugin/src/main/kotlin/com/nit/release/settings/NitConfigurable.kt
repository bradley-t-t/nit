package com.nit.release.settings

import com.intellij.openapi.options.Configurable
import java.awt.GridBagConstraints
import java.awt.GridBagLayout
import java.awt.Insets
import javax.swing.*

/** Settings UI panel under Settings -> Tools -> Nit Release. */
class NitConfigurable : Configurable {

    private var panel: JPanel? = null
    private var apiKeyField: JPasswordField? = null
    private var nodePathField: JTextField? = null
    private var branchField: JTextField? = null
    private var skipUpdateCheckbox: JCheckBox? = null
    private var providerCombo: JComboBox<AiProvider>? = null

    override fun getDisplayName() = "Nit Release"

    override fun createComponent(): JComponent {
        val settings = NitSettings.getInstance().state

        providerCombo = JComboBox(AiProvider.entries.toTypedArray()).apply {
            renderer = DefaultListCellRenderer().also { r ->
                setRenderer { _, value, index, isSelected, cellHasFocus ->
                    r.getListCellRendererComponent(this, value?.displayName ?: "", index, isSelected, cellHasFocus)
                }
            }
            selectedItem = try { AiProvider.valueOf(settings.aiProvider) } catch (_: Exception) { AiProvider.GROK }
        }

        apiKeyField = JPasswordField(40).apply { text = settings.apiKey }
        nodePathField = JTextField(settings.nodePath, 40)
        branchField = JTextField(settings.defaultBranch, 20)
        skipUpdateCheckbox = JCheckBox("Skip update check on run", settings.skipUpdateOnRun)

        panel = JPanel(GridBagLayout()).apply {
            val gbc = GridBagConstraints().apply {
                insets = Insets(4, 8, 4, 8)
                anchor = GridBagConstraints.WEST
                fill = GridBagConstraints.HORIZONTAL
            }

            fun addRow(row: Int, label: String, component: JComponent) {
                gbc.gridx = 0; gbc.gridy = row; gbc.weightx = 0.0
                add(JLabel(label), gbc)
                gbc.gridx = 1; gbc.weightx = 1.0
                add(component, gbc)
            }

            addRow(0, "AI Provider:", providerCombo!!)
            addRow(1, "API Key:", apiKeyField!!)
            addRow(2, "Node Path (optional):", nodePathField!!)
            addRow(3, "Default Branch:", branchField!!)

            gbc.gridx = 1; gbc.gridy = 4; gbc.weightx = 1.0
            add(skipUpdateCheckbox!!, gbc)

            // Fill remaining vertical space
            gbc.gridx = 0; gbc.gridy = 5; gbc.weighty = 1.0; gbc.gridwidth = 2
            add(JPanel(), gbc)
        }

        return panel!!
    }

    override fun isModified(): Boolean {
        val settings = NitSettings.getInstance().state
        val currentProvider = try { AiProvider.valueOf(settings.aiProvider) } catch (_: Exception) { AiProvider.GROK }
        return providerCombo?.selectedItem != currentProvider
            || String(apiKeyField?.password ?: charArrayOf()) != settings.apiKey
            || nodePathField?.text != settings.nodePath
            || branchField?.text != settings.defaultBranch
            || skipUpdateCheckbox?.isSelected != settings.skipUpdateOnRun
    }

    override fun apply() {
        val settings = NitSettings.getInstance()
        val state = settings.state
        state.aiProvider = (providerCombo?.selectedItem as? AiProvider)?.name ?: AiProvider.GROK.name
        state.apiKey = String(apiKeyField?.password ?: charArrayOf())
        state.nodePath = nodePathField?.text ?: ""
        state.defaultBranch = branchField?.text ?: ""
        state.skipUpdateOnRun = skipUpdateCheckbox?.isSelected ?: true
    }

    override fun reset() {
        val settings = NitSettings.getInstance().state
        val currentProvider = try { AiProvider.valueOf(settings.aiProvider) } catch (_: Exception) { AiProvider.GROK }
        providerCombo?.selectedItem = currentProvider
        apiKeyField?.text = settings.apiKey
        nodePathField?.text = settings.nodePath
        branchField?.text = settings.defaultBranch
        skipUpdateCheckbox?.isSelected = settings.skipUpdateOnRun
    }
}

