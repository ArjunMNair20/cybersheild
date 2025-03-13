import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key:', supabaseAnonKey);

// Simplified fetch implementation with better error handling
const simpleFetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const retries = 3;
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      // Get the current session and access token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      // First try native fetch
      try {
        const response = await fetch(url, {
          ...init,
          headers: {
            ...(init?.headers as Record<string, string>),
            'x-client-info': 'cybershield',
            'Authorization': `Bearer ${accessToken}`
          }
        });
        if (response.ok) return response;
      } catch (fetchError) {
        console.warn('Native fetch failed, falling back to XMLHttpRequest:', fetchError);
      }

      // Fallback to XMLHttpRequest
      const response = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const urlString = url.toString();

        xhr.open(init?.method || 'GET', urlString);

        // Set headers
        const headers = {
          ...(init?.headers as Record<string, string>),
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'x-client-info': 'cybershield',
          'Authorization': `Bearer ${accessToken}`
        };

        Object.entries(headers).forEach(([key, value]) => {
          if (value) xhr.setRequestHeader(key, value);
        });

        xhr.withCredentials = true; // Enable CORS credentials

        xhr.onload = () => {
          const response = new Response(xhr.responseText, {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: new Headers(xhr.getAllResponseHeaders().split('\r\n').reduce((acc, header) => {
              const [key, value] = header.split(': ');
              if (key && value) acc[key.toLowerCase()] = value;
              return acc;
            }, {} as Record<string, string>))
          });
          resolve(response);
        };

        xhr.onerror = () => {
          console.error(`Network request failed: ${xhr.statusText}`, {
            url: urlString,
            method: init?.method || 'GET',
            headers,
            body: init?.body
          });
          reject(new Error(`Network request failed: ${xhr.statusText}`));
        };

        // Convert body to string if it exists
        const body = init?.body;
        if (body && typeof body !== 'string') {
          xhr.send(JSON.stringify(body));
        } else {
          xhr.send(body as string | null);
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // Exponential backoff
      }
    }
  }

  throw lastError || new Error('Failed to fetch after multiple attempts');
};

// Initialize Supabase client with improved configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  },
  global: {
    fetch: simpleFetch,
    headers: {
      'x-client-info': 'cybershield'
    }
  }
});

// Environment variables should be set in a .env file or through the environment configuration
