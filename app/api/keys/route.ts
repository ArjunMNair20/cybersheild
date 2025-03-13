import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // First try user_profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('public_key')
      .eq('email', email)
      .maybeSingle();

    if (profileData?.public_key) {
      return NextResponse.json({ publicKey: profileData.public_key });
    }

    // If not found in user_profiles, try user_keys table
    const { data: keyData, error: keyError } = await supabase
      .from('user_keys')
      .select('public_key')
      .eq('email', email)
      .maybeSingle();

    if (keyError) {
      console.error('Error fetching public key:', { profileError, keyError });
      return NextResponse.json({ error: 'Failed to fetch public key' }, { status: 500 });
    }

    if (!keyData?.public_key) {
      return NextResponse.json({ error: 'No public key found for this email' }, { status: 404 });
    }

    return NextResponse.json({ publicKey: keyData.public_key });
  } catch (error) {
    console.error('Error in /api/keys:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 