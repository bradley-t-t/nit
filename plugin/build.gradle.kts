import groovy.json.JsonSlurper

fun resolveVersion(): String {
    val packageJsonFile = rootProject.file("../package.json")
    if (packageJsonFile.exists()) {
        val parsed = JsonSlurper().parseText(packageJsonFile.readText()) as Map<*, *>
        val ver = parsed["version"]?.toString()
        if (!ver.isNullOrBlank()) return ver
    }
    return providers.gradleProperty("pluginVersion").get()
}

plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "1.9.25"
    id("org.jetbrains.intellij") version "1.17.4"
}

group = providers.gradleProperty("pluginGroup").get()
version = resolveVersion()

repositories {
    mavenCentral()
}

kotlin {
    jvmToolchain(17)
}

intellij {
    pluginName.set(providers.gradleProperty("pluginName"))
    version.set(providers.gradleProperty("platformVersion"))
    type.set(providers.gradleProperty("platformType"))
}

tasks {
    patchPluginXml {
        version.set(resolveVersion())
        sinceBuild.set(providers.gradleProperty("pluginSinceBuild"))
        untilBuild.set(providers.gradleProperty("pluginUntilBuild"))
    }

    buildSearchableOptions {
        enabled = false
    }
}

