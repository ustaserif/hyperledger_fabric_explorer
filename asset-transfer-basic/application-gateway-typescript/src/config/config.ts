import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

export const Config = {
    channelName: process.env.CHANNEL_NAME || 'mychannel',
    chaincodeName: process.env.CHAINCODE_NAME || 'basic',
    mspId: process.env.MSP_ID || 'Org2MSP',
    cryptoPath:
        process.env.CRYPTO_PATH ||
        path.resolve(
            __dirname,
            '..',
            '..',
            '..',
            'test-network',
            'organizations',
            'peerOrganizations',
            'org2.example.com'
        ),
    keyDirectoryPath:
        process.env.KEY_DIRECTORY_PATH ||
        path.resolve(
            __dirname,
            '..',
            '..',
            '..',
            '..',
            'test-network',
            'organizations',
            'peerOrganizations',
            'org2.example.com',
            'users',
            'User1@org2.example.com',
            'msp',
            'keystore'
        ),
    certDirectoryPath:
        process.env.CERT_DIRECTORY_PATH ||
        path.resolve(
            __dirname,
            '..',
            '..',
            '..',
            '..',
            'test-network',
            'organizations',
            'peerOrganizations',
            'org2.example.com',
            'users',
            'User1@org2.example.com',
            'msp',
            'signcerts'
        ),
    tlsCertPath:
        process.env.TLS_CERT_PATH ||
        path.resolve(
            __dirname,
            '..',
            '..',
            '..',
            '..',
            'test-network',
            'organizations',
            'peerOrganizations',
            'org2.example.com',
            'peers',
            'peer0.org2.example.com',
            'tls',
            'ca.crt'
        ),
    peerEndpoint: process.env.PEER_ENDPOINT || 'localhost:9051',
    peerHostAlias: process.env.PEER_HOST_ALIAS || 'peer0.org2.example.com',
};

