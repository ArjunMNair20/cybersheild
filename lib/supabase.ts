import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Maximum number of retry attempts
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

// Helper function to safely get error details
const getErrorDetails = (error: any) => {
  try {
    return {
      name: error?.name || 'Unknown',
      message: error?.message || 'No message',
      stack: error?.stack || 'No stack trace',
      type: error?.constructor?.name || 'Unknown Type',
      toString: error?.toString(),
      code: error?.code,
      cause: error?.cause,
    }
  } catch (e) {
    return { error: 'Error while extracting error details' }
  }
}

// Helper function to check network status
const checkNetworkStatus = async () => {
  if (typeof window === 'undefined') return true
  
  try {
    // First check navigator.onLine
    if (!window.navigator.onLine) {
      return false
    }

    // Then try to fetch a small resource to verify actual connectivity
    const testResponse = await fetch('https://www.google.com/favicon.ico', {
      mode: 'no-cors',
      cache: 'no-cache',
      credentials: 'omit',
      headers: {
        'Cache-Control': 'no-cache',
      },
    })
    return testResponse.type === 'opaque' || testResponse.ok
  } catch (e) {
    console.warn('Network check failed:', getErrorDetails(e))
    return false
  }
}

// Helper function to handle fetch errors
const handleFetchError = (error: any, attempt: number, url: string) => {
  const errorDetails = getErrorDetails(error)
  
  // Log error details
  console.error('Fetch error details:', {
    attempt,
    url,
    ...errorDetails,
  })

  // Return user-friendly error message based on error type
  if (errorDetails.name === 'AbortError') {
    return 'Request timed out - please try again'
  }
  if (errorDetails.type === 'TypeError' && errorDetails.message.includes('Failed to fetch')) {
    return 'Connection failed - please check your internet connection and security software'
  }
  if (errorDetails.message.includes('NetworkError')) {
    return 'Network error - please check your firewall settings'
  }
  if (errorDetails.message.includes('CORS')) {
    return 'Access blocked - please check your security software settings'
  }
  return `Error: ${errorDetails.message || 'Unknown error occurred'}`
}

// Custom fetch implementation with proxy support
const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  // Convert input to string URL and ensure it's absolute
  const url = input instanceof Request ? input.url : input.toString()
  const absoluteUrl = url.startsWith('http') ? url : `${supabaseUrl}${url}`
  
  // Add timestamp and nonce to URL to prevent caching
  const nonce = Math.random().toString(36).substring(7)
  const urlWithParams = new URL(absoluteUrl)
  urlWithParams.searchParams.append('_t', Date.now().toString())
  urlWithParams.searchParams.append('_n', nonce)
  
  const fetchOptions: RequestInit = {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      ...(init?.headers || {}),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Custom-Client': 'CyberShield',
      'X-Request-Id': nonce,
    },
    mode: 'cors',
    credentials: 'include',
    keepalive: true,
    referrerPolicy: 'no-referrer',
  }

  let lastError: Error | null = null
  
  // Retry logic with exponential backoff
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Check network status
      const isOnline = await checkNetworkStatus()
      if (!isOnline) {
        console.warn('Network check failed - no connectivity detected')
        throw new Error('No internet connection detected')
      }

      console.log('Attempting fetch:', {
        attempt: attempt + 1,
        url: urlWithParams.toString(),
        method: fetchOptions.method || 'GET',
      })

      // Use native fetch with timeout
      const controller = new AbortController()
      const timeout = setTimeout(() => {
        controller.abort()
        console.warn('Request timed out:', {
          attempt: attempt + 1,
          url: urlWithParams.toString(),
        })
      }, 15000) // 15 second timeout

      try {
        const response = await fetch(urlWithParams.toString(), {
          ...fetchOptions,
          signal: controller.signal
        })

        clearTimeout(timeout)

        // Log response details
        console.log('Response received:', {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText,
          url: response.url,
        })

        // Check if the response is ok
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
        }
        
        return response
      } catch (fetchError: any) {
        const errorMessage = handleFetchError(fetchError, attempt, urlWithParams.toString())
        throw new Error(errorMessage)
      }
    } catch (error: any) {
      lastError = error
      
      // If this is not the last attempt, wait before retrying
      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAY * Math.pow(2, attempt) // Exponential backoff
        console.log(`Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // On last attempt, throw the error with full details
      console.error('All retry attempts failed:', getErrorDetails(error))
      throw error
    }
  }

  // If we get here, all attempts failed
  throw new Error(`Failed to connect to server after ${MAX_RETRIES} attempts. Please check your internet connection and security software. Last error: ${lastError?.message}`)
}

// Initialize Supabase client with debug mode
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
    flowType: 'pkce',
    debug: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'cybershield-auth-token'
  },
  global: {
    fetch: customFetch,
    headers: {
      'x-client-info': 'cybershield',
    },
  },
})

// Function to create the messages table
export async function createMessagesTable() {
  try {
    const { error } = await supabase.rpc("create_messages_table")
    if (error) {
      console.error("Error creating messages table via RPC:", error)
      return { success: false, error }
    }
    return { success: true }
  } catch (error) {
    console.error("Error creating messages table:", error)
    return { success: false, error }
  }
}

