import { Gateway, Wallets } from 'fabric-network';
import * as path from 'path';

const channelName = 'cybershieldchannel';
const chaincodeName = 'cybershieldcc';

// Connection configuration
const connectionProfile = {
  name: 'cybershield-network',
  version: '1.0.0',
  client: {
    organization: 'Org1',
    connection: {
      timeout: {
        peer: {
          endorser: '300'
        },
        orderer: '300'
      }
    }
  },
  channels: {
    cybershieldchannel: {
      orderers: ['orderer.example.com'],
      peers: {
        'peer0.org1.example.com': {
          endorsingPeer: true,
          chaincodeQuery: true,
          ledgerQuery: true,
          eventSource: true
        }
      }
    }
  },
  organizations: {
    Org1: {
      mspid: 'Org1MSP',
      peers: ['peer0.org1.example.com'],
      certificateAuthorities: ['ca.org1.example.com']
    }
  },
  orderers: {
    'orderer.example.com': {
      url: 'https://localhost:7050',
      grpcOptions: {
        'ssl-target-name-override': 'orderer.example.com'
      },
      tlsCACerts: {
        path: path.resolve(__dirname, '../crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt')
      }
    }
  },
  peers: {
    'peer0.org1.example.com': {
      url: 'https://localhost:7051',
      grpcOptions: {
        'ssl-target-name-override': 'peer0.org1.example.com'
      },
      tlsCACerts: {
        path: path.resolve(__dirname, '../crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt')
      }
    }
  },
  certificateAuthorities: {
    'ca.org1.example.com': {
      url: 'https://localhost:7054',
      caName: 'ca.org1.example.com',
      httpOptions: {
        verify: false
      }
    }
  }
};

// Initialize the Fabric Gateway
export async function initFabricGateway() {
  try {
    // Create a new gateway for connecting to the peer node
    const gateway = new Gateway();
    
    // Create a new wallet for identity management
    const wallet = await Wallets.newInMemoryWallet();
    
    // Set connection options
    const connectionOptions = {
      wallet,
      identity: 'admin',
      discovery: { enabled: true, asLocalhost: true },
      clientTlsIdentity: 'tlsId'
    };

    // Connect to the gateway
    await gateway.connect(connectionProfile, connectionOptions);
    
    // Get the network (channel) our contract is deployed to
    const network = await gateway.getNetwork(channelName);
    
    // Get the contract
    const contract = network.getContract(chaincodeName);

    return { gateway, contract };
  } catch (error) {
    console.error('Failed to connect to Fabric network:', error);
    throw error;
  }
}

// Store metadata on the blockchain
export async function storeMetadata(contract: any, key: string, metadata: any) {
  try {
    await contract.submitTransaction('storeMetadata', key, JSON.stringify(metadata));
    return true;
  } catch (error) {
    console.error('Failed to store metadata:', error);
    throw error;
  }
}

// Retrieve metadata from the blockchain
export async function getMetadata(contract: any, key: string) {
  try {
    const result = await contract.evaluateTransaction('getMetadata', key);
    return JSON.parse(result.toString());
  } catch (error) {
    console.error('Failed to get metadata:', error);
    throw error;
  }
}

// Update metadata on the blockchain
export async function updateMetadata(contract: any, key: string, metadata: any) {
  try {
    await contract.submitTransaction('updateMetadata', key, JSON.stringify(metadata));
    return true;
  } catch (error) {
    console.error('Failed to update metadata:', error);
    throw error;
  }
}

// Delete metadata from the blockchain
export async function deleteMetadata(contract: any, key: string) {
  try {
    await contract.submitTransaction('deleteMetadata', key);
    return true;
  } catch (error) {
    console.error('Failed to delete metadata:', error);
    throw error;
  }
}