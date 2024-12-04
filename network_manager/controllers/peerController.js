import FabricCAService from "../admin/ca.js";
import * as path from 'path';
import * as fs from 'fs';
import UserBuilder from "../admin/user.js";
import { Wallets } from 'fabric-network';
import QSCCProposal from "../admin/QSCCProposal.js";
import { emptyChannel } from "../admin/channel.js";
import Peer from "../admin/peer.js";
import CSCCProposal from "../admin/CSCCProposal.js";
import spawn from "cross-spawn";
import YAML from 'yaml';

import Orderer from "../admin/orderer.js";
import Client from "fabric-common/lib/Client.js";
import { Endorser } from "fabric-common";
import SigningIdentityUtil from "../admin/signingIdentity.js";
import ChannelUpdate from "../admin/channelUpdate.js";
import Channel from "fabric-common/lib/Channel.js";

const wallet = await Wallets.newFileSystemWallet('./wallet');

function getFileFromFolder(folderPath) {
    const files = fs.readdirSync(folderPath);
    
    if (files.length === 0) {
        console.log('No files found');
        return null;
    }

    const fullFilename = path.join(folderPath, files[0]); // Take the first file found
    console.log('Found file:', fullFilename);

    return fullFilename;
}

function initializePeerFolderStructure(peername, org, caPort, msp_enrollments, tls_enrollments) {
    
    const peerDir = path.resolve('..', 'test-network', 'organizations', 'peerOrganizations', `${org}.example.com`, 'peers', `${peername}.${org}.example.com`);
    const mspDir = path.resolve(peerDir, 'msp');
    const caCertsDir = path.resolve(mspDir, 'cacerts');
    const keyStoreDir = path.resolve(mspDir, 'keystore');
    const signcertsDir = path.resolve(mspDir, 'signcerts');
    const userDir = path.resolve(mspDir, 'user');
    const peerTLSDir = path.resolve(peerDir, 'tls');
    const tlsCertsDir = path.resolve(peerTLSDir, 'cacerts');
    const tlsSigncertsDir = path.resolve(peerTLSDir, 'signcerts');
    const tlsKeyStoreDir = path.resolve(peerTLSDir, 'keystore');
    const tlsUserDir = path.resolve(peerTLSDir, 'user');
    const tlsCACertsDir = path.resolve(peerTLSDir, 'tlscacerts');
    
    if (!fs.existsSync(mspDir)) {
      fs.mkdirSync(mspDir, { recursive: true });
      fs.mkdirSync(caCertsDir, { recursive: true });
      fs.mkdirSync(keyStoreDir, { recursive: true });
      fs.mkdirSync(signcertsDir, { recursive: true });
      fs.mkdirSync(userDir, { recursive: true });
      fs.mkdirSync(peerTLSDir, { recursive: true });
      fs.mkdirSync(tlsSigncertsDir, { recursive: true });
      fs.mkdirSync(tlsKeyStoreDir, { recursive: true });
      fs.mkdirSync(tlsUserDir, { recursive: true });
      fs.mkdirSync(tlsCertsDir, { recursive: true });
      fs.mkdirSync(tlsCACertsDir, { recursive: true });
    }
  
    //copy .pem file from organizations/fabric-ca/org1/ca-cert.pem to caCertsDir
    const caCertPath = path.resolve('..', 'test-network', 'organizations', 'fabric-ca', org, 'ca-cert.pem');
    const destPath = path.resolve(caCertsDir, 'ca-cert.pem');
    fs.copyFileSync(caCertPath, destPath);
  
    //write private key to keyStoreDir
    const keyPath = path.resolve(keyStoreDir, 'priv_sk');
    fs.writeFileSync(keyPath, msp_enrollments.key.toBytes());
  
    //write certificate to signcertsDir
    const certPath = path.resolve(signcertsDir, 'cert.pem');
    fs.writeFileSync(certPath, msp_enrollments.certificate);
  
    const configPath = path.resolve('..', 'test-network', 'organizations', 'peerOrganizations', `${org}.example.com`, 'msp', 'config.yaml');
    const configDestPath = path.resolve(mspDir, 'config.yaml');
    fs.copyFileSync(configPath, configDestPath);
  
    const issuerPublicKeyPath = path.resolve('..', 'test-network', 'organizations', 'fabric-ca', org, 'IssuerPublicKey');
    const destPublicPath = path.resolve(mspDir, 'IssuerPublicKey');
    fs.copyFileSync(issuerPublicKeyPath, destPublicPath);
  
    const issuerRevPublicKeyPath = path.resolve('..', 'test-network', 'organizations', 'fabric-ca', org, 'IssuerRevocationPublicKey');
    const destRevPublicPath = path.resolve(mspDir, 'IssuerRevocationPublicKey');
    fs.copyFileSync(issuerRevPublicKeyPath, destRevPublicPath);
  
  
  
    //tls
    const destTlsCaPath = path.resolve(tlsCACertsDir, `tls-localhost-${caPort}-ca-${org}.pem`);
    fs.copyFileSync(caCertPath, destTlsCaPath);
  
    fs.copyFileSync(caCertPath, path.join(peerTLSDir, 'ca.crt'));
    
    const destTlsPublicPath = path.resolve(peerTLSDir, 'IssuerPublicKey');
    fs.copyFileSync(issuerPublicKeyPath, destTlsPublicPath);
  
    const destTlsRevPublicPath = path.resolve(peerTLSDir, 'IssuerRevocationPublicKey');
    fs.copyFileSync(issuerRevPublicKeyPath, destTlsRevPublicPath);
    
    const keyTlsPath = path.resolve(tlsKeyStoreDir, 'priv_sk');
    fs.writeFileSync(keyTlsPath, tls_enrollments.key.toBytes());
  
    const certTlsPath = path.resolve(tlsSigncertsDir, 'cert.pem');
    fs.writeFileSync(certTlsPath, tls_enrollments.certificate);
  
  
    fs.writeFileSync(
      path.join(peerTLSDir, '', 'server.crt'),
      tls_enrollments.certificate
    );
  
    fs.writeFileSync(
      path.join(peerTLSDir, 'server.key'),
      tls_enrollments.key.toBytes()
    );
}

