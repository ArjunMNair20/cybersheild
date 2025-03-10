import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Create user_keys table
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS user_keys (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          public_key TEXT NOT NULL,
          private_key TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });

    if (createError) {
      console.error('Error creating table:', createError);
      return NextResponse.json({
        error: 'Failed to create tables. Please run this SQL in your Supabase dashboard:\n\n' +
        'CREATE TABLE user_keys (\n' +
        '  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n' +
        '  email TEXT UNIQUE NOT NULL,\n' +
        '  public_key TEXT NOT NULL,\n' +
        '  private_key TEXT NOT NULL,\n' +
        '  created_at TIMESTAMPTZ DEFAULT NOW()\n' +
        ');'
      }, { status: 500 });
    }

    // Check if tables exist
    const { error: userKeysError } = await supabase
      .from('user_keys')
      .select('*')
      .limit(1);

    return NextResponse.json({
      message: 'Database tables exist',
      tables: {
        user_keys: !userKeysError,
      }
    });
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 