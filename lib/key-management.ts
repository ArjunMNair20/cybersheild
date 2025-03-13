import { supabase } from "@/lib/supabase-config"

// Retry wrapper for database operations
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any
  let attempts = 0
  
  while (attempts < maxRetries) {
    try {
      attempts++
      console.log(`Attempt ${attempts}/${maxRetries}...`)
      return await operation()
    } catch (error) {
      lastError = error
      console.error(`Attempt ${attempts} failed:`, {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      
      if (attempts < maxRetries) {
        console.log(`Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  console.error('All retry attempts failed:', {
    totalAttempts: attempts,
    finalError: lastError
  })
  throw lastError
}

// Generate RSA key pair
export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  try {
    if (typeof window === 'undefined') {
      throw new Error('Key generation must be performed in the browser')
    }

    console.log('Generating RSA key pair...')
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

    console.log('Key pair generated, exporting keys...')
    const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey)
    const privateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey)

    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKey)))
    const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKey)))

    console.log('Keys exported and encoded successfully')
    return {
      publicKey: `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64}\n-----END PUBLIC KEY-----`,
      privateKey: `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64}\n-----END PRIVATE KEY-----`
    }
  } catch (error) {
    console.error('Error generating key pair:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    throw new Error('Failed to generate key pair: ' + (error instanceof Error ? error.message : String(error)))
  }
}

// Store public key in user_profiles
export async function storePublicKey(email: string, publicKey: string) {
  console.log('Attempting to store public key for:', email)
  
  return withRetry(async () => {
    // First, check if the user profile exists
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (profileError) {
      console.error('Error checking user profile:', profileError)
      throw new Error(`Failed to check user profile: ${profileError.message}`)
    }

    if (!profile) {
      // Create user profile if it doesn't exist
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert([{ email, public_key: publicKey }])

      if (insertError) {
        console.error('Error creating user profile:', insertError)
        throw new Error(`Failed to create user profile: ${insertError.message}`)
      }
    } else {
      // Update existing profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ public_key: publicKey })
        .eq('email', email)

      if (updateError) {
        console.error('Error updating user profile:', updateError)
        throw new Error(`Failed to update user profile: ${updateError.message}`)
      }
    }

    // Verify the key was stored
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_profiles')
      .select('public_key')
      .eq('email', email)
      .maybeSingle()

    if (verifyError || !verifyData?.public_key) {
      console.error('Error verifying stored key:', verifyError)
      throw new Error('Failed to verify stored key')
    }

    if (verifyData.public_key !== publicKey) {
      console.error('Stored key verification failed')
      throw new Error('Stored key verification failed')
    }

    console.log('Public key stored and verified successfully')
    return true
  })
}

// Get public key from user_profiles
export async function getPublicKey(email: string): Promise<string | null> {
  console.log('Attempting to fetch public key for:', email)
  
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('public_key')
      .eq('email', email)
      .maybeSingle()

    if (error) {
      console.error('Error fetching public key:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw new Error(`Failed to fetch public key: ${error.message}`)
    }

    if (!data?.public_key) {
      console.warn(`No public key found for user: ${email}`)
      return null
    }

    // Validate the key format
    const publicKeyPattern = /^-----BEGIN PUBLIC KEY-----\n[A-Za-z0-9+/=\n]+-----END PUBLIC KEY-----$/
    if (!publicKeyPattern.test(data.public_key.trim())) {
      console.error('Invalid public key format:', data.public_key)
      return null
    }

    console.log('Public key fetched and validated successfully')
    return data.public_key
  })
}

// Generate and store keys for a new user
export async function generateAndStoreKeys(email: string) {
  console.log('Starting key generation and storage process for:', email)
  
  return withRetry(async () => {
    try {
      // Check if keys already exist
      console.log('Checking for existing keys...')
      const existingKey = await getPublicKey(email)
      
      if (existingKey) {
        console.warn('Keys already exist for this user')
        throw new Error('Keys already exist for this user')
      }

      // Generate new key pair
      console.log('Generating new key pair...')
      const keys = await generateKeyPair()

      // Store public key in user_profiles
      console.log('Storing public key...')
      await storePublicKey(email, keys.publicKey)

      console.log('Key generation and storage completed successfully')
      return keys
    } catch (error) {
      console.error('Error in generateAndStoreKeys:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      throw new Error('Failed to generate and store keys: ' + (error instanceof Error ? error.message : String(error)))
    }
  })
}