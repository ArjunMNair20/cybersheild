import { NextResponse } from 'next/server';
import { contract } from '../config';

// Store metadata
export async function POST(request: Request) {
  try {
    const { messageId, metadata } = await request.json();
    
    if (!contract) {
      return NextResponse.json(
        { error: 'Blockchain not initialized' },
        { status: 500 }
      );
    }

    const metadataObj = {
      messageId,
      ...metadata,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    await contract.submitTransaction('storeMetadata', messageId, JSON.stringify(metadataObj));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to store metadata:', error);
    return NextResponse.json(
      { error: 'Failed to store metadata' },
      { status: 500 }
    );
  }
}

// Get metadata
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    if (!contract) {
      return NextResponse.json(
        { error: 'Blockchain not initialized' },
        { status: 500 }
      );
    }

    const result = await contract.evaluateTransaction('getMetadata', messageId);
    return NextResponse.json(JSON.parse(result.toString()));
  } catch (error) {
    console.error('Failed to get metadata:', error);
    return NextResponse.json(
      { error: 'Failed to get metadata' },
      { status: 500 }
    );
  }
}

// Update metadata
export async function PUT(request: Request) {
  try {
    const { messageId, status } = await request.json();

    if (!contract) {
      return NextResponse.json(
        { error: 'Blockchain not initialized' },
        { status: 500 }
      );
    }

    const currentMetadata = await contract.evaluateTransaction('getMetadata', messageId);
    const parsedMetadata = JSON.parse(currentMetadata.toString());

    const updatedMetadata = {
      ...parsedMetadata,
      status,
      lastUpdated: new Date().toISOString()
    };

    await contract.submitTransaction('updateMetadata', messageId, JSON.stringify(updatedMetadata));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update metadata:', error);
    return NextResponse.json(
      { error: 'Failed to update metadata' },
      { status: 500 }
    );
  }
}

// Delete metadata
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    if (!contract) {
      return NextResponse.json(
        { error: 'Blockchain not initialized' },
        { status: 500 }
      );
    }

    await contract.submitTransaction('deleteMetadata', messageId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete metadata:', error);
    return NextResponse.json(
      { error: 'Failed to delete metadata' },
      { status: 500 }
    );
  }
} 