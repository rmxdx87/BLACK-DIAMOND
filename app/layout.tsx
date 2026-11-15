import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { SettingsProvider } from "@/contexts/settings-context"
import { FirebaseProvider } from "@/contexts/firebase-context"
import { ThemeProvider } from "@/contexts/theme-context"
import { AppShell } from "@/components/app-shell"
import { AudioPlayerProvider } from "@/contexts/audio-player-context"
import "./globals.css"

export const metadata: Metadata = {
  title: "BLACK DIAMOND — Prediction Analytics Terminal",
  description: "A private analytics terminal for live history, pattern research, and transparent prediction insights.",
  applicationName: "BLACK DIAMOND",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-background text-foreground font-sans">
        <FirebaseProvider>
          <ThemeProvider>
            <SettingsProvider>
              <AudioPlayerProvider>
                <AppShell>{children}</AppShell>
              </AudioPlayerProvider>
            </SettingsProvider>
          </ThemeProvider>
        </FirebaseProvider>
      </body>
    </html>
  )
}
