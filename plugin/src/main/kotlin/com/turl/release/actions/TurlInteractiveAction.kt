package com.turl.release.actions

import com.intellij.icons.AllIcons

class TurlInteractiveAction : BaseTurlAction() {
    init {
        templatePresentation.text = "Interactive Release"
        templatePresentation.description = "Run release in interactive mode"
        templatePresentation.icon = AllIcons.Actions.RunAll
    }

    override fun getFlags(): Array<String> = arrayOf("--interactive")
}

