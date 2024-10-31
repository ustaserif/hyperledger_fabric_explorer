// src/app.ts

import express from 'express';
import ticketRoutes from './routes/tickets';
import { blockchainService } from './services/blockchainService';
import { ticketService } from './services/ticketService';
import { logger } from './utils/logger';

const app = express();
app.use(express.json());
app.use('/api', ticketRoutes);

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await blockchainService.connectGateway();

    // Set the contract in ticketService
    ticketService.setContract(blockchainService.contract);

    // Now you can safely call ticketService methods
    await ticketService.initLedger();

    const allTickets = await ticketService.getAllTickets();
    console.log('All Tickets:', allTickets);

    const ticket = await ticketService.getTicketByID('ticket123');
    console.log('Ticket Details:', ticket);

    const verificationResult = await ticketService.verifyTransaction('transactionID123');
    console.log('Transaction Verification Details:', verificationResult);

    const transaction = await ticketService.getTransactionById('UniqueTransactionID123');
    console.log('Transaction Details:', transaction);

    // Uncomment and provide transaction data if you want to create a transaction
    // const transactionData = {
    //   transactionType: "Payment",
    //   transactionId: "UniqueTransactionID123",
    //   timestamp: new Date().toISOString(),
    //   invokedBy: "UserID123",
    //   transportationDetails: {
    //     modeOfTransport: "bus",
    //     routeId: "Route42",
    //     startLocation: "StationA",
    //     endLocation: "StationB",
    //     fare: { amount: "3.50", currency: "USD" }
    //   },
    //   membershipDetails: { membershipId: "Membership123", validity: "2024-12-31" },
    //   transactionDetails: { assetId: "Asset123", assetType: "Ticket", operation: "create", payload: {} }
    // };
    // await ticketService.createTransaction(transactionData);

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`Failed to start the application: ${error}`);
    process.exit(1);
  }
}

startServer();