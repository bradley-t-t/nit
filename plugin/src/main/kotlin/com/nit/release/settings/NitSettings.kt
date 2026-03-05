package com.nit.release.settings

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage

/** Supported AI providers for changelog and commit message generation. */
enum class AiProvider(val displayName: String, val envKey: String, val providerId: String) {
    GROK("Grok (xAI)", "GROK_API_KEY", "grok"),
    OPENAI("OpenAI", "OPENAI_API_KEY", "openai"),
    ANTHROPIC("Anthropic (Claude)", "ANTHROPIC_API_KEY", "anthropic");
}

@State(name = "NitReleaseSettings", storages = [Storage("NitReleaseSettings.xml")])
class NitSettings : PersistentStateComponent<NitSettings.State> {

    data class State(
        var apiKey: String = "",
        var nodePath: String = "",
        var defaultBranch: String = "",
        var skipUpdateOnRun: Boolean = true,
        var aiProvider: String = AiProvider.GROK.name
    ) {
        /** @deprecated Use apiKey instead. Kept for settings migration. */
        var grokApiKey: String
            get() = apiKey
            set(value) { apiKey = value }
    }

    private var myState = State()

    override fun getState(): State = myState

    override fun loadState(state: State) {
        myState = state
    }

    val resolvedProvider: AiProvider
        get() = try { AiProvider.valueOf(myState.aiProvider) } catch (_: Exception) { AiProvider.GROK }

    companion object {
        fun getInstance(): NitSettings =
            ApplicationManager.getApplication().getService(NitSettings::class.java)
    }
}
