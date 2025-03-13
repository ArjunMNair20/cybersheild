"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Shield } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    setIsRedirecting(true)
    // Reduce redirect delay to 500ms
    const timer = setTimeout(() => {
      router.push("/login")
    }, 500)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-secondary/20">
      <div className="bg-primary/10 p-6 rounded-full mb-4 relative">
        <Shield className="h-16 w-16 text-primary animate-pulse" />
        {isRedirecting && (
          <div className="absolute inset-0 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
        )}
      </div>
      <h1 className="text-4xl font-bold mb-2">CyberShield</h1>
      <p className="text-muted-foreground">Secure Messaging Platform</p>
      {isRedirecting && (
        <p className="text-sm text-muted-foreground mt-4 animate-pulse">Redirecting to login...</p>
      )}
    </div>
  )
}

