"use client"

import type React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Shield, Lock, Mail, Key, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { ThemeToggle } from "@/components/theme-toggle"
import { generateAndStoreKeys } from "@/lib/key-service"
import { createClient } from '@supabase/supabase-js'

const PRIVATE_KEY_STORAGE_KEY = "cybershield_private_key"

// Create Supabase client once, outside component
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface PasswordRequirement {
  text: string;
  regex: RegExp;
  met: boolean;
}

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormError {
  message: string;
  type: 'error' | 'success';
}

const initialFormState: FormState = {
  email: "",
  password: "",
  confirmPassword: ""
}

export default function SignupPage() {
  const [formState, setFormState] = useState<FormState>(initialFormState)
  const [error, setError] = useState<FormError | null>(null)
  const [loading, setLoading] = useState(false)
  const [showRequirements, setShowRequirements] = useState(false)
  const router = useRouter()

  // Define password requirements using useMemo to prevent recreation
  const passwordRequirements: PasswordRequirement[] = useMemo(() => [
    {
      text: "At least one lowercase letter (a-z)",
      regex: /[a-z]/,
      met: false
    },
    {
      text: "At least one uppercase letter (A-Z)",
      regex: /[A-Z]/,
      met: false
    },
    {
      text: "At least one number (0-9)",
      regex: /[0-9]/,
      met: false
    },
    {
      text: "At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)",
      regex: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/,
      met: false
    },
    {
      text: "At least 8 characters long",
      regex: /.{8,}/,
      met: false
    }
  ], [])

  const [requirements, setRequirements] = useState<PasswordRequirement[]>(passwordRequirements)

  // Update requirements when password changes
  useEffect(() => {
    const updatedRequirements = passwordRequirements.map(req => ({
      ...req,
      met: req.regex.test(formState.password)
    }))
    setRequirements(updatedRequirements)
  }, [formState.password, passwordRequirements])

  const allRequirementsMet = useMemo(() => 
    requirements.every(req => req.met), 
    [requirements]
  )

  // Handle form input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormState(prev => ({
      ...prev,
      [name]: value
    }))
  }, [])

  // Handle signup process
  const handleSignup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)

      const { email, password, confirmPassword } = formState

      if (!allRequirementsMet) {
        setError({ message: "Please meet all password requirements", type: 'error' })
        return
      }

      if (password !== confirmPassword) {
        setError({ message: "Passwords do not match", type: 'error' })
        return
      }

      console.log("Starting signup process...")

      const redirectTo = `${window.location.origin}/auth/callback`
      
      // Create user account with Supabase
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: { email_confirm: true }
        }
      })

      if (signUpError) throw signUpError

      if (!signUpData.user) {
        throw new Error("No user data returned from signup")
      }

      // Show success message
      setError({
        message: "Account created! Please check your email (including spam folder) for a verification link from Supabase. " +
                "The email will be from 'noreply@mail.app.supabase.io'. " +
                "You must verify your email before accessing the dashboard.",
        type: 'success'
      })

      // Generate and store keys if session exists
      if (signUpData.session) {
        try {
          const keys = await generateAndStoreKeys(email)
          if (keys?.privateKey) {
            localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, keys.privateKey)
          }
        } catch (keyError: any) {
          console.error("Key generation error:", keyError)
        }
      }

    } catch (err: any) {
      console.error("Signup error:", err)
      setError({
        message: err.message || "An error occurred during signup",
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }, [formState, allRequirementsMet])

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
            <CardDescription className="text-center">Create an account to start secure messaging</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
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
                    onFocus={() => setShowRequirements(true)}
                    required
                    className="pl-10"
                  />
                </div>
                {showRequirements && (
                  <div className="text-sm space-y-1 p-2 bg-muted/50 rounded-md">
                    {requirements.map((req, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        {req.met ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-destructive" />
                        )}
                        <span className={req.met ? "text-green-500" : "text-muted-foreground"}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm Password"
                    value={formState.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              {error && (
                <div className={`p-2 border rounded text-sm ${
                  error.type === 'error' 
                    ? 'bg-destructive/10 border-destructive/20 text-destructive' 
                    : 'bg-green-500/10 border-green-500/20 text-green-500'
                }`}>
                  {error.message}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground cyber-scan"
                disabled={loading || !allRequirementsMet}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    <span>Creating Secure Account...</span>
                  </div>
                ) : (
                  "Sign Up"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <div className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline cyber-glow">
                Log in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

