// src/routes/tickets.ts

import { Router } from 'express';
import * as ticketController from '../controllers/ticketController';

const router = Router();

router.post('/initLedger', ticketController.initLedger);
router.post('/createTransaction', ticketController.createTransaction);
router.get('/transaction/:transactionId', ticketController.getTransactionById);
router.get('/allTickets', ticketController.getAllTickets);
router.get('/ticket/:ticketID', ticketController.getTicketByID);
router.get('/verifyTransaction/:transactionID', ticketController.verifyTransaction);

export default router;