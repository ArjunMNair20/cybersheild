import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Cache for generated keys
const keyCache = new Map<string, { publicKey: string, privateKey: string }>();

async function ensureTableExists() {
  try {
    const { error: checkError } = await supabase
      .from('user_keys')
      .select('*')
      .limit(1);

    if (checkError?.message.includes('relation "user_keys" does not exist')) {
      // Create the table using raw SQL
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS user_keys (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            public_key TEXT NOT NULL,
            private_key TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          -- Grant necessary permissions
          ALTER TABLE user_keys ENABLE ROW LEVEL SECURITY;
          
          CREATE POLICY "Users can read their own keys"
            ON user_keys
            FOR SELECT
            USING (auth.uid() IS NOT NULL);

          CREATE POLICY "Users can insert their own keys"
            ON user_keys
            FOR INSERT
            WITH CHECK (auth.uid() IS NOT NULL);
        `
      });

      if (createError) {
        console.error('Error creating table:', createError);
        throw new Error('Failed to create user_keys table');
      }
    }
  } catch (error) {
    console.error('Error ensuring table exists:', error);
    throw error;
  }
}

async function arrayBufferToBase64(buffer: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(buffer));
  return btoa(binary);
}

async function generateKeyPair(): Promise<{ publicKey: string, privateKey: string }> {
  try {
    console.log('Starting key pair generation...');
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error('Key generation must be performed in the browser');
    }

    console.log('Generating RSA key pair...');
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 1024,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );

    console.log('Exporting keys...');
    const [publicKeyBuffer, privateKeyBuffer] = await Promise.all([
      window.crypto.subtle.exportKey("spki", keyPair.publicKey),
      window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey)
    ]);

    console.log('Converting keys to base64...');
    const [publicKey, privateKey] = await Promise.all([
      arrayBufferToBase64(publicKeyBuffer),
      arrayBufferToBase64(privateKeyBuffer)
    ]);

    console.log('Key pair generation completed successfully');
    return {
      publicKey: `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`,
      privateKey: `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`
    };
  } catch (error) {
    console.error('Error generating key pair:', error);
    throw new Error('Failed to generate key pair: ' + (error as Error).message);
  }
}

export async function generateAndStoreKeys(email: string) {
  try {
    console.log('Starting key generation and storage process for:', email);

    // Check cache first
    if (keyCache.has(email)) {
      console.log('Found keys in cache');
      return keyCache.get(email)!;
    }

    // Ensure table exists before proceeding
    await ensureTableExists();

    // Check if keys already exist for this email
    const { data: existingKeys } = await supabase
      .from('user_keys')
      .select('public_key, private_key')
      .eq('email', email)
      .maybeSingle();

    if (existingKeys) {
      console.log('Found existing keys in database');
      const keys = {
        publicKey: existingKeys.public_key,
        privateKey: existingKeys.private_key
      };
      keyCache.set(email, keys);
      return keys;
    }

    // Generate new keys
    console.log('Generating new key pair...');
    const keys = await generateKeyPair();

    // Store keys in Supabase
    console.log('Storing keys in database...');
    const { error: insertError } = await supabase
      .from('user_keys')
      .insert({
        email,
        public_key: keys.publicKey,
        private_key: keys.privateKey
      });

    if (insertError) {
      console.error('Error storing keys:', insertError);
      throw new Error('Failed to store keys: ' + insertError.message);
    }

    // Cache the keys
    console.log('Storing keys in cache...');
    keyCache.set(email, keys);

    console.log('Key generation and storage completed successfully');
    return keys;
  } catch (error) {
    console.error('Error in key generation:', error);
    throw error;
  }
}

export async function getPublicKey(email: string) {
  try {
    // Check cache first
    const cached = keyCache.get(email);
    if (cached) {
      return cached.publicKey;
    }

    const { data, error } = await supabase
      .from('user_keys')
      .select('public_key')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Error fetching public key:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No public key found for this email');
    }

    return data.public_key;
  } catch (error) {
    console.error('Error in getPublicKey:', error);
    throw error;
  }
}

export async function getPrivateKey(email: string) {
  try {
    // Check cache first
    const cached = keyCache.get(email);
    if (cached) {
      return cached.privateKey;
    }

    const { data, error } = await supabase
      .from('user_keys')
      .select('private_key')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Error fetching private key:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No private key found for this email');
    }

    return data.private_key;
  } catch (error) {
    console.error('Error in getPrivateKey:', error);
    throw error;
  }
} 