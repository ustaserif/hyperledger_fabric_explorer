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
import blockDecoder from "../formatter/blockDecoder.js";


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

function initializeOrgFolderStructure(config) {
    const org = config.ca.org;
    const caPort = config.ca.port;
  
    const orgDir = path.resolve('..', 'test-network', 'organizations', 'peerOrganizations', `${org}.example.com`);
    if (!fs.existsSync(orgDir)) {
        fs.mkdirSync(orgDir, { recursive: true });
    }

    const mspDir = path.resolve(orgDir, 'msp');
    const caCertsDir = path.resolve(mspDir, 'cacerts');
    
    if (!fs.existsSync(mspDir)) {
      fs.mkdirSync(mspDir, { recursive: true });
    }

    if(!fs.existsSync(caCertsDir)){
        fs.mkdirSync(caCertsDir, { recursive: true });
    }
  
    //copy .pem file from organizations/fabric-ca/org1/ca-cert.pem to caCertsDir
    const caCertPath = path.resolve('..', 'test-network', 'organizations', 'fabric-ca', org, 'ca-cert.pem');
    const destPath = path.resolve(caCertsDir, `localhost-${caPort}-ca-${org}.pem`);
    fs.copyFileSync(caCertPath, destPath);
}

function initializeUserFolderStructure(username, org, msp_enrollments) {
    
    const peerDir = path.resolve('..', 'test-network', 'organizations', 'peerOrganizations', `${org}.example.com`, 'users', `${username}@${org}.example.com`);
    if (!fs.existsSync(peerDir)) {
        fs.mkdirSync(peerDir, { recursive: true });
    }

    const mspDir = path.resolve(peerDir, 'msp');
    const caCertsDir = path.resolve(mspDir, 'cacerts');
    const keyStoreDir = path.resolve(mspDir, 'keystore');
    const signcertsDir = path.resolve(mspDir, 'signcerts');
    const userDir = path.resolve(mspDir, 'user');
    
    if (!fs.existsSync(mspDir)) {
      fs.mkdirSync(mspDir, { recursive: true });
      fs.mkdirSync(caCertsDir, { recursive: true });
      fs.mkdirSync(keyStoreDir, { recursive: true });
      fs.mkdirSync(signcertsDir, { recursive: true });
      fs.mkdirSync(userDir, { recursive: true });
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

async function generateConfigYaml(config){
    const org = config.ca.org;
    const port = config.ca.port;


    const configPath = path.resolve('..', 'test-network', 'organizations', 'peerOrganizations', `${org}.example.com`, 'msp');


    const nodeConfig = {
        Enable: true,
        ClientOUIdentifier: {
            Certificate: `cacerts/localhost-${port}-ca-${org}.pem`,
            OrganizationalUnitIdentifier: 'client'
        },
        PeerOUIdentifier: {
            Certificate: `cacerts/localhost-${port}-ca-${org}.pem`,
            OrganizationalUnitIdentifier: 'peer'
        },
        AdminOUIdentifier: {
            Certificate: `cacerts/localhost-${port}-ca-${org}.pem`,
            OrganizationalUnitIdentifier: 'admin'
        },
        OrdererOUIdentifier: {
            Certificate: `cacerts/localhost-${port}-ca-${org}.pem`,
            OrganizationalUnitIdentifier: 'orderer'
        },
    };

    let yamlContent = {
        NodeOUs: nodeConfig
    };

    const updatedYaml = YAML.stringify(yamlContent,{ nullStr: '' });

    //generate folder if it does not exist
    if (!fs.existsSync(configPath)) {
        fs.mkdirSync(configPath, { recursive: true });
    }

    //write config.yaml file to configPath
    const configDestPath = path.resolve(configPath, 'config.yaml');
    fs.writeFileSync(configDestPath, updatedYaml, 'utf8');

}

async function initializeOrgCA(registerConfig){
    console.log('Registering Peer: ', registerConfig);
    
    await generateConfigYaml(registerConfig);

    const ccpPath = path.resolve('..', 'test-network', 'organizations', 'fabric-ca', registerConfig.ca.org, 'ca-cert.pem');
    const caPem = fs.readFileSync(ccpPath, 'utf8');
    
    console.log('CA Pem: ', caPem);
    
    const ca_client = new FabricCAService({
        trustedRoots: caPem,
        protocol: 'https',
        hostname: 'localhost',
        port: parseInt(registerConfig.ca.port),
        caname: `ca-${registerConfig.ca.org}`
    });
    
    const enrollment = await ca_client.enroll({
        enrollmentID: 'admin',
        enrollmentSecret: 'adminpw'
    });
    
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

    const signingIdentity = admin.getSigningIdentity();
    
    // const peerRegisterRequest = {
    //     enrollmentID: registerConfig.peer.id,
    //     enrollmentSecret: registerConfig.peer.secret,
    //     role: 'peer',
    //     affiliation: '',
    //     maxEnrollments: 2,
    //     attr: []
    // };

    // const peerRegister = await ca_client.register(peerRegisterRequest, signingIdentity);

    // const peerClientEnrollment = await ca_client.enroll({
    //     enrollmentID: registerConfig.peer.id,
    //     enrollmentSecret: registerConfig.peer.secret
    //     }
    // );
    
    // saveIdentity(registerConfig.peer.userName, peerClientEnrollment.certificate, peerClientEnrollment.key.toBytes(), registerConfig.network.mspID);
    
    // const peerTlsEnrollment = await ca_client.enroll({
    //         enrollmentID: registerConfig.peer.id,
    //         enrollmentSecret: registerConfig.peer.secret,
    //         profile: 'tls',
    //     },{
    //         dns: [`${registerConfig.peer.id}.${registerConfig.network.org}.example.com`, 'localhost']
    //     }
    // );

    // initializePeerFolderStructure(registerConfig.peer.id, registerConfig.network.org, peerClientEnrollment, peerTlsEnrollment);

    // console.log('Peer Enrolled');


    const userRegisterRequest = {
        enrollmentID: registerConfig.user.id,
        enrollmentSecret: registerConfig.user.secret,
        role: 'client',
        affiliation: '',
        maxEnrollments: 2,
        attr: []
    };

    const userRegister = await ca_client.register(userRegisterRequest, signingIdentity);
   
    const userClientEnrollment = await ca_client.enroll({
        enrollmentID: registerConfig.user.id,
        enrollmentSecret: registerConfig.user.secret
        }
    );
 
    saveIdentity(registerConfig.user.id, userClientEnrollment.certificate, userClientEnrollment.key.toBytes(), registerConfig.network.mspID);
 
    initializeUserFolderStructure(registerConfig.user.userName, registerConfig.network.org, userClientEnrollment);

    console.log('User Enrolled');
    

    const adminRegisterRequest = {
        enrollmentID: registerConfig.admin.id,
        enrollmentSecret: registerConfig.admin.secret,
        role: 'admin',
        affiliation: '',
        maxEnrollments: 2,
        attr: []
    };
    
    const adminRegister = await ca_client.register(adminRegisterRequest, signingIdentity);
   
    const adminClientEnrollment = await ca_client.enroll({
        enrollmentID: registerConfig.admin.id,
        enrollmentSecret: registerConfig.admin.secret
    });
 
    saveIdentity(registerConfig.admin.id, adminClientEnrollment.certificate, adminClientEnrollment.key.toBytes(), registerConfig.network.mspID);
 
    initializeUserFolderStructure(registerConfig.admin.userName, registerConfig.network.org, adminClientEnrollment);

    console.log('Admin Enrolled');

    initializeOrgFolderStructure(registerConfig);
}

async function getChannelConfig(registerConfig) {

    const org = registerConfig.endorser.org;
    const channelName = registerConfig.network.channel;
    const MSPID = registerConfig.endorser.mspID;

    process.env.CORE_PEER_LOCALMSPID = MSPID;

    let FABRIC_CFG_PATH = path.resolve('..', 'test-network', 'configtx');
    process.env.FABRIC_CFG_PATH = FABRIC_CFG_PATH;

    let MSPCONFIGPATH = path.resolve('..', 'test-network', 'organizations', 'peerOrganizations', `${org}.example.com`, 'users', `Admin@${org}.example.com`, 'msp');
    process.env.CORE_PEER_MSPCONFIGPATH = MSPCONFIGPATH;
    
    const options = {
        env: process.env,
        cwd: path.resolve('..', 'test-network') // Adjust to your compose files directory
    };

    const peerBin = path.resolve('..', 'bin', 'peer');
    const configBlockPath = path.resolve('config_block.pb');
    const ordererCAFile = path.resolve('..','test-network', 'organizations', 'ordererOrganizations', 'example.com', 'orderers', 'orderer.example.com', 'msp', 'tlscacerts', 'tlsca.example.com-cert.pem');
    const peerConfigArgs = [
        'channel', 'fetch', 'config', configBlockPath, '-o', 'localhost:7050', '-c', channelName, '--tls', '--cafile', ordererCAFile
    ];

    const response = spawn.sync(peerBin, peerConfigArgs, options);
    if(response.status !== 0){
        console.log('Error fetching channel config');
        return null;
    }

    //configtxlator proto_decode --input config_block.pb --type common.Block --output config_block.json
    const configBlockJsonPath = path.resolve('config_block.json');
    const configtxlatorBin = path.resolve('..', 'bin', 'configtxlator');
    const configtxlatorArgs = [
        'proto_decode', '--input', configBlockPath, '--type', 'common.Block', '--output', configBlockJsonPath
    ];

    const configtxlatorResponse = spawn.sync(configtxlatorBin, configtxlatorArgs, options);
    if(configtxlatorResponse.status !== 0){
        console.log('Error decoding config block');
        return null;
    }

    //read the config block json file
    const configData = fs.readFileSync(configBlockJsonPath);

    return JSON.parse(configData.toString());

}

async function addOrgDataToConfigtx(registerConfig) {
    const mspId = registerConfig.network.mspID;
    const org = registerConfig.network.org;
    const peerId = registerConfig.peer.id;
    const port = registerConfig.peer.port;
    const objKey = registerConfig.network.configKey;

    const configtxPath = path.resolve('..', 'test-network', 'configtx', 'configtx.yaml');
    const configTxFile = fs.readFileSync(configtxPath, 'utf8');

    const yamlContent = YAML.parseDocument(configTxFile);
    console.log('Configtx', yamlContent);
    
    const newOrgConfig = {
        Name: mspId,
        ID: mspId,
        MSPDir: `../organizations/peerOrganizations/${org}.example.com/msp`,
        Policies: {
            Readers: {
                Type: 'Signature',
                Rule: `OR('${mspId}.admin', '${mspId}.peer', '${mspId}.client')`
            },
            Writers: {
                Type: 'Signature',
                Rule: `OR('${mspId}.admin', '${mspId}.client')`
            },
            Admins: {
                Type: 'Signature',
                Rule: `OR('${mspId}.admin')`
            },
            Endorsement: {
                Type: 'Signature',
                Rule: `OR('${mspId}.peer')`
            }
        }
    };
    const org3Node = yamlContent.createNode(newOrgConfig, { anchor: objKey });
    org3Node.anchor = objKey;

    const organizations = yamlContent.get('Organizations');
    organizations.add(org3Node);
    
    const applicationSection = yamlContent.getIn(['Profiles', 'ChannelUsingRaft', 'Application', 'Organizations']);
    const orgAlias = yamlContent.createAlias(yamlContent.getIn(['Organizations']).items.find(item => item.anchor === objKey));
    applicationSection.add(orgAlias);

    const updatedYaml = yamlContent.toString({ nullStr: '' });
    fs.writeFileSync(configtxPath, updatedYaml, 'utf8');
}

async function addOrgConfigToBlock(registerConfig, channelConfig) {
    const org = registerConfig.endorser.org;
    const MSPID = registerConfig.network.mspID;
    const channelName = registerConfig.network.channel;

    const configtxgenBin = path.resolve('..', 'bin', 'configtxgen');
    const configtxgenArgs = [
        '-printOrg', MSPID
    ];

    process.env.CORE_PEER_LOCALMSPID = MSPID;

    let FABRIC_CFG_PATH = path.resolve('..', 'test-network', 'configtx');
    process.env.FABRIC_CFG_PATH = FABRIC_CFG_PATH;

    let MSPCONFIGPATH = path.resolve('..', 'test-network', 'organizations', 'peerOrganizations', `${org}.example.com`, 'users', `Admin@${org}.example.com`, 'msp');
    process.env.CORE_PEER_MSPCONFIGPATH = MSPCONFIGPATH;
    
    const cmdOptions = {
        env: process.env,
        cwd: path.resolve('..', 'test-network') // Adjust to your compose files directory
    };

    const configtxgenResponse = spawn.sync(configtxgenBin, configtxgenArgs, cmdOptions);
    if(configtxgenResponse.status !== 0){
        console.log('Error generating org config');
        return null;
    }

    const org3Data = configtxgenResponse.stdout.toString();

    const modifiedConfigPath = path.resolve('modified_config.json');
    const org3DataJSON = JSON.parse(org3Data);
    channelConfig.channel_group.groups.Application.groups[MSPID] = org3DataJSON;

    fs.writeFileSync(modifiedConfigPath, JSON.stringify(channelConfig), 'utf8');

    const configtxlatorBin = path.resolve('..', 'bin', 'configtxlator');
    const configtxlatorArgs = [
        'proto_encode', '--input', 'config.json', '--type', 'common.Config', '--output', 'config.pb'
    ];

    const options = {
        env: process.env
    };


    const configtxlatorResponse = spawn.sync(configtxlatorBin, configtxlatorArgs, options);
    if(configtxlatorResponse.status !== 0){
        console.log('Configtxlator Error: ', configtxlatorResponse.stderr.toString());
        
        console.log('Error encoding config block');
        return null;
    }

    const configtxlatorArgs2 = [
        'proto_encode', '--input', 'modified_config.json', '--type', 'common.Config', '--output', 'modified_config.pb'
    ];

    const configtxlatorResponse2 = spawn.sync(configtxlatorBin, configtxlatorArgs2, options);
    if(configtxlatorResponse2.status !== 0){
        console.log('Error encoding');
        return null;
    }

    const configtxlatorArgs3 = [
        'compute_update', '--channel_id', channelName, '--original', 'config.pb', '--updated', 'modified_config.pb', '--output', 'update.pb'
    ];

    const configtxlatorResponse3 = spawn.sync(configtxlatorBin, configtxlatorArgs3, options);
    if(configtxlatorResponse3.status !== 0){
        console.log('Error compute_update config update');
        return null;
    }

    const configtxlatorArgs4 = [
        'proto_decode', '--input', 'update.pb', '--type', 'common.ConfigUpdate', '--output', 'update.json'
    ];

    const configtxlatorResponse4 = spawn.sync(configtxlatorBin, configtxlatorArgs4, options);
    if(configtxlatorResponse4.status !== 0){
        console.log('Error decoding config update');
        return null;
    }

    const updated_envelope = {
        payload: {
            header: {
                channel_header: {
                    channel_id: channelName,
                    type: 2
                }
            },
            data: {
                config_update: JSON.parse(fs.readFileSync('update.json').toString())
            }
        }
    };

    const updated_envelope_path = path.resolve('update_in_envelope.json');
    fs.writeFileSync(updated_envelope_path, JSON.stringify(updated_envelope), 'utf8');

    const configtxlatorArgs5 = [
        'proto_encode', '--input', 'update_in_envelope.json', '--type', 'common.Envelope', '--output', 'update_in_envelope.pb'
    ];

    const configtxlatorResponse5 = spawn.sync(configtxlatorBin, configtxlatorArgs5, options);
    if(configtxlatorResponse5.status !== 0){
        console.log('Error encoding config update');
        return null;
    }

    //remove all files except the org3_update_in_envelope.pb
    fs.rmSync('config_block.pb');
    fs.rmSync('config_block.json');
    fs.rmSync('config.pb');
    fs.rmSync('config.json');
    fs.rmSync('modified_config.json');
    fs.rmSync('modified_config.pb');
    fs.rmSync('update.pb');
    fs.rmSync('update.json');
    fs.rmSync('update_in_envelope.json');

}

async function signConfigTxForAllOrgs(org) {

    const MSPID = `${org.charAt(0).toUpperCase()}${org.slice(1)}MSP`;

    process.env.CORE_PEER_LOCALMSPID = MSPID;

    let FABRIC_CFG_PATH = path.resolve('..', 'test-network', 'configtx');
    process.env.FABRIC_CFG_PATH = FABRIC_CFG_PATH;

    let MSPCONFIGPATH = path.resolve('..', 'test-network', 'organizations', 'peerOrganizations', `${org}.example.com`, 'users', `Admin@${org}.example.com`, 'msp');
    process.env.CORE_PEER_MSPCONFIGPATH = MSPCONFIGPATH;

    // peer channel signconfigtx -f org3_update_in_envelope.pb
    const peerBin = path.resolve('..', 'bin', 'peer');

    const signConfigArgs = [
        'channel', 'signconfigtx', '-f', 'update_in_envelope.pb'
    ];

    const options = {
        env: process.env
    };

    const signConfigResponse = spawn.sync(peerBin, signConfigArgs, options);

    if(signConfigResponse.status !== 0){
        console.log('Error signing config update');
        return null;
    }
}

async function updateChannelConfig(config){
    
    const org = config.endorser.org;
    const channelName = config.network.channel;
    const MSPID = config.endorser.mspID;

    process.env.CORE_PEER_LOCALMSPID = MSPID;

    let FABRIC_CFG_PATH = path.resolve('..', 'test-network', 'configtx');
    process.env.FABRIC_CFG_PATH = FABRIC_CFG_PATH;

    let MSPCONFIGPATH = path.resolve('..', 'test-network', 'organizations', 'peerOrganizations', `${org}.example.com`, 'users', `Admin@${org}.example.com`, 'msp');
    process.env.CORE_PEER_MSPCONFIGPATH = MSPCONFIGPATH;
    
    const options = {
        env: process.env
    };

    //peer channel update -f update_in_envelope.pb -c mychannel -o localhost:7050 --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

    const peerBin = path.resolve('..', 'bin', 'peer');
    const ordererCAFile = path.resolve('..','test-network', 'organizations', 'ordererOrganizations', 'example.com', 'orderers', 'orderer.example.com', 'msp', 'tlscacerts', 'tlsca.example.com-cert.pem');
    const peerConfigArgs = [
        'channel', 'update', '-f', 'update_in_envelope.pb', '-c', channelName, '-o', 'localhost:7050', '--tls', '--cafile', ordererCAFile
    ];

    const response = spawn.sync(peerBin, peerConfigArgs, options);
    if(response.status !== 0){
        console.log('Error updating channel config');
        return null;
    }

    console.log('Channel Config Updated');
}

async function addOrgToChannel(config){

    try {
        const channelConfigJSON = await getChannelConfig(config);
        console.log('Config Data', channelConfigJSON);
        const channelConfig = channelConfigJSON.data.data[0].payload.data.config;
        
        //write file to config.json
        const configPath = path.resolve('config.json');
        fs.writeFileSync(configPath, JSON.stringify(channelConfig), 'utf8');
    
        console.log('Channel Config', channelConfig);
    
        await addOrgDataToConfigtx(config);
        console.log('Org Added to Configtx');
    
        await addOrgConfigToBlock(config, channelConfig);
    
        // get all path names in the ../test-network/organizations/peerOrganizations
        const orgs = fs.readdirSync(path.resolve('..', 'test-network', 'organizations', 'peerOrganizations'));
        console.log('Orgs', orgs);
    
        const orgList = [];
        
        orgs.map(org => {
            //get first 3 characters of the org name except if it is not same config.network.org
            const orgName = org.substring(0, 4);
            if(orgName !== config.network.org){
                orgList.push(orgName);
            }
        }
        );
    
        console.log('Org List', orgList);
    
        await Promise.all(orgList.map(async org => await signConfigTxForAllOrgs(org)));
    
        updateChannelConfig(config);
    
    
        return 0;
    } catch (error) {
        console.log('Add Org Error: ', error);
        return null;
        
    }
}

async function addPeerToChannel(enrollChannelConfig){
    const ccpPath = path.resolve('..', 'test-network', 'organizations', 'peerOrganizations', `${enrollChannelConfig.network.org}.example.com`, `connection-${enrollChannelConfig.network.org}.json`);
    const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
    const ccp = JSON.parse(ccpJSON);
    const caInfo = ccp.certificateAuthorities[`ca.${enrollChannelConfig.network.org}.example.com`];
    

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
        pem: caInfo.tlsCACerts.pem[0],
        host: 'localhost',
        clientKey: peer1Credentials.credentials.privateKey,
        clientCert: peer1Credentials.credentials.certificate,
        mspid: enrollChannelConfig.network.mspID
    });
    
    const peer1Pong = await peer.ping();
    console.log('Peer1', peer1Pong);
    
    const peer1_endorser = peer.getServiceEndpoints()[0];
    
    
    const endorserCAFile = getFileFromFolder(`../test-network/organizations/peerOrganizations/${enrollChannelConfig.network.org}.example.com/peers/${enrollChannelConfig.endorser.id}.${enrollChannelConfig.network.org}.example.com/tls/tlscacerts/`);
    const endorserClientCertFile = `../test-network/organizations/peerOrganizations/${enrollChannelConfig.network.org}.example.com/peers/${enrollChannelConfig.endorser.id}.${enrollChannelConfig.network.org}.example.com/tls/server.crt`;
    const endorserClientKeyFile = `../test-network/organizations/peerOrganizations/${enrollChannelConfig.network.org}.example.com/peers/${enrollChannelConfig.endorser.id}.${enrollChannelConfig.network.org}.example.com/tls/server.key`;
    
    const endorserClientKey = fs.readFileSync(endorserClientKeyFile).toString();
    const endorserClientCert = fs.readFileSync(endorserClientCertFile).toString();
    
    const endorserPeer0 = new Peer({
        peerPort: enrollChannelConfig.endorser.port,
        peerHostName: `${enrollChannelConfig.endorser.id}.${enrollChannelConfig.network.org}.example.com`,
        cert: endorserCAFile,
        host: 'localhost',
        clientKey: endorserClientKey,
        clientCert: endorserClientCert,
        mspid: enrollChannelConfig.network.mspID
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

async function runDockerImage(config) {

    const org = config.ca.org;

    // await addPeerDockerComposerFile(config);

    let SOCK = '/var/run/docker.sock';
    let DOCKER_SOCK = SOCK.replace(/^unix:\/\//, '');
    let env = Object.assign({}, process.env, { DOCKER_SOCK: DOCKER_SOCK });

    const options = {
        env: env,
        cwd: path.resolve('..', 'test-network') // Adjust to your compose files directory
    };
    
    const composeArgs = [
        '-f', 'compose/compose-ca.yaml',
        'up', '-d', `ca_${org}`
    ];
      
    console.log('Compose Args: ', composeArgs);
    
    spawn.sync('docker-compose', composeArgs, options);

    console.log('Docker Compose Up');
}

async function generateCADockerComposerFile(config){
    const org = config.ca.org;
    const port = config.ca.port;
    const listenerPort = config.ca.listenerPort;

    //mkdir if it does not exist ""../organizations/fabric-ca/${org}"
    const caDir = path.resolve('..', 'test-network', 'organizations', 'fabric-ca', org);
    if (!fs.existsSync(caDir)) {
        fs.mkdirSync(caDir, { recursive: true });
    }
    

    const composePath = path.resolve('..', 'test-network', 'compose', 'compose-ca.yaml');
    const composeFile = fs.readFileSync(composePath, 'utf8');

    const yamlContent = YAML.parse(composeFile);

    const caConfig = {
        container_name: `ca_${org}`,
        image: 'hyperledger/fabric-ca:latest',
        labels: {
            service: 'hyperledger-fabric'
        },
        environment: [
            'FABRIC_CA_HOME=/etc/hyperledger/fabric-ca-server',
            `FABRIC_CA_SERVER_CA_NAME=ca-${org}`,
            'FABRIC_CA_SERVER_TLS_ENABLED=true',
            `FABRIC_CA_SERVER_PORT=${port}`,
            // `FABRIC_CA_SERVER_OPERATIONS_LISTENADDRESS=0.0.0.0:${listenerPort}`,
        ],
        ports: [
            `${port}:${port}`,
            // `${listenerPort}:${listenerPort}`
        ],
        volumes: [
            `../organizations/fabric-ca/${org}:/etc/hyperledger/fabric-ca-server`,
        ],

        command: `sh -c 'fabric-ca-server start -b admin:adminpw -d'`,
        networks: [
            'test'
        ]
    };

    yamlContent.services[`ca_${org}`] = caConfig;

    const updatedYaml = YAML.stringify(yamlContent,{ nullStr: '' });
    fs.writeFileSync(composePath, updatedYaml, 'utf8');
}


export async function initializeCA(reqData) {
    try {
        await generateCADockerComposerFile(reqData);
        await runDockerImage(reqData);
        //sleep for 5 seconds to allow the CA to start
        await new Promise(resolve => setTimeout(resolve, 5000));
        await initializeOrgCA(reqData);
        return 0;
    } catch (error) {
        console.log('Add Peer Error: ', error);
        return null;
    }
}

export async function addChannel(reqData) {
    try{
        await addOrgToChannel(reqData);
        return 0;
    } catch (error) {
        console.log('Add Channel Error: ', error);
        return null;
    }
}

export async function addOrg3(){
    // run shell script to add org3 to the network
    // ./addOrg3.sh up -c mychannel
    const options = {
        cwd: path.resolve('..', 'test-network', 'addOrg3') // Adjust to your compose files directory
    };

    const addOrg3Bin = path.resolve('..', 'test-network', 'addOrg3', 'addOrg3.sh');
    const addOrg3Args = [
        'up', '-ca', '-c', 'mychannel'
    ];

    console.log('Adding Org3: ', addOrg3Bin);
    console.log('Arguments: ', addOrg3Args);
    

    const response = spawn.sync(addOrg3Bin, addOrg3Args, options);
    
    
    if(response.status !== 0){
        console.log('Error: ', response.stderr.toString());
        return null;
    }

    return 0;
}