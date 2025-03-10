import JSEncrypt from "jsencrypt"

// Generate RSA key pair
export function generateKeyPair(): { publicKey: string; privateKey: string } {
  try {
    console.log("Creating JSEncrypt instance...")
    const encrypt = new JSEncrypt({ default_key_size: '2048' })
    
    // Generate key pair
    console.log("Generating key pair...")
    const key = encrypt.getKey()
    
    if (!key) {
      throw new Error("Failed to generate key pair")
    }

    console.log("Getting public key...")
    const publicKey = encrypt.getPublicKey()
    
    console.log("Getting private key...")
    const privateKey = encrypt.getPrivateKey()

    if (!publicKey || !privateKey) {
      throw new Error("Failed to extract public or private key")
    }

    // Verify the keys by trying to encrypt and decrypt a test message
    console.log("Verifying keys...")
    const testMessage = "test"
    
    // Test encryption
    const testEncrypt = new JSEncrypt()
    testEncrypt.setPublicKey(publicKey)
    const encrypted = testEncrypt.encrypt(testMessage)
    if (!encrypted) {
      throw new Error("Key verification failed - encryption test failed")
    }

    // Test decryption
    const testDecrypt = new JSEncrypt()
    testDecrypt.setPrivateKey(privateKey)
    const decrypted = testDecrypt.decrypt(encrypted)
    if (decrypted !== testMessage) {
      throw new Error("Key verification failed - decryption test failed")
    }

    console.log("Keys verified successfully")
    return {
      publicKey,
      privateKey,
    }
  } catch (error: unknown) {
    console.error("Error generating key pair:", error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to generate encryption keys: ${errorMessage}`)
  }
}

// Encrypt message with recipient's public key
export function encryptMessage(message: string, publicKey: string): string {
  const encrypt = new JSEncrypt()
  encrypt.setPublicKey(publicKey)
  const encrypted = encrypt.encrypt(message)
  if (!encrypted) {
    throw new Error("Failed to encrypt message")
  }
  return encrypted
}

// Decrypt message with user's private key
export function decryptMessage(encryptedMessage: string, privateKey: string): string {
  const decrypt = new JSEncrypt()
  decrypt.setPrivateKey(privateKey)
  const decrypted = decrypt.decrypt(encryptedMessage)
  if (!decrypted) {
    throw new Error("Failed to decrypt message")
  }
  return decrypted
}

