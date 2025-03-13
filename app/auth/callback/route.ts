import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    try {
      // Exchange the code for a session
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
      if (sessionError) {
        console.error('Session error:', sessionError);
        return NextResponse.redirect(
          `${requestUrl.origin}/login?error=${encodeURIComponent('Unable to verify email. Please try again.')}`
        );
      }

      // Get the user's email verification status
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('User error:', userError);
        return NextResponse.redirect(
          `${requestUrl.origin}/login?error=${encodeURIComponent('Unable to fetch user details. Please try again.')}`
        );
      }

      if (!user) {
        console.error('No user found');
        return NextResponse.redirect(
          `${requestUrl.origin}/login?error=${encodeURIComponent('User not found. Please try signing up again.')}`
        );
      }

      // Check if email is confirmed
      if (user.email_confirmed_at) {
        // Email is verified, redirect to login with success message
        return NextResponse.redirect(
          `${requestUrl.origin}/login?message=${encodeURIComponent('Email verified successfully! Please log in to continue.')}`
        );
      } else {
        // Email is not verified yet
        return NextResponse.redirect(
          `${requestUrl.origin}/login?error=${encodeURIComponent('Please check your email and click the verification link.')}`
        );
      }
    } catch (error) {
      console.error('Error in auth callback:', error);
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent('An unexpected error occurred. Please try again.')}`
      );
    }
  }

  // No code provided, redirect to login
  return NextResponse.redirect(
    `${requestUrl.origin}/login?error=${encodeURIComponent('Invalid verification link.')}`
  );
} 