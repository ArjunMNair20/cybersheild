"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Shield, Lock, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { ThemeToggle } from "@/components/theme-toggle"

interface FormState {
  email: string;
  password: string;
}

interface FormError {
  message: string;
  type: 'error' | 'info';
}

const initialFormState: FormState = {
  email: "",
  password: ""
}

export default function LoginPage() {
  const [formState, setFormState] = useState<FormState>(initialFormState)
  const [error, setError] = useState<FormError | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { signIn } = useAuth()

  // Handle form input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormState(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (error) setError(null)
  }, [error])

  // Handle login process
  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      setLoading(true)
      const { email, password } = formState
      
      if (!email || !password) {
        setError({
          message: "Please enter both email and password",
          type: 'error'
        })
        return
      }

      const { error: signInError } = await signIn(email, password)

      if (signInError) {
        throw new Error(signInError.message)
      }

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (err: any) {
      setError({
        message: err.message || "Failed to sign in",
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }, [formState, signIn, router])

  return (
    <div className="min-h-screen flex items-center justify-center cyber-background cyber-noise p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-primary/10 p-3 rounded-full cyber-glow">
            <Shield className="h-10 w-10 text-primary" />
          </div>
        </div>

        <Card className="border-primary/20 shadow-lg backdrop-blur-sm bg-background/80 cyber-scan">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center font-bold cyber-glow">CyberShield</CardTitle>
            <CardDescription className="text-center">Enter your credentials to access secure messaging</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formState.email}
                    onChange={handleInputChange}
                    required
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formState.password}
                    onChange={handleInputChange}
                    required
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className={`p-2 border rounded text-sm ${
                  error.type === 'error'
                    ? 'bg-destructive/10 border-destructive/20 text-destructive'
                    : 'bg-primary/10 border-primary/20 text-primary'
                }`}>
                  {error.message}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground cyber-scan"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  "Log In"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <div className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline cyber-glow">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

