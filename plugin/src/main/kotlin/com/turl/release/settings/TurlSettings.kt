package com.turl.release.settings

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage

@State(name = "TurlReleaseSettings", storages = [Storage("TurlReleaseSettings.xml")])
class TurlSettings : PersistentStateComponent<TurlSettings.State> {

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
        fun getInstance(): TurlSettings =
            ApplicationManager.getApplication().getService(TurlSettings::class.java)
    }
}

