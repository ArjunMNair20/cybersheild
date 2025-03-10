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
  getUserPublicKey: (email: string) => Promise<string | null>
  getPrivateKeyLocally: () => string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const PRIVATE_KEY_STORAGE_KEY = "cybershield_private_key"

// RSA Key Generation Function
const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  )

  const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey)
  const privateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey)

  // Convert to PEM format
  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKey)))
  const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKey)))

  return {
    publicKey: `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64}\n-----END PUBLIC KEY-----`,
    privateKey: `-----BEGIN RSA PRIVATE KEY-----\n${privateKeyBase64}\n-----END RSA PRIVATE KEY-----`
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Generate RSA keys and store them
  const generateAndStoreKeys = async (email: string) => {
    try {
      console.log("Generating new key pair...")
      const { publicKey, privateKey } = await generateKeyPair()

      // Store private key locally first
      console.log("Storing private key locally...")
      localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, privateKey)

      // Store public key in database
      console.log("Storing public key in database...")
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ public_key: publicKey })
        .eq("email", email)

      if (updateError) {
        console.error("Failed to store public key:", updateError)
        localStorage.removeItem(PRIVATE_KEY_STORAGE_KEY)
        throw updateError
      }

      console.log("Key pair generated and stored successfully")
      return true
    } catch (error) {
      console.error("Error in generateAndStoreKeys:", error)
      return false
    }
  }

  // Ensure keys exist for a user
  const ensureKeysExist = async (email: string | undefined) => {
    if (!email) return

    try {
      console.log("Checking for existing keys...")
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("public_key")
        .eq("email", email)
        .maybeSingle()

      if (profileError) throw profileError

      if (!profile?.public_key) {
        console.log("No existing keys found, generating new ones...")
        await generateAndStoreKeys(email)
      } else {
        console.log("Existing keys found")
      }
    } catch (error) {
      console.error("Error in ensureKeysExist:", error)
    }
  }

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user?.email) {
        await ensureKeysExist(session.user.email)
      }
      
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      return { error }
    } catch (error) {
      console.error("Error in signUp:", error)
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    localStorage.removeItem(PRIVATE_KEY_STORAGE_KEY)
    await supabase.auth.signOut()
  }

  // Get public key from user_profiles table
  const getUserPublicKey = async (email: string): Promise<string | null> => {
    if (!email) {
      throw new Error("No email provided")
    }

    const maxRetries = 3
    let retries = 0

    while (retries < maxRetries) {
      try {
        console.log(`Attempt ${retries + 1} of ${maxRetries} to fetch public key for email:`, email)
        
        const { data, error } = await supabase
          .from('user_profiles')
          .select('public_key')
          .eq('email', email)
          .maybeSingle()

        if (error) {
          throw error
        }

        if (!data?.public_key) {
          throw new Error("Public key not found")
        }

        console.log("Public key fetched successfully")
        return data.public_key
      } catch (error) {
        console.error(`Attempt ${retries + 1} failed:`, error)
        retries++
        
        if (retries === maxRetries) {
          return null
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * retries))
      }
    }

    return null
  }

  // Get private key from local storage
  const getPrivateKeyLocally = (): string | null => {
    try {
      const privateKey = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY)
      if (!privateKey) {
        console.warn("No private key found in local storage")
        return null
      }
      return privateKey
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
        getUserPublicKey,
        getPrivateKeyLocally,
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

