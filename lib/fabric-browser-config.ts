import { grpc } from '@improbable-eng/grpc-web';
import { NodeHttpTransport } from '@improbable-eng/grpc-web-node-http-transport';

interface TransactionRequest {
  args: string[];
}

interface TransactionResponse {
  status: number;
  message: string;
  payload: Uint8Array;
}

interface FabricIdentity {
  credentials: {
    certificate: string | undefined;
    privateKey: string | undefined;
  };
  mspId: string;
  type: string;
}

interface GatewayConnection {
  identity: FabricIdentity;
  connectionProfile: any;
}

// Browser-compatible connection configuration
const connectionProfile = {
  name: 'cybershield-network',
  version: '1.0.0',
  client: {
    organization: 'Org1',
    connection: {
      timeout: {
        peer: {
          endorser: '300',
        },
        orderer: '300',
      },
    },
  },
  channels: {
    cybershieldchannel: {
      orderers: ['orderer.example.com'],
      peers: {
        'peer0.org1.example.com': {
          endorsingPeer: true,
          chaincodeQuery: true,
          ledgerQuery: true,
          eventSource: true,
        },
      },
    },
  },
  organizations: {
    Org1: {
      mspid: 'Org1MSP',
      peers: ['peer0.org1.example.com'],
      certificateAuthorities: ['ca.org1.example.com'],
    },
  },
  orderers: {
    'orderer.example.com': {
      url: 'http://localhost:7050',
    },
  },
  peers: {
    'peer0.org1.example.com': {
      url: 'http://localhost:7051',
    },
  },
  certificateAuthorities: {
    'ca.org1.example.com': {
      url: 'http://localhost:7054',
      httpOptions: {
        verify: false,
      },
      caName: 'ca-org1',
    },
  },
};

// Get contract instance
export async function getContract(gateway: GatewayConnection, channelName: string, chaincodeName: string): Promise<any> {
  try {
    // In browser environment, we'll use the REST API to interact with contracts
    return {
      submitTransaction: async (fcn: string, ...args: string[]) => {
        return submitTransaction(gateway, fcn, ...args);
      },
      evaluateTransaction: async (fcn: string, ...args: string[]) => {
        return evaluateTransaction(gateway, fcn, ...args);
      }
    };
  } catch (error) {
    console.error('Failed to get contract:', error);
    throw error;
  }
}

// Initialize gateway
export async function initGateway(): Promise<GatewayConnection> {
  try {
    // Create an in-memory wallet
    const identity: FabricIdentity = {
      credentials: {
        certificate: process.env.NEXT_PUBLIC_FABRIC_CERTIFICATE,
        privateKey: process.env.NEXT_PUBLIC_FABRIC_PRIVATE_KEY,
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };

    return {
      identity,
      connectionProfile,
    };
  } catch (error) {
    console.error('Failed to initialize gateway:', error);
    throw error;
  }
}

// Submit transaction
export async function submitTransaction(gateway: GatewayConnection, fcn: string, ...args: string[]): Promise<any> {
  try {
    const response = await fetch('/api/fabric/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fcn,
        args,
        identity: gateway.identity,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to submit transaction:', error);
    throw error;
  }
}

// Evaluate transaction
export async function evaluateTransaction(gateway: GatewayConnection, fcn: string, ...args: string[]): Promise<any> {
  try {
    const response = await fetch('/api/fabric/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fcn,
        args,
        identity: gateway.identity,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to evaluate transaction:', error);
    throw error;
  }
}

// Disconnect gateway
export async function disconnect(gateway: GatewayConnection): Promise<void> {
  // No need to explicitly disconnect in browser environment
  return Promise.resolve();
}