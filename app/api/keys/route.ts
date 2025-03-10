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

    // Get the public key
    const { data, error } = await supabase
      .from('user_keys')
      .select('public_key')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Error fetching public key:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'No public key found for this email' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch public key' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'No public key found for this email' }, { status: 404 });
    }

    return NextResponse.json({ publicKey: data.public_key });
  } catch (error) {
    console.error('Error in /api/keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 