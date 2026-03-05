package com.nit.release.actions

import com.intellij.icons.AllIcons

class NitReleaseAction : BaseNitAction() {
    init {
        templatePresentation.text = "Run Release"
        templatePresentation.description = "Run a full nit"
        templatePresentation.icon = AllIcons.Actions.Execute
    }
}
