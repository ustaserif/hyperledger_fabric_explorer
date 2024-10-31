// src/services/blockchainService.ts

import * as grpc from '@grpc/grpc-js';
import {
  connect,
  Contract,
  Identity,
  Signer,
  signers,
  Gateway,
} from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Config } from '../config/config';
import { logger } from '../utils/logger';
import { Buffer } from 'buffer';

class BlockchainService {
  private client!: grpc.Client;
  private gateway!: Gateway;
  public contract!: Contract;

  constructor() {
    // Initialization is done in connectGateway()
  }

  async connectGateway(): Promise<void> {
    this.client = await this.newGrpcConnection();
    const identity = await this.newIdentity();
    const signer = await this.newSigner();

    this.gateway = connect({
      client: this.client,
      identity,
      signer,
      evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
      endorseOptions: () => ({ deadline: Date.now() + 15000 }),
      submitOptions: () => ({ deadline: Date.now() + 5000 }),
      commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
    });

    const network = this.gateway.getNetwork(Config.channelName);
    this.contract = network.getContract(Config.chaincodeName);
  }

  private async newGrpcConnection(): Promise<grpc.Client> {
    const tlsRootCert = await fs.readFile(Config.tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(Config.peerEndpoint, tlsCredentials, {
      'grpc.ssl_target_name_override': Config.peerHostAlias,
    });
  }

  private async newIdentity(): Promise<Identity> {
    const certPath = await this.getFirstFileInDirectory(Config.certDirectoryPath);
    const credentials = await fs.readFile(certPath);
    return { mspId: Config.mspId, credentials };
  }

  private async newSigner(): Promise<Signer> {
    const keyPath = await this.getFirstFileInDirectory(Config.keyDirectoryPath);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
  }

  private async getFirstFileInDirectory(dirPath: string): Promise<string> {
    const files = await fs.readdir(dirPath);
    const file = files[0];
    if (!file) {
      throw new Error(`No files found in directory: ${dirPath}`);
    }
    return path.join(dirPath, file);
  }

  async submitTransaction(functionName: string, ...args: string[]): Promise<Buffer> {
    const resultBytes = await this.contract.submitTransaction(functionName, ...args);
    return Buffer.from(resultBytes);
  }

  async evaluateTransaction(functionName: string, ...args: string[]): Promise<Buffer> {
    const resultBytes = await this.contract.evaluateTransaction(functionName, ...args);
    return Buffer.from(resultBytes);
  }

  disconnect(): void {
    this.gateway.close();
    this.client.close();
  }
}

export const blockchainService = new BlockchainService();