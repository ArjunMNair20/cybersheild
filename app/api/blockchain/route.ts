import { NextResponse } from 'next/server';
import { initGateway, getContract, submitTransaction, evaluateTransaction, disconnect } from '@/lib/fabric-browser-config';

let gateway: any = null;
let contract: any = null;

const CHANNEL_NAME = 'cybershieldchannel';
const CHAINCODE_NAME = 'cybershieldcc';

// Initialize the blockchain connection
async function initBlockchain() {
  try {
    gateway = await initGateway();
    contract = await getContract(gateway, CHANNEL_NAME, CHAINCODE_NAME);
    console.log('Successfully connected to Hyperledger Fabric network');
    return true;
  } catch (error) {
    console.error('Failed to initialize blockchain:', error);
    return false;
  }
}

// Store message metadata on blockchain
async function storeMessageMetadata(messageId: string, metadata: any) {
  try {
    if (!contract) {
      throw new Error('Blockchain not initialized');
    }

    const metadataObj = {
      messageId,
      sender: metadata.sender_email,
      recipient: metadata.recipient_email,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    await submitTransaction(contract, 'storeMetadata', messageId, JSON.stringify(metadataObj));
    console.log('Message metadata stored on blockchain');
    return true;
  } catch (error) {
    console.error('Failed to store message metadata on blockchain:', error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { action, messageId, metadata } = await request.json();

    await initBlockchain();

    switch (action) {
      case 'store':
        const storeResult = await storeMessageMetadata(messageId, metadata);
        return NextResponse.json({ success: storeResult });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    if (gateway) {
      await disconnect(gateway);
    }
  }
} 