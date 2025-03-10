import { NextResponse } from 'next/server';
import { Gateway, Wallets } from 'fabric-network';

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

export async function POST(request: Request) {
  try {
    const { fcn, args, identity } = await request.json();

    // Create an in-memory wallet
    const wallet = await Wallets.newInMemoryWallet();
    await wallet.put('user1', identity);

    // Create a new gateway instance
    const gateway = new Gateway();

    // Connect to the gateway
    await gateway.connect(connectionProfile, {
      wallet,
      identity: 'user1',
      discovery: { enabled: true, asLocalhost: true },
    });

    // Get the network and contract
    const network = await gateway.getNetwork('cybershieldchannel');
    const contract = network.getContract('cybershieldcc');

    // Evaluate the transaction
    const result = await contract.evaluateTransaction(fcn, ...args);

    // Disconnect from the gateway
    await gateway.disconnect();

    return NextResponse.json({ 
      success: true, 
      result: result.toString() 
    });
  } catch (error) {
    console.error('Error evaluating transaction:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 