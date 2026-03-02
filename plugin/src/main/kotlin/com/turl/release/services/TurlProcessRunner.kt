package com.turl.release.services

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.process.OSProcessHandler
import com.intellij.execution.process.ProcessAdapter
import com.intellij.execution.process.ProcessEvent
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Key
import com.turl.release.settings.TurlSettings
import java.io.File
import java.nio.charset.StandardCharsets

enum class RunState { IDLE, RUNNING, SUCCESS, FAILED }

interface TurlOutputListener {
    fun onOutputLine(cleanLine: String)
    fun onProcessFinished(exitCode: Int)
}

class TurlProcessRunner(private val project: Project) {

    private val ansiPattern = Regex("\u001B\\[[0-9;]*[a-zA-Z]|\u001B\\[\\?[0-9]*[a-zA-Z]|\u001B\\[[0-9]*[JHK]")
    private val homeDir = System.getProperty("user.home")
    private val nvmBaseDir = File("$homeDir/.nvm/versions/node")

    private var currentHandler: OSProcessHandler? = null
    private var listener: TurlOutputListener? = null

    var runState: RunState = RunState.IDLE
        private set

    val isRunning: Boolean get() = runState == RunState.RUNNING

    fun setOutputListener(l: TurlOutputListener) { listener = l }

    fun execute(vararg extraFlags: String) {
        if (isRunning) return

        val settings = TurlSettings.getInstance().state
        val nodePath = resolveNodePath(settings.nodePath)
        val turlPath = resolveTurlPath()

        if (turlPath == null) {
            listener?.onOutputLine("Could not find turl-release. Ensure it is installed globally via npm.")
            runState = RunState.FAILED
            listener?.onProcessFinished(1)
            return
        }

        val flags = buildFlagList(settings, extraFlags)
        val commandLine = buildCommandLine(nodePath, turlPath, flags, settings)

        runState = RunState.RUNNING
        val handler = OSProcessHandler(commandLine)
        currentHandler = handler

        handler.addProcessListener(object : ProcessAdapter() {
            override fun onTextAvailable(event: ProcessEvent, outputType: Key<*>) {
                ansiPattern.replace(event.text, "")
                    .lines()
                    .filter { it.isNotBlank() }
                    .forEach { listener?.onOutputLine(it.trim()) }
            }

            override fun processTerminated(event: ProcessEvent) {
                runState = if (event.exitCode == 0) RunState.SUCCESS else RunState.FAILED
                currentHandler = null
                listener?.onProcessFinished(event.exitCode)
            }
        })

        handler.startNotify()
    }

    fun stop() {
        currentHandler?.destroyProcess()
        currentHandler = null
        runState = RunState.IDLE
    }

    private fun buildFlagList(settings: TurlSettings.State, extraFlags: Array<out String>): List<String> {
        val flags = mutableListOf<String>()
        if (settings.skipUpdateOnRun) flags.add("--skip-update")
        if (settings.defaultBranch.isNotBlank()) {
            flags.add("--branch")
            flags.add(settings.defaultBranch)
        }
        flags.addAll(extraFlags)
        return flags
    }

    private fun buildCommandLine(
        nodePath: String,
        turlPath: String,
        flags: List<String>,
        settings: TurlSettings.State
    ) = GeneralCommandLine().apply {
        exePath = nodePath
        addParameter(turlPath)
        addParameters(flags)
        withWorkDirectory(project.basePath)
        withCharset(StandardCharsets.UTF_8)
        withEnvironment("FORCE_COLOR", "0")
        withEnvironment("NO_COLOR", "1")
        if (settings.grokApiKey.isNotBlank()) withEnvironment("GROK_API_KEY", settings.grokApiKey)
        withEnvironment("PATH", buildPathEnv())
    }

    private fun latestNvmNodeDir(): File? =
        nvmBaseDir.takeIf { it.exists() }
            ?.listFiles()
            ?.filter { it.isDirectory }
            ?.sortedByDescending { it.name }
            ?.firstOrNull()

    private fun resolveNodePath(configuredPath: String): String {
        if (configuredPath.isNotBlank() && File(configuredPath).exists()) return configuredPath
        latestNvmNodeDir()?.let { File(it, "bin/node").takeIf { f -> f.exists() } }?.let { return it.absolutePath }
        return listOf("/usr/local/bin/node", "/opt/homebrew/bin/node")
            .firstOrNull { File(it).exists() } ?: "node"
    }

    private fun resolveTurlPath(): String? {
        latestNvmNodeDir()?.let { nodeDir ->
            listOf("lib/node_modules/turl-release/src/index.js", "bin/turl-release")
                .map { File(nodeDir, it) }
                .firstOrNull { it.exists() }
                ?.let { return it.absolutePath }
        }
        return listOf("/usr/local/bin/turl-release", "/opt/homebrew/bin/turl-release", "$homeDir/.npm-global/bin/turl-release")
            .firstOrNull { File(it).exists() }
    }

    private fun buildPathEnv(): String {
        val existingPath = System.getenv("PATH") ?: ""
        val nvmBin = latestNvmNodeDir()?.let { "${it.absolutePath}/bin" }
        return listOfNotNull(nvmBin, "/usr/local/bin", "/opt/homebrew/bin")
            .plus(existingPath)
            .joinToString(":")
    }
}
