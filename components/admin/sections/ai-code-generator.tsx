"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { generateMultipleCodes, type GeneratedCode } from "@/lib/ai-code-generator"
import { useUserAccess } from "@/hooks/use-user-access"
import { Sparkles, Copy, RefreshCw, User, Shield, Zap, Brain, CheckCircle } from "lucide-react"

export function AICodeGenerator() {
  const { addUser, users } = useUserAccess()
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedCode[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedCode, setSelectedCode] = useState<GeneratedCode | null>(null)
  const [userName, setUserName] = useState("")
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const generateCodes = async () => {
    setIsGenerating(true)

    // Simulate AI processing time
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const codes = generateMultipleCodes(6)
    setGeneratedCodes(codes)
    setIsGenerating(false)
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const createUser = () => {
    if (!selectedCode || !userName.trim()) return

    addUser(userName.trim(), selectedCode.code)
    setUserName("")
    setSelectedCode(null)
    setGeneratedCodes([])
  }

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case "maximum":
        return "text-green-400 border-green-500/30 bg-green-500/10"
      case "high":
        return "text-blue-400 border-blue-500/30 bg-blue-500/10"
      case "medium":
        return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
      case "low":
        return "text-red-400 border-red-500/30 bg-red-500/10"
      default:
        return "text-gray-400 border-gray-500/30 bg-gray-500/10"
    }
  }

  const getPatternIcon = (type: string) => {
    switch (type) {
      case "secure":
        return <Shield className="h-4 w-4" />
      case "themed":
        return <Brain className="h-4 w-4" />
      case "memorable":
        return <Zap className="h-4 w-4" />
      case "random":
        return <Sparkles className="h-4 w-4" />
      default:
        return <Sparkles className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-mono font-bold text-green-400 flex items-center gap-2">
            <Brain className="h-6 w-6" />
            AI Access Code Generator
          </h2>
          <p className="text-green-300/70 font-mono text-sm mt-1">
            Neural network powered secure access code generation
          </p>
        </div>

        <Button
          onClick={generateCodes}
          disabled={isGenerating}
          className="bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/40 font-mono transition-all duration-300 hover:scale-105 neon-border"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              <span className="loading-dots">GENERATING</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate AI Codes
            </>
          )}
        </Button>
      </div>

      {isGenerating && (
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-green-400 font-mono mb-2">
                <span className="loading-dots">AI NEURAL NETWORK PROCESSING</span>
              </div>
              <div className="text-green-300/70 font-mono text-sm">
                Analyzing security patterns and generating optimal access codes...
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {generatedCodes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {generatedCodes.map((generated, index) => (
            <Card
              key={index}
              className={`bg-gray-900/50 border-green-500/30 cursor-pointer transition-all duration-300 hover:scale-105 ${
                selectedCode?.code === generated.code ? "ring-2 ring-green-400 bg-green-500/10" : ""
              }`}
              onClick={() => setSelectedCode(generated)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-green-400 font-mono text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getPatternIcon(generated.pattern.type)}
                    {generated.pattern.type.toUpperCase()}
                  </div>
                  <Badge className={getStrengthColor(generated.strength)}>{generated.strength.toUpperCase()}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center">
                  <div className="text-2xl font-mono text-green-300 tracking-widest bg-black/50 p-2 rounded border border-green-500/20">
                    {generated.code}
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      copyToClipboard(generated.code)
                    }}
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-green-400 hover:text-green-300"
                  >
                    {copiedCode === generated.code ? (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    {copiedCode === generated.code ? "Copied!" : "Copy"}
                  </Button>
                </div>

                <div className="text-xs font-mono text-green-300/70">
                  <div className="mb-1">Pattern: {generated.pattern.example}</div>
                  <div>{generated.pattern.description}</div>
                </div>

                {generated.suggestedUserName && (
                  <div className="text-xs font-mono text-blue-400 bg-blue-500/10 p-2 rounded border border-blue-500/20">
                    <User className="h-3 w-3 inline mr-1" />
                    Suggested: {generated.suggestedUserName}
                  </div>
                )}

                <div className="text-xs font-mono text-green-400/60 italic">{generated.reasoning}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedCode && (
        <Card className="bg-gray-900/50 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-400 font-mono flex items-center gap-2">
              <User className="h-5 w-5" />
              Create New User
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-green-400 font-mono text-sm mb-2">Selected Access Code</label>
                <div className="text-xl font-mono text-green-300 tracking-widest bg-black/50 p-3 rounded border border-green-500/20 text-center">
                  {selectedCode.code}
                </div>
              </div>
              <div>
                <label className="block text-green-400 font-mono text-sm mb-2">User Name</label>
                <Input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder={selectedCode.suggestedUserName || "Enter user name"}
                  className="bg-black/50 border-green-500 text-green-400 font-mono focus:border-green-300 focus:ring-green-300/20"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={createUser}
                disabled={!userName.trim()}
                className="bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/40 font-mono transition-all duration-300 hover:scale-105 neon-border"
              >
                <User className="h-4 w-4 mr-2" />
                Create User
              </Button>
              <Button
                onClick={() => {
                  setSelectedCode(null)
                  setUserName("")
                }}
                variant="outline"
                className="border-gray-500/30 text-gray-400 hover:bg-gray-500/10 font-mono"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gray-900/50 border-green-500/30">
        <CardHeader>
          <CardTitle className="text-green-400 font-mono text-sm">Active Users: {users.length}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-green-300/70 font-mono text-xs">Total registered users with active access codes</div>
        </CardContent>
      </Card>
    </div>
  )
}
