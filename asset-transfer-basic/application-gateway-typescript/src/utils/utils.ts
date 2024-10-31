import { Config } from '../config/config';

export function displayInputParameters(): void {
  console.log(`Channel Name: ${Config.channelName}`);
  console.log(`Chaincode Name: ${Config.chaincodeName}`);
  console.log(`MSP ID: ${Config.mspId}`);
  console.log(`Crypto Path: ${Config.cryptoPath}`);
  console.log(`Key Directory Path: ${Config.keyDirectoryPath}`);
  console.log(`Cert Directory Path: ${Config.certDirectoryPath}`);
  console.log(`TLS Cert Path: ${Config.tlsCertPath}`);
  console.log(`Peer Endpoint: ${Config.peerEndpoint}`);
  console.log(`Peer Host Alias: ${Config.peerHostAlias}`);
}
