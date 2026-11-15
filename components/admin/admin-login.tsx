"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield } from "lucide-react"

interface AdminLoginProps {
  onLogin: (email: string, password: string) => Promise<void>
  initialError?: string
}

export function AdminLogin({ onLogin, initialError = "" }: AdminLoginProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(initialError)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (!email.trim() || !password) {
      setError("Enter your admin email and password.")
      setIsLoading(false)
      return
    }

    try {
      await onLogin(email, password)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Admin sign-in failed.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="black-diamond-surface grid min-h-screen place-items-center p-4">
      <Card className="dashboard-card w-full max-w-md p-2">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-2xl bg-primary/15 p-3">
            <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold text-foreground">
            Admin sign in
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in with a Firebase account provisioned for administrator access.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Admin email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                disabled={isLoading}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/70"
                placeholder="admin@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                disabled={isLoading}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background/70"
                placeholder="Enter password"
                required
              />
            </div>

            {error && (
              <Alert className="border-destructive/30 bg-destructive/10">
                <AlertDescription className="text-destructive text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary"></div>
                  Authenticating…
                </div>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
