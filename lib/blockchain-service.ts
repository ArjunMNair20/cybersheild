import { Gateway } from 'fabric-network';
import { initGateway, getContract, submitTransaction, evaluateTransaction, disconnect } from './fabric-browser-config';

let gateway: Gateway | null = null;
let contract: any = null;

const CHANNEL_NAME = 'cybershieldchannel';
const CHAINCODE_NAME = 'cybershieldcc';

// Initialize the blockchain connection
export async function initBlockchain() {
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
export async function storeMessageMetadata(messageId: string, metadata: any) {
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

// Get message metadata from blockchain
export async function getMessageMetadata(messageId: string) {
  try {
    if (!contract) {
      throw new Error('Blockchain not initialized');
    }

    const result = await evaluateTransaction(contract, 'getMetadata', messageId);
    return JSON.parse(result.toString());
  } catch (error) {
    console.error('Failed to get message metadata from blockchain:', error);
    return null;
  }
}

// Update message status on blockchain
export async function updateMessageStatus(messageId: string, status: string) {
  try {
    if (!contract) {
      throw new Error('Blockchain not initialized');
    }

    const currentMetadata = await getMessageMetadata(messageId);
    if (!currentMetadata) {
      throw new Error('Message metadata not found');
    }

    const updatedMetadata = {
      ...currentMetadata,
      status,
      lastUpdated: new Date().toISOString()
    };

    await submitTransaction(contract, 'updateMetadata', messageId, JSON.stringify(updatedMetadata));
    console.log('Message status updated on blockchain');
    return true;
  } catch (error) {
    console.error('Failed to update message status on blockchain:', error);
    return false;
  }
}

// Delete message metadata from blockchain
export async function deleteMessageMetadata(messageId: string) {
  try {
    if (!contract) {
      throw new Error('Blockchain not initialized');
    }

    await submitTransaction(contract, 'deleteMetadata', messageId);
    console.log('Message metadata deleted from blockchain');
    return true;
  } catch (error) {
    console.error('Failed to delete message metadata from blockchain:', error);
    return false;
  }
}

// Clean up blockchain connection
export async function disconnectBlockchain() {
  try {
    if (gateway) {
      await disconnect(gateway);
      gateway = null;
      contract = null;
      console.log('Disconnected from blockchain network');
    }
  } catch (error) {
    console.error('Error disconnecting from blockchain:', error);
  }
}