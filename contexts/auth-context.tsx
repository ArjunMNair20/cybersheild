"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { supabase } from "@/lib/supabase-config"
import { generateAndStoreKeys, getPublicKey } from "@/lib/key-management"
import type { Session, User } from "@supabase/supabase-js"

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  error: Error | null
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  getUserPublicKey: (email: string) => Promise<string | null>
  getPrivateKeyLocally: () => string | null
  retryKeyGeneration: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const PRIVATE_KEY_STORAGE_KEY = "cybershield_private_key"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const ensureKeysExist = async (email: string | undefined) => {
    if (!email) {
      console.warn("No email provided to ensureKeysExist")
      return
    }

    try {
      setError(null)
      const publicKey = await getPublicKey(email)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email_confirmed_at) {
        console.log("User email not verified, skipping key generation")
        return
      }

      if (!publicKey) {
        const keys = await generateAndStoreKeys(email)
        if (keys?.privateKey) {
          localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, keys.privateKey)
        }
      }
    } catch (error) {
      console.error("Error in ensureKeysExist:", error)
    }
  }

  const retryKeyGeneration = async () => {
    if (!user?.email) {
      const error = new Error("No user email available for key generation")
      console.error(error)
      setError(error)
      return
    }

    try {
      setError(null)
      await ensureKeysExist(user.email)
    } catch (error) {
      console.error("Error in retryKeyGeneration:", error)
      setError(error instanceof Error ? error : new Error(String(error)))
    }
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user?.email) {
        ensureKeysExist(session.user.email).catch(console.error)
      }

      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string) => {
    try {
      setError(null)
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        console.error("Signup error:", error)
        setError(new Error(error.message))
      }
      return { error }
    } catch (error) {
      console.error("Error in signUp:", error)
      setError(error instanceof Error ? error : new Error("Unknown signup error"))
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setError(null)
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError) {
        console.error("Signin error:", signInError)
        setError(new Error(signInError.message))
        return { error: signInError }
      }

      if (data.user?.email) {
        ensureKeysExist(data.user.email).catch(console.error)
      }

      return { error: null }
    } catch (error) {
      console.error("Error in signIn:", error)
      setError(error instanceof Error ? error : new Error("Unknown signin error"))
      return { error }
    }
  }

  const signOut = async () => {
    try {
      setError(null)
      localStorage.removeItem(PRIVATE_KEY_STORAGE_KEY)
      await supabase.auth.signOut()
    } catch (error) {
      console.error("Error during signout:", error)
      setError(error instanceof Error ? error : new Error("Unknown signout error"))
      localStorage.removeItem(PRIVATE_KEY_STORAGE_KEY)
    }
  }

  const getUserPublicKey = async (email: string): Promise<string | null> => {
    if (!email) {
      const error = new Error("No email provided to getUserPublicKey")
      console.error(error)
      setError(error)
      return null
    }

    try {
      setError(null)
      const publicKey = await getPublicKey(email)
      if (!publicKey) {
        console.warn(`No public key found for user: ${email}`)
      }
      return publicKey
    } catch (error) {
      console.error("Error fetching public key:", error)
      setError(error instanceof Error ? error : new Error("Failed to fetch public key"))
      return null
    }
  }

  const getPrivateKeyLocally = (): string | null => {
    try {
      setError(null)
      const privateKey = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY)
      if (!privateKey) {
        console.warn("No private key found in local storage")
        return null
      }
      return privateKey
    } catch (error) {
      console.error("Error retrieving private key:", error)
      setError(error instanceof Error ? error : new Error("Failed to retrieve private key"))
      return null
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        error,
        signUp,
        signIn,
        signOut,
        getUserPublicKey,
        getPrivateKeyLocally,
        retryKeyGeneration,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

const Account = () => {
  const { user, getUserPublicKey, getPrivateKeyLocally, error } = useAuth()
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [privateKey, setPrivateKey] = useState<string | null>(null)

  useEffect(() => {
    if (user?.email) {
      getUserPublicKey(user.email).then(setPublicKey).catch(console.error)
      setPrivateKey(getPrivateKeyLocally())
    }
  }, [user])

  return (
    <div>
      <h1>Account</h1>
      {error && <p style={{ color: 'red' }}>{error.message}</p>}
      <p>Email: {user?.email}</p>
      <p>Public Key: {publicKey}</p>
      <p>Private Key: {privateKey}</p>
    </div>
  )
}

export default Account

