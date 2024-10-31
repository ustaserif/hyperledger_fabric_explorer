// src/controllers/ticketController.ts

import { Request, Response } from 'express';
import { ticketService } from '../services/ticketService';

export const initLedger = async (req: Request, res: Response): Promise<void> => {
  try {
    await ticketService.initLedger();
    res.status(200).json({ message: 'Ledger initialized successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: String(error) });
    }
  }
};

export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const transactionData = req.body;
    await ticketService.createTransaction(transactionData);
    res.status(200).json({
      message: 'Transaction created successfully',
      transactionId: transactionData.transactionId,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: String(error) });
    }
  }
};

export const getTransactionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const transactionId = req.params.transactionId;
    if (!transactionId) {
      res.status(400).json({ error: 'Transaction ID is required' });
      return;
    }
    const transaction = await ticketService.getTransactionById(transactionId);
    res.status(200).json(transaction);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: String(error) });
    }
  }
};

export const getAllTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const tickets = await ticketService.getAllTickets();
    res.status(200).json(tickets);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: String(error) });
    }
  }
};

export const getTicketByID = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticketID = req.params.ticketID;
    if (!ticketID) {
      res.status(400).json({ error: 'Ticket ID is required' });
      return;
    }
    const ticket = await ticketService.getTicketByID(ticketID);
    res.status(200).json(ticket);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: String(error) });
    }
  }
};

export const verifyTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const transactionID = req.params.transactionID;
    if (!transactionID) {
      res.status(400).json({ error: 'Transaction ID is required' });
      return;
    }
    const verificationResult = await ticketService.verifyTransaction(transactionID);
    res.status(200).json(verificationResult);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: String(error) });
    }
  }
};