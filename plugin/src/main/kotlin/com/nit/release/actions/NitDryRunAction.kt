package com.nit.release.actions

import com.intellij.icons.AllIcons

class NitDryRunAction : BaseNitAction() {
    init {
        templatePresentation.text = "Dry Run"
        templatePresentation.description = "Preview release without making changes"
        templatePresentation.icon = AllIcons.Actions.Preview
    }
}