async function saveIdentity(identityLabel, certificate, privateKey, mspId) {
    const x509Identity = {
        credentials: {
        certificate: certificate,
        privateKey: privateKey,
        },
        mspId: mspId,
        type: 'X.509',
    };

    return await wallet.put(identityLabel, x509Identity);
}

async function getIdentity(identityLabel) {
    return await wallet.get(identityLabel);
}

async function registerPeer(registerConfig){
    console.log('Registering Peer: ', registerConfig);
    
    const ccpPath = path.resolve('..', 'test-network', 'organizations', 'fabric-ca', registerConfig.network.org, 'ca-cert.pem');
    const caPem = fs.readFileSync(ccpPath, 'utf8');
    
    const ca_client = new FabricCAService({
        trustedRoots: caPem,
        protocol: 'https',
        hostname: 'localhost',
        port: parseInt(registerConfig.network.caPort),
        caname: `ca-${registerConfig.network.org}`,
    });
    
    const enrollment = await ca_client.enroll({
        enrollmentID: 'admin',
        enrollmentSecret: 'adminpw'
        }
    );
    
    saveIdentity('admin', enrollment.certificate, enrollment.key.toBytes(), registerConfig.network.mspID);
    
    const user = new UserBuilder(
        {
            name: 'admin',
            roles: ['admin'],
            affiliation: ''
        }
    );
    
    const admin = user.build({
        key: enrollment.key.toBytes(),
        certificate: enrollment.certificate,
        mspid: registerConfig.network.mspID
    });
    
    const registerRequest = {
        enrollmentID: registerConfig.peer.id,
        enrollmentSecret: registerConfig.peer.secret,
        role: 'peer',
        affiliation: '',
        maxEnrollments: 2,
        attr: []
    };
    
    const signingIdentity = admin.getSigningIdentity();
    
    const registerResponse = await ca_client.register(registerRequest, signingIdentity);
    
    const client_enrollment = await ca_client.enroll({
        enrollmentID: registerConfig.peer.id,
        enrollmentSecret: registerConfig.peer.secret
        }
    );
 
    saveIdentity(registerConfig.peer.id, client_enrollment.certificate, client_enrollment.key.toBytes(), registerConfig.network.mspID);
    
    const tlsEnrollment = await ca_client.enroll({
            enrollmentID: registerConfig.peer.id,
            enrollmentSecret: registerConfig.peer.secret,
            profile: 'tls',
        },{
            dns: [`${registerConfig.peer.id}.${registerConfig.network.org}.example.com`, 'localhost']
        }
    );
    
    initializePeerFolderStructure(registerConfig.peer.id, registerConfig.network.org, registerConfig.network.caPort ,client_enrollment, tlsEnrollment);
}

