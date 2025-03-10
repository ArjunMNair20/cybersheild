"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Shield } from "lucide-react"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login page after a brief delay
    const timer = setTimeout(() => {
      router.push("/login")
    }, 2000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-secondary/20">
      <div className="bg-primary/10 p-6 rounded-full mb-4">
        <Shield className="h-16 w-16 text-primary animate-pulse" />
      </div>
      <h1 className="text-4xl font-bold mb-2">CyberShield</h1>
      <p className="text-muted-foreground">Secure Messaging Platform</p>
    </div>
  )
}

