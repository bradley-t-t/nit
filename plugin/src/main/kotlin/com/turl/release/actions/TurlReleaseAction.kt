package com.turl.release.actions

import com.intellij.icons.AllIcons

class TurlReleaseAction : BaseTurlAction() {
    init {
        templatePresentation.text = "Run Release"
        templatePresentation.description = "Run a full turl-release"
        templatePresentation.icon = AllIcons.Actions.Execute
    }

    override fun getFlags(): Array<String> = emptyArray()
}

