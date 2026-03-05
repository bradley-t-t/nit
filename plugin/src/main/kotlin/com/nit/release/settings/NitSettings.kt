package com.nit.release.settings

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage

@State(name = "NitReleaseSettings", storages = [Storage("NitReleaseSettings.xml")])
class NitSettings : PersistentStateComponent<NitSettings.State> {

    data class State(
        var grokApiKey: String = "",
        var nodePath: String = "",
        var defaultBranch: String = "",
        var skipUpdateOnRun: Boolean = true
    )

    private var myState = State()

    override fun getState(): State = myState

    override fun loadState(state: State) {
        myState = state
    }

    companion object {
        fun getInstance(): NitSettings =
            ApplicationManager.getApplication().getService(NitSettings::class.java)
    }
}
