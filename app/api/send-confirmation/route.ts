import { Resend } from 'resend';
import { NextResponse } from 'next/server';

// Initialize Resend with logging
const resendApiKey = process.env.RESEND_API_KEY;
console.log('Resend API Key configured:', !!resendApiKey);

const resend = new Resend(resendApiKey);

export async function POST(request: Request) {
  console.log('Starting email confirmation process...');
  
  try {
    const { email } = await request.json();
    console.log('Attempting to send confirmation email to:', email);

    if (!email) {
      console.error('No email provided');
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Email service is not configured' },
        { status: 500 }
      );
    }

    // Test Resend configuration
    try {
      await resend.emails.get('test');
      console.log('Resend API connection successful');
    } catch (testError) {
      console.error('Resend API test failed:', testError);
    }

    console.log('Sending confirmation email...');
    const { data, error } = await resend.emails.send({
      from: 'CyberShield <onboarding@resend.dev>',
      to: email,
      subject: 'Welcome to CyberShield - Important Account Information',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; text-align: center;">Welcome to CyberShield!</h1>
          
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="font-size: 16px; line-height: 1.6;">
              Thank you for signing up with CyberShield! Your account has been created.
            </p>
            
            <div style="background-color: #fef2f2; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="font-size: 16px; line-height: 1.6; color: #dc2626; margin: 0;">
                <strong>Important:</strong> You should receive a separate email from Supabase with a verification link.
                Please check your inbox and spam folder for this email and click the verification link to activate your account.
              </p>
            </div>

            <p style="font-size: 16px; line-height: 1.6;">
              With CyberShield, you can:
              <ul>
                <li>Send end-to-end encrypted messages</li>
                <li>Track message delivery with blockchain</li>
                <li>Manage your encryption keys securely</li>
              </ul>
            </p>
          </div>

          <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 20px;">
            If you didn't create this account, please ignore this email.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending confirmation email:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('Confirmation email sent successfully:', data);
    return NextResponse.json({
      success: true,
      message: 'Confirmation email sent successfully',
      data
    });
  } catch (error: any) {
    console.error('Error in /api/send-confirmation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send confirmation email',
        details: error.message
      },
      { status: 500 }
    );
  }
} 