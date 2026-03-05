package com.nit.release.settings

import com.intellij.openapi.fileChooser.FileChooserDescriptorFactory
import com.intellij.openapi.options.Configurable
import com.intellij.openapi.ui.DialogPanel
import com.intellij.ui.components.JBLabel
import com.intellij.ui.dsl.builder.*
import javax.swing.JComponent

/** Settings panel registered under Settings → Tools → Nit Release. */
class NitConfigurable : Configurable {

    private lateinit var dialogPanel: DialogPanel

    override fun getDisplayName() = "Nit Release"

    override fun createComponent(): JComponent {
        val nit = NitSettings.getInstance()
        val state = nit.state

        // Reactive hint that updates when the provider dropdown changes.
        val apiKeyHint = JBLabel(apiKeyComment(nit.resolvedProvider)).apply {
            foreground = com.intellij.util.ui.UIUtil.getContextHelpForeground()
            font = com.intellij.util.ui.JBUI.Fonts.smallFont()
        }

        dialogPanel = panel {
            group("AI Provider") {
                row("Provider:") {
                    comboBox(AiProvider.entries)
                        .bindItem(
                            getter = { nit.resolvedProvider },
                            setter = { provider ->
                                state.aiProvider = (provider ?: AiProvider.GROK).name
                                apiKeyHint.text = apiKeyComment(provider ?: AiProvider.GROK)
                            }
                        )
                }
                row("API Key:") {
                    passwordField()
                        .bindText(
                            getter = { state.apiKey },
                            setter = { state.apiKey = it }
                        )
                        .columns(COLUMNS_LARGE)
                }
                row("") {
                    cell(apiKeyHint)
                }
            }

            group("Runtime") {
                row("Node Binary:") {
                    textField()
                        .bindText(
                            getter = { state.nodePath },
                            setter = { state.nodePath = it }
                        )
                        .columns(COLUMNS_LARGE)
                        .applyToComponent {
                            emptyText.text = "e.g. /usr/local/bin/node"
                        }
                        .comment("Absolute path to the node binary. Leave empty to resolve from the system PATH.")
                }.layout(RowLayout.PARENT_GRID)

                row("") {
                    button("Browse…") {
                        val descriptor = FileChooserDescriptorFactory.createSingleFileDescriptor()
                        val chosen = com.intellij.openapi.fileChooser.FileChooser.chooseFile(
                            descriptor, null, null
                        )
                        if (chosen != null) state.nodePath = chosen.path
                        dialogPanel.reset()
                    }
                }

                row("Default Branch:") {
                    textField()
                        .bindText(
                            getter = { state.defaultBranch },
                            setter = { state.defaultBranch = it }
                        )
                        .columns(COLUMNS_SHORT)
                        .applyToComponent {
                            emptyText.text = "e.g. main"
                        }
                        .comment("Branch used when no branch is specified at release time.")
                }
            }

            group("Behavior") {
                row {
                    checkBox("Skip CLI update check on run")
                        .bindSelected(
                            getter = { state.skipUpdateOnRun },
                            setter = { state.skipUpdateOnRun = it }
                        )
                        .comment("Bypass the CLI self-update check each time a release is triggered from the IDE.")
                }
            }
        }

        return dialogPanel
    }

    override fun isModified() = dialogPanel.isModified()

    override fun apply() = dialogPanel.apply()

    override fun reset() = dialogPanel.reset()
}

/** Contextual hint shown below the API Key field — tells the user which env var to set. */
private fun apiKeyComment(provider: AiProvider) =
    "Or set ${provider.envKey} in your environment to skip entering a key here."
