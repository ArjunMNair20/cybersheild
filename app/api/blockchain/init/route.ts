import { NextResponse } from 'next/server';
import { initBlockchain, getInitializationStatus } from '@/lib/blockchain-service';

export async function GET() {
  try {
    const status = getInitializationStatus();
    
    if (status.isInitialized) {
      return NextResponse.json({ 
        status: 'success', 
        message: 'Blockchain already initialized',
        initialized: true 
      });
    }

    if (status.isInitializing) {
      return NextResponse.json({ 
        status: 'pending', 
        message: 'Blockchain initialization in progress',
        initialized: false 
      });
    }

    await initBlockchain();
    
    return NextResponse.json({ 
      status: 'success', 
      message: 'Blockchain initialized successfully',
      initialized: true 
    });
  } catch (error) {
    console.error('Blockchain initialization failed:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to initialize blockchain',
        error: error instanceof Error ? error.message : 'Unknown error',
        initialized: false 
      },
      { status: 500 }
    );
  }
} 