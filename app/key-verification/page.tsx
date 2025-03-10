"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import type { Session, User } from "@supabase/supabase-js"

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  setUserPublicKey: (publicKey: string) => Promise<void>
  getUserPublicKey: (email: string) => Promise<string | null>
  storePrivateKeyLocally: (privateKey: string) => void
  getPrivateKeyLocally: () => string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const PRIVATE_KEY_STORAGE_KEY = "cybershield_private_key"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [publicKeyFetched, setPublicKeyFetched] = useState(false) // Prevent redundant calls

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      authListener.subscription?.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signOut = async () => {
    localStorage.removeItem(PRIVATE_KEY_STORAGE_KEY)
    await supabase.auth.signOut()
  }

  const setUserPublicKey = async (publicKey: string) => {
    if (!user) throw new Error("User not authenticated")

    try {
      console.log(`Storing public key for user: ${user.email}`)

      const { error } = await supabase
        .from("user_profiles")
        .upsert([{ id: user.id, email: user.email, public_key: publicKey }], { onConflict: ["id"] })

      if (error) throw error

      console.log("Public key stored successfully")
    } catch (error) {
      console.error("Error storing public key:", error)
      throw new Error("Failed to store public key")
    }
  }

  const getUserPublicKey = async (email: string): Promise<string | null> => {
    if (!email || publicKeyFetched) return null
    setPublicKeyFetched(true) // Prevent multiple fetches

    try {
      console.log(`Fetching public key for: ${email}`)
      const { data, error } = await supabase
        .from("user_profiles")
        .select("public_key")
        .eq("email", email)
        .maybeSingle()

      if (error) throw error

      return data?.public_key || null
    } catch (error) {
      console.error("Error fetching public key:", error)
      return null
    }
  }

  const storePrivateKeyLocally = (privateKey: string) => {
    try {
      if (!privateKey) throw new Error("No private key provided")
      localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, privateKey)
      console.log("Private key stored in local storage")
    } catch (error) {
      console.error("Error storing private key:", error)
      throw new Error("Failed to store private key")
    }
  }

  const getPrivateKeyLocally = (): string | null => {
    try {
      return localStorage.getItem(PRIVATE_KEY_STORAGE_KEY) || null
    } catch (error) {
      console.error("Error retrieving private key:", error)
      return null
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        setUserPublicKey,
        getUserPublicKey,
        storePrivateKeyLocally,
        getPrivateKeyLocally,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
