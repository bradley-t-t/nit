package com.turl.release.toolwindow

import com.intellij.icons.AllIcons
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.components.JBTabbedPane
import com.intellij.ui.content.ContentFactory
import com.intellij.util.ui.JBUI
import java.awt.BorderLayout
import javax.swing.JPanel

class TurlToolWindowFactory : ToolWindowFactory, DumbAware {
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val panel = TurlMainPanel(project)
        val content = ContentFactory.getInstance().createContent(panel, "", false)
        toolWindow.contentManager.addContent(content)
    }
}

private class TurlMainPanel(project: Project) : JPanel(BorderLayout()) {
    init {
        background = BG_PRIMARY
        border = JBUI.Borders.empty()

        val tabs = JBTabbedPane().apply {
            tabComponentInsets = JBUI.insets(0)
            border = JBUI.Borders.empty()
            addTab("  Control  ", AllIcons.Actions.Execute, ControlPanelTab(project))
            addTab("  Rules  ", AllIcons.Actions.ListFiles, RulesTab(project))
            addTab("  Settings  ", AllIcons.General.GearPlain, SettingsTab())
        }

        add(tabs, BorderLayout.CENTER)
    }
}
