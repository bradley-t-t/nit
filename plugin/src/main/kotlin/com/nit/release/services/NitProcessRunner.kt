package com.nit.release.services

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.process.OSProcessHandler
import com.intellij.execution.process.ProcessAdapter
import com.intellij.execution.process.ProcessEvent
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Key
import com.nit.release.settings.AiProvider
import com.nit.release.settings.NitSettings
import java.io.File
import java.nio.charset.StandardCharsets

enum class RunState { IDLE, RUNNING, SUCCESS, FAILED }

interface NitOutputListener {
    fun onOutputLine(cleanLine: String)
    fun onProcessFinished(exitCode: Int)
}

class NitProcessRunner(private val project: Project) {

    private val ansiPattern = Regex("\u001B\\[[0-9;]*[a-zA-Z]|\u001B\\[\\?[0-9]*[a-zA-Z]|\u001B\\[[0-9]*[JHK]")
    private val homeDir = System.getProperty("user.home")
    private val nvmBaseDir = File("$homeDir/.nvm/versions/node")

    private var currentHandler: OSProcessHandler? = null
    private var listener: NitOutputListener? = null

    var runState: RunState = RunState.IDLE
        private set

    val isRunning: Boolean get() = runState == RunState.RUNNING

    fun setOutputListener(l: NitOutputListener) { listener = l }

    fun execute(vararg extraFlags: String) {
        if (isRunning) return

        val workDir = project.basePath
        if (workDir == null) {
            listener?.onOutputLine("No project directory found. Open a project first.")
            runState = RunState.FAILED
            listener?.onProcessFinished(1)
            return
        }

        val settings = NitSettings.getInstance().state
        val nodePath = resolveNodePath(settings.nodePath)
        val nitPath = resolveNitPath()

        if (nitPath == null) {
            listener?.onOutputLine("Could not find nit. Ensure it is installed globally via npm.")
            runState = RunState.FAILED
            listener?.onProcessFinished(1)
            return
        }

        val flags = buildFlagList(settings, extraFlags)
        val commandLine = buildCommandLine(nodePath, nitPath, flags, workDir, settings)

        runState = RunState.RUNNING
        val handler = OSProcessHandler(commandLine)
        currentHandler = handler

        handler.addProcessListener(object : ProcessAdapter() {
            override fun onTextAvailable(event: ProcessEvent, outputType: Key<*>) {
                ansiPattern.replace(event.text, "")
                    .lines()
                    .map { it.trim() }
                    .filter { it.isNotBlank() && !isNodeInvocationLine(it) }
                    .forEach { listener?.onOutputLine(it) }
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

    private fun buildFlagList(settings: NitSettings.State, extraFlags: Array<out String>): List<String> {
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
        nitPath: String,
        flags: List<String>,
        workDir: String,
        settings: NitSettings.State
    ): GeneralCommandLine {
        val provider = try { AiProvider.valueOf(settings.aiProvider) } catch (_: Exception) { AiProvider.GROK }
        return GeneralCommandLine().apply {
            exePath = nodePath
            addParameter(nitPath)
            addParameters(flags)
            withWorkDirectory(workDir)
            withCharset(StandardCharsets.UTF_8)
            withEnvironment("FORCE_COLOR", "0")
            withEnvironment("NO_COLOR", "1")
            if (settings.apiKey.isNotBlank()) {
                withEnvironment(provider.envKey, settings.apiKey)
            }
            withEnvironment("PATH", buildPathEnv())
        }
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

    private fun resolveNitPath(): String? {
        // Project-local install (npm install --save-dev nit)
        project.basePath?.let { base ->
            val localBin = File(base, "node_modules/.bin/nit")
            if (localBin.exists()) return localBin.absolutePath

            // Self-development: running nit on its own repo
            val selfIndex = File(base, "src/index.js")
            val selfPkg = File(base, "package.json")
            if (selfIndex.exists() && selfPkg.exists() && selfPkg.readText().contains("\"name\": \"nit\"")) {
                return selfIndex.absolutePath
            }
        }

        // nvm global install
        latestNvmNodeDir()?.let { nodeDir ->
            listOf("lib/node_modules/nit/src/index.js", "bin/nit")
                .map { File(nodeDir, it) }
                .firstOrNull { it.exists() }
                ?.let { return it.absolutePath }
        }

        // Common global paths
        return listOf("/usr/local/bin/nit", "/opt/homebrew/bin/nit", "$homeDir/.npm-global/bin/nit")
            .firstOrNull { File(it).exists() }
    }

    /** Returns true for lines that are the raw node invocation command (e.g. `/usr/bin/node /path/to/index.js`). */
    private fun isNodeInvocationLine(line: String) =
        line.startsWith("/") && line.contains("node") && (line.contains(".js") || line.contains("/nit"))

    private fun buildPathEnv(): String {
        val existingPath = System.getenv("PATH") ?: ""
        val nvmBin = latestNvmNodeDir()?.let { "${it.absolutePath}/bin" }
        return listOfNotNull(nvmBin, "/usr/local/bin", "/opt/homebrew/bin")
            .plus(existingPath)
            .joinToString(":")
    }
}
