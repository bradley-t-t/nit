package com.nit.release.actions

import com.intellij.icons.AllIcons

class NitInteractiveAction : BaseNitAction() {
    init {
        templatePresentation.text = "Interactive Release"
        templatePresentation.description = "Run release in interactive mode"
        templatePresentation.icon = AllIcons.Actions.RunAll
    }
}