async function addPeerToChannel(enrollChannelConfig){
    const ccpPath = path.resolve('..', 'test-network', 'organizations', 'fabric-ca', enrollChannelConfig.network.org, 'ca-cert.pem');
    const caPem = fs.readFileSync(ccpPath, 'utf8'); 

    const peer1Credentials = await getIdentity(enrollChannelConfig.peer.id);

    const peer1 = new UserBuilder(
        {
            name: enrollChannelConfig.peer.id,
            roles: ['peer'],
            affiliation: ''
        }
    );
    
    const peer1ClientKeyFile = getFileFromFolder(`../test-network/organizations/peerOrganizations/${enrollChannelConfig.network.org}.example.com/users/Admin@${enrollChannelConfig.network.org}.example.com/msp/keystore/`);
    const peer1ClientCertFile = `../test-network/organizations/peerOrganizations/${enrollChannelConfig.network.org}.example.com/users/Admin@${enrollChannelConfig.network.org}.example.com/msp/signcerts/cert.pem`;
    const peer1ClientCert = fs.readFileSync(peer1ClientCertFile).toString();
    const peer1ClientKey = fs.readFileSync(peer1ClientKeyFile).toString();
    
    const peer1User = peer1.build({
        key: peer1ClientKey,
        certificate: peer1ClientCert,
        mspid: peer1Credentials.mspId
    });
    
    const peer1_context = UserBuilder.getIdentityContext(peer1User);
    
    const peer = new Peer({
        peerPort: enrollChannelConfig.peer.port,
        peerHostName: `${enrollChannelConfig.peer.id}.${enrollChannelConfig.network.org}.example.com`,
        pem: caPem,
        host: 'localhost',
        clientKey: peer1Credentials.credentials.privateKey,
        clientCert: peer1Credentials.credentials.certificate,
        mspid: enrollChannelConfig.network.mspID
    });
    
    const peer1Pong = await peer.ping();
    console.log('Peer1', peer1Pong);
    
    const peer1_endorser = peer.getServiceEndpoints()[0];
    
    
    const endorserCAFile = getFileFromFolder(`../test-network/organizations/peerOrganizations/${enrollChannelConfig.endorser.org}.example.com/peers/${enrollChannelConfig.endorser.id}.${enrollChannelConfig.endorser.org}.example.com/tls/tlscacerts/`);
    const endorserClientCertFile = `../test-network/organizations/peerOrganizations/${enrollChannelConfig.endorser.org}.example.com/peers/${enrollChannelConfig.endorser.id}.${enrollChannelConfig.endorser.org}.example.com/tls/server.crt`;
    const endorserClientKeyFile = `../test-network/organizations/peerOrganizations/${enrollChannelConfig.endorser.org}.example.com/peers/${enrollChannelConfig.endorser.id}.${enrollChannelConfig.endorser.org}.example.com/tls/server.key`;
    
    const endorserClientKey = fs.readFileSync(endorserClientKeyFile).toString();
    const endorserClientCert = fs.readFileSync(endorserClientCertFile).toString();
    
    const endorserPeer0 = new Peer({
        peerPort: enrollChannelConfig.endorser.port,
        peerHostName: `${enrollChannelConfig.endorser.id}.${enrollChannelConfig.endorser.org}.example.com`,
        cert: endorserCAFile,
        host: 'localhost',
        clientKey: endorserClientKey,
        clientCert: endorserClientCert,
        mspid: enrollChannelConfig.endorser.mspID
        }
    );
    const peer0Pong = await endorserPeer0.ping();
    console.log('Peer0', peer0Pong);
        
    const endorser = endorserPeer0.getServiceEndpoints()[0];
    console.log('Endorser: ', endorser);
    
    const my_channel = emptyChannel(enrollChannelConfig.network.channel);
    // console.log('Channel', my_channel);
    
    const qsccProposal = new QSCCProposal(peer1_context, [endorser], my_channel);
    
    const block = await qsccProposal.queryBlock('0');
    const channelConfig = block.responses[0].response.payload;
    // console.log('Channel Config', channelConfig);
    
    const csccProposal = new CSCCProposal(peer1_context, [peer1_endorser]);
    // console.log('CSCC Proposal', csccProposal);
    
    // const channel = await csccProposal.queryChannels();
    // console.log('Channels', channel.responses[0].response.payload.toString());
    
    const update = await csccProposal.joinChannel(channelConfig);
    console.log('Update', update);
}

