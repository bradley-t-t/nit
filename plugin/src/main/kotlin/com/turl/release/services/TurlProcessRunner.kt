package com.turl.release.services

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.process.OSProcessHandler
import com.intellij.execution.process.ProcessAdapter
import com.intellij.execution.process.ProcessEvent
import com.intellij.execution.process.ProcessOutputTypes
import com.intellij.execution.ui.ConsoleView
import com.intellij.execution.ui.ConsoleViewContentType
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Key
import com.turl.release.settings.TurlSettings
import java.io.File
import java.nio.charset.StandardCharsets

class TurlProcessRunner(private val project: Project) {

    private var currentHandler: OSProcessHandler? = null

    val isRunning: Boolean get() = currentHandler?.isProcessTerminated == false

    fun execute(consoleView: ConsoleView, vararg extraFlags: String) {
        if (isRunning) {
            consoleView.print("\nA release is already running.\n", ConsoleViewContentType.ERROR_OUTPUT)
            return
        }

        val settings = TurlSettings.getInstance().state
        val nodePath = resolveNodePath(settings.nodePath)
        val turl = resolveTurlPath()

        if (turl == null) {
            consoleView.print(
                "Could not find turl-release. Ensure it is installed globally via npm.\n",
                ConsoleViewContentType.ERROR_OUTPUT
            )
            return
        }

        val flags = mutableListOf<String>()
        if (settings.skipUpdateOnRun) flags.add("--skip-update")
        if (settings.defaultBranch.isNotBlank()) {
            flags.add("--branch")
            flags.add(settings.defaultBranch)
        }
        flags.addAll(extraFlags)

        val commandLine = GeneralCommandLine().apply {
            exePath = nodePath
            addParameter(turl)
            addParameters(flags)
            withWorkDirectory(project.basePath)
            withCharset(StandardCharsets.UTF_8)
            withEnvironment("FORCE_COLOR", "1")
            if (settings.grokApiKey.isNotBlank()) {
                withEnvironment("GROK_API_KEY", settings.grokApiKey)
            }
            withEnvironment("PATH", buildPathEnv())
        }

        consoleView.clear()
        consoleView.print(
            "Running: turl-release ${flags.joinToString(" ")}\n\n",
            ConsoleViewContentType.SYSTEM_OUTPUT
        )

        val handler = OSProcessHandler(commandLine)
        currentHandler = handler

        handler.addProcessListener(object : ProcessAdapter() {
            override fun onTextAvailable(event: ProcessEvent, outputType: Key<*>) {
                val contentType = when (outputType) {
                    ProcessOutputTypes.STDERR -> ConsoleViewContentType.ERROR_OUTPUT
                    ProcessOutputTypes.SYSTEM -> ConsoleViewContentType.SYSTEM_OUTPUT
                    else -> ConsoleViewContentType.NORMAL_OUTPUT
                }
                consoleView.print(event.text, contentType)
            }

            override fun processTerminated(event: ProcessEvent) {
                val exitCode = event.exitCode
                val msg = if (exitCode == 0) "\nRelease completed successfully.\n"
                else "\nProcess exited with code $exitCode.\n"
                val type = if (exitCode == 0) ConsoleViewContentType.SYSTEM_OUTPUT
                else ConsoleViewContentType.ERROR_OUTPUT
                consoleView.print(msg, type)
                currentHandler = null
            }
        })

        consoleView.attachToProcess(handler)
        handler.startNotify()
    }

    fun stop() {
        currentHandler?.destroyProcess()
        currentHandler = null
    }

    fun sendInput(text: String) {
        currentHandler?.processInput?.writer(StandardCharsets.UTF_8)?.apply {
            write(text + "\n")
            flush()
        }
    }

    private fun resolveNodePath(configuredPath: String): String {
        if (configuredPath.isNotBlank() && File(configuredPath).exists()) return configuredPath

        val home = System.getProperty("user.home")
        val nvmDir = File("$home/.nvm/versions/node")
        if (nvmDir.exists()) {
            val latest = nvmDir.listFiles()
                ?.filter { it.isDirectory }
                ?.sortedByDescending { it.name }
                ?.firstOrNull()
            if (latest != null) {
                val nodeExe = File(latest, "bin/node")
                if (nodeExe.exists()) return nodeExe.absolutePath
            }
        }

        val candidates = listOf(
            "/usr/local/bin/node",
            "/opt/homebrew/bin/node"
        )
        for (candidate in candidates) {
            if (File(candidate).exists()) return candidate
        }

        return "node"
    }

    private fun resolveTurlPath(): String? {
        val home = System.getProperty("user.home")

        val nvmDir = File("$home/.nvm/versions/node")
        if (nvmDir.exists()) {
            val latest = nvmDir.listFiles()
                ?.filter { it.isDirectory }
                ?.sortedByDescending { it.name }
                ?.firstOrNull()
            if (latest != null) {
                val turlLib = File(latest, "lib/node_modules/turl-release/src/index.js")
                if (turlLib.exists()) return turlLib.absolutePath

                val turlBin = File(latest, "bin/turl-release")
                if (turlBin.exists()) return turlBin.absolutePath
            }
        }

        val globalPaths = listOf(
            "/usr/local/bin/turl-release",
            "/opt/homebrew/bin/turl-release",
            "$home/.npm-global/bin/turl-release"
        )
        for (path in globalPaths) {
            if (File(path).exists()) return path
        }

        return null
    }

    private fun buildPathEnv(): String {
        val home = System.getProperty("user.home")
        val existingPath = System.getenv("PATH") ?: ""
        val nvmDir = File("$home/.nvm/versions/node")
        val nvmBin = if (nvmDir.exists()) {
            nvmDir.listFiles()
                ?.filter { it.isDirectory }
                ?.sortedByDescending { it.name }
                ?.firstOrNull()
                ?.let { "${it.absolutePath}/bin" }
        } else null

        val extraPaths = listOfNotNull(
            nvmBin,
            "/usr/local/bin",
            "/opt/homebrew/bin"
        )
        return (extraPaths + existingPath).joinToString(":")
    }
}

