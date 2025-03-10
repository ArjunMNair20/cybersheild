import { useState } from 'react'
import { Copy, Check, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"

export interface KeyDisplayProps {
  label: string
  value: string
  type: 'public' | 'private'
}

export function KeyDisplay({ label, value, type }: KeyDisplayProps) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Validate the key format
  const isValidKey = (key: string): boolean => {
    if (!key) return false
    
    const publicKeyPattern = /^-----BEGIN PUBLIC KEY-----\n[A-Za-z0-9+/=\n]+-----END PUBLIC KEY-----$/
    const privateKeyPattern = /^-----BEGIN RSA PRIVATE KEY-----\n[A-Za-z0-9+/=\n]+-----END RSA PRIVATE KEY-----$/
    
    if (type === 'public') {
      return publicKeyPattern.test(key.trim())
    } else {
      return privateKeyPattern.test(key.trim())
    }
  }

  const copyToClipboard = async () => {
    try {
      if (!value) {
        setError("No key available to copy")
        return
      }
      
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setError(null)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      setError("Failed to copy key to clipboard")
    }
  }

  if (!value) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {type === 'private' 
            ? "Private key not found. Please ensure you have completed the signup process."
            : "Public key not available. Please try refreshing the page."}
        </AlertDescription>
      </Alert>
    )
  }

  if (!isValidKey(value)) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Invalid {type} key format. Please try generating new keys.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{label}</h3>
        <button
          onClick={copyToClipboard}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
      <div className="relative">
        <textarea
          readOnly
          value={value}
          className={`w-full h-24 p-3 font-mono text-xs rounded-md bg-gray-50 dark:bg-gray-900 border ${
            type === 'private' ? 'border-red-200' : 'border-primary/20'
          }`}
        />
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <p className={`text-xs ${type === 'private' ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
        {type === 'private'
          ? 'IMPORTANT: Save this key securely and never share it with anyone.'
          : 'This key can be shared with others so they can send you encrypted messages.'}
      </p>
    </div>
  )
}