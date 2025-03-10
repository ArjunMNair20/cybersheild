import { Gateway, Wallets } from 'fabric-network';
import * as path from 'path';

const channelName = 'cybershieldchannel';
const chaincodeName = 'cybershieldcc';

// Connection configuration
export const connectionProfile = {
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
      url: 'grpcs://localhost:7050',
      grpcOptions: {
        'ssl-target-name-override': 'orderer.example.com'
      },
      tlsCACerts: {
        path: path.resolve(process.cwd(), 'crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt')
      }
    }
  },
  peers: {
    'peer0.org1.example.com': {
      url: 'grpcs://localhost:7051',
      grpcOptions: {
        'ssl-target-name-override': 'peer0.org1.example.com'
      },
      tlsCACerts: {
        path: path.resolve(process.cwd(), 'crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt')
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

let gateway: Gateway | null = null;
let contract: any = null;

export async function initFabricGateway() {
  try {
    gateway = new Gateway();
    const wallet = await Wallets.newInMemoryWallet();
    
    const connectionOptions = {
      wallet,
      identity: 'admin',
      discovery: { enabled: true, asLocalhost: true }
    };

    await gateway.connect(connectionProfile, connectionOptions);
    const network = await gateway.getNetwork(channelName);
    contract = network.getContract(chaincodeName);
    
    return { gateway, contract };
  } catch (error) {
    console.error('Failed to connect to Fabric network:', error);
    throw error;
  }
}

export { gateway, contract, channelName, chaincodeName }; 