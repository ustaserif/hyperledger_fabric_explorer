// src/services/ticketService.ts

import { blockchainService } from './blockchainService';
import { Contract } from '@hyperledger/fabric-gateway';
import { TextDecoder } from 'util';

const utf8Decoder = new TextDecoder();

class TicketService {
    private contract!: Contract;

  constructor() {
  }


  public setContract(contract: Contract): void {
    this.contract = contract;
  }

  async initLedger(): Promise<void> {
    console.log('Initializing ledger with default asset data...');
    await this.contract.submitTransaction('InitLedger');
    console.log('Ledger initialized successfully');
  }

  async createTransaction(transactionData: any): Promise<void> {
    await this.contract.submitTransaction('CreateTransaction', JSON.stringify(transactionData));
    console.log(`Transaction successfully added: ${transactionData.transactionId}`);
  }

  async getTransactionById(transactionId: string): Promise<any> {
    const resultBytes = await this.contract.evaluateTransaction('GetTransactionById', transactionId);
    const resultJson = utf8Decoder.decode(resultBytes);
    return JSON.parse(resultJson);
  }

  async getAllTickets(): Promise<any[]> {
    const resultBytes = await this.contract.evaluateTransaction('getAllTickets');
    const resultJson = utf8Decoder.decode(resultBytes);
    return JSON.parse(resultJson);
  }

  async getTicketByID(ticketID: string): Promise<any> {
    const resultBytes = await this.contract.evaluateTransaction('getTicketByID', ticketID);
    const resultJson = utf8Decoder.decode(resultBytes);
    return JSON.parse(resultJson);
  }

  async verifyTransaction(transactionID: string): Promise<any> {
    try {
      const resultBytes = await this.contract.evaluateTransaction('QueryTransactionByID', transactionID);
      const resultJson = utf8Decoder.decode(resultBytes);
      return JSON.parse(resultJson);
    } catch (error) {
      console.error('Error verifying transaction:', error);
      throw error;
    }
  }
}

export const ticketService = new TicketService();