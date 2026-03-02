package com.turl.release.actions

import com.intellij.icons.AllIcons

class TurlDryRunAction : BaseTurlAction() {
    init {
        templatePresentation.text = "Dry Run"
        templatePresentation.description = "Preview release without making changes"
        templatePresentation.icon = AllIcons.Actions.Preview
    }

    override fun getFlags(): Array<String> = arrayOf("--dry-run")
}

