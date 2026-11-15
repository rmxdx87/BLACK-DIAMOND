'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useTheme } from '@/contexts/theme-context'
import { AVAILABLE_THEMES, THEME_MAP } from '@/lib/themes'
import { Palette, Moon, Sun, Copy, Check } from 'lucide-react'

export function ThemeManager() {
  const { currentThemeId, isDark, setTheme, setIsDark } = useTheme()
  const [copied, setCopied] = useState(false)
  const [previewTheme, setPreviewTheme] = useState<string | null>(null)

  const theme = THEME_MAP[currentThemeId]
  const activeTheme = previewTheme ? THEME_MAP[previewTheme] : theme

  const handleThemeChange = async (themeId: string) => {
    await setTheme(themeId)
    setPreviewTheme(null)
  }

  const handlePreview = (themeId: string) => {
    setPreviewTheme(themeId === previewTheme ? null : themeId)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="flex items-center gap-3 mb-2">
          <Palette className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Theme Manager</h1>
        </div>
        <p className="text-muted-foreground">
          Customize your entire website's appearance including colors, animations, and layout
        </p>
      </Card>

      {/* Dark Mode Toggle */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Appearance Mode</h2>
          <div className="flex gap-2">
            <Button
              variant={!isDark ? 'default' : 'outline'}
              onClick={() => setIsDark(false)}
              className="gap-2"
            >
              <Sun className="w-4 h-4" />
              Light Mode
            </Button>
            <Button
              variant={isDark ? 'default' : 'outline'}
              onClick={() => setIsDark(true)}
              className="gap-2"
            >
              <Moon className="w-4 h-4" />
              Dark Mode
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Choose between light and dark appearance. Changes apply instantly across all pages.
        </p>
      </Card>

      {/* Theme Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {AVAILABLE_THEMES.map(themeOption => (
          <Card
            key={themeOption.id}
            className={`p-6 cursor-pointer transition-all border-2 ${
              currentThemeId === themeOption.id
                ? 'border-primary bg-primary/5'
                : previewTheme === themeOption.id
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-primary'
            }`}
            onClick={() => handleThemeChange(themeOption.id)}
          >
            {/* Color Preview */}
            <div className="mb-4 flex gap-2">
              {Object.values(themeOption.dark)
                .slice(0, 8)
                .map((color, idx) => (
                  <div
                    key={idx}
                    className="w-8 h-8 rounded-lg border border-border"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
            </div>

            {/* Theme Info */}
            <h3 className="text-lg font-bold mb-1">{themeOption.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{themeOption.description}</p>

            {/* Preview Details */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-4 p-3 bg-muted rounded-lg">
              <div>
                <span className="text-muted-foreground">Animation:</span>
                <br />
                <span className="font-mono text-foreground">{themeOption.animations.primaryDuration}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Radius:</span>
                <br />
                <span className="font-mono text-foreground">{themeOption.borderRadius}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              {currentThemeId === themeOption.id ? (
                <Button disabled className="flex-1">
                  <Check className="w-4 h-4 mr-2" />
                  Active
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={e => {
                      e.stopPropagation()
                      handlePreview(themeOption.id)
                    }}
                    className="flex-1"
                  >
                    {previewTheme === themeOption.id ? 'Previewing...' : 'Preview'}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={e => {
                      e.stopPropagation()
                      handleThemeChange(themeOption.id)
                    }}
                  >
                    Apply
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Current Theme Details */}
      {activeTheme && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            {previewTheme ? 'Preview: ' : 'Current Theme: '} {activeTheme.name}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Colors */}
            <div>
              <h3 className="font-semibold mb-3">Color Palette</h3>
              <div className="space-y-2">
                {Object.entries(activeTheme.dark)
                  .slice(0, 12)
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted"
                    >
                      <span className="text-sm font-mono capitalize">{key}:</span>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border border-border"
                          style={{ backgroundColor: value }}
                        />
                        <span className="text-xs font-mono text-muted-foreground">{value}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(value)
                            setCopied(true)
                            setTimeout(() => setCopied(false), 2000)
                          }}
                          className="hover:text-primary transition-colors"
                        >
                          {copied ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Animation & Typography */}
            <div>
              <h3 className="font-semibold mb-3">Animation & Typography</h3>
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Primary Duration:</span>
                  <p className="font-mono text-lg text-foreground">
                    {activeTheme.animations.primaryDuration}
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Easing Function:</span>
                  <p className="font-mono text-xs text-foreground break-all">
                    {activeTheme.animations.easingFunction}
                  </p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Border Radius:</span>
                  <p className="font-mono text-lg text-foreground">{activeTheme.borderRadius}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Apply Button for Preview */}
          {previewTheme === activeTheme.id && (
            <Button className="w-full mt-4" onClick={() => handleThemeChange(activeTheme.id)}>
              Apply This Theme
            </Button>
          )}
        </Card>
      )}
    </div>
  )
}
