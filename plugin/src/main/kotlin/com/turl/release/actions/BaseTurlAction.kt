package com.turl.release.actions

import com.intellij.execution.ui.ConsoleView
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowManager
import com.turl.release.services.TurlProcessRunner
import javax.swing.JComponent
import javax.swing.JPanel

abstract class BaseTurlAction : AnAction(), DumbAware {

    abstract fun getFlags(): Array<String>

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val toolWindow = ToolWindowManager.getInstance(project)
            .getToolWindow("TURL Release") ?: return
        toolWindow.show {
            val consoleView = extractConsoleView(toolWindow) ?: return@show
            TurlProcessRunner(project).execute(consoleView, *getFlags())
        }
    }

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }

    private fun extractConsoleView(toolWindow: ToolWindow): ConsoleView? {
        val content = toolWindow.contentManager.getContent(0) ?: return null
        return findConsoleViewRecursive(content.component)
    }

    private fun findConsoleViewRecursive(component: java.awt.Component): ConsoleView? {
        if (component is ConsoleView) return component
        if (component is JComponent) {
            for (child in component.components) {
                val found = findConsoleViewRecursive(child)
                if (found != null) return found
            }
        }
        return null
    }
}

