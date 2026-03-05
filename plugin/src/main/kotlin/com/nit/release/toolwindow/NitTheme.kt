package com.nit.release.toolwindow

import com.intellij.ui.JBColor
import java.awt.Color
import java.awt.Font

/** Centralized palette and typography for the Nit Release tool window. */
object NitTheme {

    // Background
    val BG = JBColor(Color(0xF8F9FB), Color(0x1E1F22))

    // Text
    val FG = JBColor(Color(0x1B1D21), Color(0xDCDCDC))
    val FG_DIM = JBColor(Color(0x6B7280), Color(0x8B8F96))
    val FG_MUTED = JBColor(Color(0x9CA3AF), Color(0x5C6370))

    // Accent
    val BLUE = JBColor(Color(0x3B82F6), Color(0x60A5FA))
    val BLUE_MUTED = JBColor(Color(0xDBEAFE), Color(0x1E3A5F))

    // Status
    val SUCCESS = JBColor(Color(0x22C55E), Color(0x4ADE80))
    val SUCCESS_MUTED = JBColor(Color(0xDCFCE7), Color(0x14332A))
    val DANGER = JBColor(Color(0xEF4444), Color(0xF87171))
    val DANGER_MUTED = JBColor(Color(0xFEE2E2), Color(0x3B1C1C))
    val WARN = JBColor(Color(0xF59E0B), Color(0xFBBF24))
    val WARN_MUTED = JBColor(Color(0xFEF3C7), Color(0x3B3316))

    // Surface
    val SURFACE = JBColor(Color(0xFFFFFF), Color(0x27282C))
    val BORDER = JBColor(Color(0xE5E7EB), Color(0x373A3F))

    // Typography
    val FONT_MONO = Font("JetBrains Mono", Font.PLAIN, 11)
    val FONT_BODY = Font("Inter", Font.PLAIN, 12)
    val FONT_SMALL = Font("Inter", Font.PLAIN, 11)
    val FONT_LABEL = Font("Inter", Font.BOLD, 10)
}