async function addPeerDockerComposerFile(config) {

    const peer = config.peer.id;
    const org = config.network.org;
    const mspid = config.network.mspID;
    const port = config.peer.port;
    const chainCodePort = config.peer.chainCodePort;
    const corePort = config.peer.corePort;

    const enderserId = config.endorser.id;
    const endorserPort = config.endorser.port;

    const composePath = path.resolve('..', 'test-network', 'compose', 'compose-test-net.yaml');
    const composeFile = fs.readFileSync(composePath, 'utf8');

    const yamlContent = YAML.parse(composeFile);

    const peerConfig = {
        container_name: `${peer}.${org}.example.com`,
        image: 'hyperledger/fabric-peer:latest',
        labels: {
            service: 'hyperledger-fabric'
        },
        environment: [
            'FABRIC_CFG_PATH=/etc/hyperledger/peercfg',
            'FABRIC_LOGGING_SPEC=DEBUG',
            'CORE_PEER_TLS_ENABLED=true',
            'CORE_PEER_PROFILE_ENABLED=false',
            'CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt',
            'CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key',
            'CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt',
            `CORE_PEER_ID=${peer}.${org}.example.com`,
            `CORE_PEER_ADDRESS=${peer}.${org}.example.com:${port}`,
            `CORE_PEER_LISTENADDRESS=0.0.0.0:${port}`,
            `CORE_PEER_CHAINCODEADDRESS=${peer}.${org}.example.com:${chainCodePort}`,
            `CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:${chainCodePort}`,
            `CORE_PEER_GOSSIP_BOOTSTRAP=${enderserId}.${org}.example.com:${endorserPort}`,
            `CORE_PEER_GOSSIP_EXTERNALENDPOINT=${peer}.${org}.example.com:${port}`,
            `CORE_PEER_LOCALMSPID=${mspid}`,
            'CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp',
            // `CORE_OPERATIONS_LISTENADDRESS=${peer}.${org}.example.com:${corePort}`,
            'CORE_METRICS_PROVIDER=prometheus',
            `CHAINCODE_AS_A_SERVICE_BUILDER_CONFIG={"peername":"${peer}${org}"}`,
            'CORE_CHAINCODE_EXECUTETIMEOUT=300s',
            `CORE_VM_ENDPOINT=unix:///host/var/run/docker.sock`,
            `CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=fabric_test`
        ],
        volumes: [
            `../organizations/peerOrganizations/${org}.example.com/peers/${peer}.${org}.example.com:/etc/hyperledger/fabric`,
            `${peer}.${org}.example.com:/var/hyperledger/production`,
            './docker/peercfg:/etc/hyperledger/peercfg',
            '${DOCKER_SOCK}:/host/var/run/docker.sock'
        ],
        working_dir: '/root',
        command: 'peer node start',
        ports: [
            `${port}:${port}`,
            // `${corePort}:${corePort}`
        ],
        networks: [
            'test'
        ]
    };

    yamlContent.services[`${peer}.${org}.example.com`] = peerConfig;
    yamlContent.volumes[`${peer}.${org}.example.com`] = null;

    const updatedYaml = YAML.stringify(yamlContent,{ nullStr: '' });
    fs.writeFileSync(composePath, updatedYaml, 'utf8');
}

async function runDockerImage(config) {

    const peer = config.peer.id;
    const org = config.network.org;

    await addPeerDockerComposerFile(config);

    let SOCK = '/var/run/docker.sock';
    let DOCKER_SOCK = SOCK.replace(/^unix:\/\//, '');
    let env = Object.assign({}, process.env, { DOCKER_SOCK: DOCKER_SOCK });

    const options = {
        env: env,
        cwd: path.resolve('..', 'test-network') // Adjust to your compose files directory
    };
    
    const composeArgs = [
        '-f', 'compose/compose-test-net.yaml',
        '-f', 'compose/docker/docker-compose-test-net.yaml',
        'up', '-d', `${peer}.${org}.example.com`
    ];
      
    spawn.sync('docker-compose', composeArgs, options);
}


export async function addPeer(reqData) {
    try {
        await registerPeer(reqData);
    
        await runDockerImage(reqData);
        //wait for the peer to start
        await new Promise(resolve => setTimeout(resolve, 5000));
        await addPeerToChannel(reqData);
        
        return 0;
    } catch (error) {
        console.log('Add Peer Error: ', error);
        return null;
    }
}


// const caFile = "../test-network/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem"
// const clientCertFile = "../test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.crt"
// const clientKeyFile = "../test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.key"

// const ordererCACert = fs.readFileSync(caFile).toString();
// const ordererClientKey = fs.readFileSync(clientKeyFile).toString();
// const ordererClientCert = fs.readFileSync(clientCertFile).toString();

// const orderer = new Orderer({
//     ordererPort: '7050',
//     ordererHostName: 'orderer.example.com',
//     tlsCaCert: caFile,
//     host: 'localhost',
//     clientCert: ordererClientCert,
//     clientKey: ordererClientKey
//     }
// );

// console.log('Orderer', orderer.getServiceEndpoints());

// const pingOrderer = await orderer.ping();
// console.log('Orderer', pingOrderer);

// const committer = orderer.getServiceEndpoints()[0];