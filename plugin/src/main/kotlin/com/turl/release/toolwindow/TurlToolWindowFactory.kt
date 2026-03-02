package com.turl.release.toolwindow

import com.intellij.execution.filters.TextConsoleBuilderFactory
import com.intellij.execution.ui.ConsoleView
import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.ActionPlaces
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.DefaultActionGroup
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.icons.AllIcons
import com.intellij.ui.content.ContentFactory
import com.turl.release.services.TurlProcessRunner
import java.awt.BorderLayout
import javax.swing.JPanel

class TurlToolWindowFactory : ToolWindowFactory, DumbAware {

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val consoleView = TextConsoleBuilderFactory.getInstance().createBuilder(project).console
        val runner = TurlProcessRunner(project)

        val mainPanel = JPanel(BorderLayout())

        val toolbar = createToolbar(consoleView, runner)
        mainPanel.add(toolbar, BorderLayout.WEST)
        mainPanel.add(consoleView.component, BorderLayout.CENTER)

        val content = ContentFactory.getInstance().createContent(mainPanel, "", false)
        toolWindow.contentManager.addContent(content)
    }

    private fun createToolbar(
        consoleView: ConsoleView,
        runner: TurlProcessRunner
    ): javax.swing.JComponent {
        val actionGroup = DefaultActionGroup().apply {
            add(object : AnAction("Run Release", "Run a full release", AllIcons.Actions.Execute) {
                override fun actionPerformed(e: AnActionEvent) {
                    runner.execute(consoleView)
                }

                override fun update(e: AnActionEvent) {
                    e.presentation.isEnabled = !runner.isRunning
                }
            })
            add(object : AnAction("Dry Run", "Preview without changes", AllIcons.Actions.Preview) {
                override fun actionPerformed(e: AnActionEvent) {
                    runner.execute(consoleView, "--dry-run")
                }

                override fun update(e: AnActionEvent) {
                    e.presentation.isEnabled = !runner.isRunning
                }
            })
            add(object : AnAction("Interactive", "Interactive mode", AllIcons.Actions.RunAll) {
                override fun actionPerformed(e: AnActionEvent) {
                    runner.execute(consoleView, "--interactive")
                }

                override fun update(e: AnActionEvent) {
                    e.presentation.isEnabled = !runner.isRunning
                }
            })
            addSeparator()
            add(object : AnAction("Stop", "Stop the running process", AllIcons.Actions.Suspend) {
                override fun actionPerformed(e: AnActionEvent) {
                    runner.stop()
                }

                override fun update(e: AnActionEvent) {
                    e.presentation.isEnabled = runner.isRunning
                }
            })
            add(object : AnAction("Clear", "Clear console output", AllIcons.Actions.GC) {
                override fun actionPerformed(e: AnActionEvent) {
                    consoleView.clear()
                }
            })
        }

        val actionToolbar = ActionManager.getInstance()
            .createActionToolbar(ActionPlaces.TOOLWINDOW_CONTENT, actionGroup, false)
        actionToolbar.targetComponent = consoleView.component
        return actionToolbar.component
    }
}

