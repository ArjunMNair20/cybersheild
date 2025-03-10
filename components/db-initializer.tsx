"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, RefreshCw } from "lucide-react"

export function DbInitializer({ onInitialized }: { onInitialized: () => void }) {
  const [initializing, setInitializing] = useState(false)
  const [error, setError] = useState("")

  const initializeDatabase = async () => {
    try {
      setInitializing(true)
      setError("")

      const response = await fetch("/api/init-db")
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to initialize database")
      }

      onInitialized()
    } catch (err: any) {
      console.error("Error initializing database:", err)
      setError(err.message)
    } finally {
      setInitializing(false)
    }
  }

  return (
    <Alert className="mb-6 border-amber-500 bg-amber-500/10">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertTitle>Database tables not initialized</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>
          The required database tables have not been created yet. Click the button below to initialize the database.
        </p>
        <div>
          <Button variant="outline" size="sm" onClick={initializeDatabase} disabled={initializing} className="mt-2">
            {initializing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Initializing...
              </>
            ) : (
              "Initialize Database"
            )}
          </Button>
          {error && <p className="text-destructive text-sm mt-2">{error}</p>}
        </div>
      </AlertDescription>
    </Alert>
  )
}

