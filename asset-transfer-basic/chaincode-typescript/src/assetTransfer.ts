/*
 * SPDX-License-Identifier: Apache-2.0
 * Blockchain asset transfer smart contract
 * Includes utility for deterministic JSON stringification to ensure consistent hashing
 */

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import stringify from 'json-stringify-deterministic';
import sortKeysRecursive from 'sort-keys-recursive';
import { Asset } from './asset';
import { Membership } from './membership';
import { Ticket } from './ticket';

class Fare {
    amount: string;
    currency: string;
}

class TransportationDetails {
    modeOfTransport: string;
    routeId: string;
    startLocation: string;
    endLocation: string;
    fare: Fare;
}

class MembershipDetails {
    membershipId: string;
    validity: string;
}

class TransactionDetails {
    assetId: string;
    assetType: string;
    operation: "create" | "update" | "delete";
    payload: any;
}

class TransactionRecord {
    transactionType: "Payment" | "AssetTransfer";
    transactionId: string;
    timestamp: string;
    invokedBy: string;
    transportationDetails: TransportationDetails;
    membershipDetails: MembershipDetails;
    transactionDetails: TransactionDetails;
}

@Info({ title: 'AssetTransfer', description: 'Smart contract for trading assets' })
export class AssetTransferContract extends Contract {

    @Transaction()
    public async InitLedger(ctx: Context): Promise<void> {
        // Initialize the ledger with a set of predefined assets
        const assets: Asset[] = [
            { ID: 'asset1', Color: 'blue', Size: 5, Owner: 'Tomoko', AppraisedValue: 300 },
            { ID: 'asset2', Color: 'red', Size: 5, Owner: 'Brad', AppraisedValue: 400 },
            { ID: 'asset3', Color: 'green', Size: 10, Owner: 'Jin Soo', AppraisedValue: 500 },
            { ID: 'asset4', Color: 'yellow', Size: 10, Owner: 'Max', AppraisedValue: 600 },
            { ID: 'asset5', Color: 'black', Size: 15, Owner: 'Adriana', AppraisedValue: 700 },
            { ID: 'asset6', Color: 'white', Size: 15, Owner: 'Michel', AppraisedValue: 800 },
        ];

        for (const asset of assets) {
            // Tag asset type as 'asset' for easy querying
            asset.docType = 'asset';

            // Store asset deterministically to maintain data order and hash consistency
            await ctx.stub.putState(asset.ID, Buffer.from(stringify(sortKeysRecursive(asset))));
            console.info(`Asset ${asset.ID} initialized`);
        }
    }

    @Transaction()
    public async CreateTransaction(ctx: Context, transactionData: string): Promise<void> {
        // Parse transaction data from input
        const transaction: TransactionRecord = JSON.parse(transactionData);

        // Ensure transaction ID is unique before storing
        const exists = await ctx.stub.getState(transaction.transactionId);
        if (exists && exists.length > 0) {
            throw new Error(`Transaction with ID ${transaction.transactionId} already exists`);
        }

        // Save transaction data to the ledger
        await ctx.stub.putState(transaction.transactionId, Buffer.from(stringify(transaction)));
        console.info(`Transaction ${transaction.transactionId} created successfully`);
    }

    @Transaction(false)
    public async GetTransactionById(ctx: Context, transactionId: string): Promise<string> {
        // Retrieve a specific transaction by its ID
        const transactionJSON = await ctx.stub.getState(transactionId);
        if (!transactionJSON || transactionJSON.length === 0) {
            throw new Error(`Transaction with ID ${transactionId} does not exist`);
        }
        return transactionJSON.toString();
    }

    @Transaction()
    public async createMembership(ctx: Context, userID: string, membershipStatus: string): Promise<void> {
        // Create a new membership entry for a user
        const membership = new Membership(userID, membershipStatus);

        // Verify membership uniqueness
        const exists = await this.membershipExists(ctx, userID);
        if (exists) {
            throw new Error(`Membership for user ${userID} already exists`);
        }

        // Store membership in the ledger
        await ctx.stub.putState(userID, Buffer.from(JSON.stringify(membership)));
    }

    @Transaction(false)
    public async membershipExists(ctx: Context, userID: string): Promise<boolean> {
        // Check if a membership exists for the specified user ID
        const membershipJSON = await ctx.stub.getState(userID);
        return membershipJSON && membershipJSON.length > 0;
    }

    @Transaction()
    public async purchaseTicket(ctx: Context, ticketID: string, userID: string): Promise<void> {
        // Issue a ticket to a user if they have an active membership
        const membershipJSON = await ctx.stub.getState(userID);
        if (!membershipJSON || membershipJSON.length === 0) {
            throw new Error(`Membership for user ${userID} does not exist`);
        }

        const membership = JSON.parse(membershipJSON.toString());
        if (membership.membershipStatus !== "active") {
            throw new Error(`User ${userID} does not have an active membership`);
        }

        const ticket = new Ticket(ticketID, userID);
        await ctx.stub.putState(ticketID, Buffer.from(JSON.stringify(ticket)));

        console.log(`Ticket ${ticketID} purchased for user ${userID}`);
    }

    @Transaction()
    public async useTicket(ctx: Context, ticketID: string, userID: string): Promise<void> {
        // Mark a ticket as used if it belongs to the user and is valid
        const ticketJSON = await ctx.stub.getState(ticketID);
        if (!ticketJSON || ticketJSON.length === 0) {
            throw new Error(`Ticket ${ticketID} does not exist`);
        }

        const ticket = JSON.parse(ticketJSON.toString());

        if (ticket.userID !== userID) {
            throw new Error(`Ticket ${ticketID} does not belong to user ${userID}`);
        }

        if (ticket.isUsed) {
            throw new Error(`Ticket ${ticketID} has already been used`);
        }

        ticket.isUsed = true;
        await ctx.stub.putState(ticketID, Buffer.from(JSON.stringify(ticket)));
    }

    @Transaction(false)
    public async getAllTickets(ctx: Context): Promise<string> {
        // Retrieve all tickets in the ledger
        const iterator = await ctx.stub.getStateByRange('', '');
        const tickets = [];

        let result = await iterator.next();
        while (!result.done) {
            tickets.push(JSON.parse(result.value.value.toString('utf8')));
            result = await iterator.next();
        }

        return JSON.stringify(tickets);
    }

    @Transaction(false)
    public async getTicketByID(ctx: Context, ticketID: string): Promise<string> {
        // Retrieve a ticket by its ID
        const ticketJSON = await ctx.stub.getState(ticketID);
        if (!ticketJSON || ticketJSON.length === 0) {
            throw new Error(`Ticket ${ticketID} does not exist`);
        }
        return ticketJSON.toString();
    }

    @Transaction(false)
    public async QueryTransactionByID(ctx: Context, transactionID: string): Promise<string> {
        // Retrieve transaction history for a specific transaction ID
        try {
            const transactionHistory = await ctx.stub.getHistoryForKey(transactionID);
            const transactions = [];

            let res = await transactionHistory.next();
            while (!res.done) {
                if (res.value) {
                    transactions.push({
                        txID: res.value.tx_id,
                        value: res.value.value.toString('utf8'),
                        isDelete: res.value.is_delete,
                        timestamp: new Date(res.value.timestamp.getSeconds() * 1000),
                    });
                }
                res = await transactionHistory.next();
            }

            await transactionHistory.close();
            return JSON.stringify(transactions);
        } catch (error) {
            throw new Error(`Failed to retrieve transaction history for ${transactionID}: ${error}`);
        }
    }

    @Transaction()
    public async CreateAsset(ctx: Context, id: string, color: string, size: number, owner: string, appraisedValue: number): Promise<void> {
        // Issue a new asset if it does not already exist
        const exists = await this.AssetExists(ctx, id);
        if (exists) {
            throw new Error(`The asset ${id} already exists`);
        }

        const asset = { ID: id, Color: color, Size: size, Owner: owner, AppraisedValue: appraisedValue };
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
    }

    @Transaction(false)
    public async ReadAsset(ctx: Context, id: string): Promise<string> {
        // Retrieve asset details by ID
        const assetJSON = await ctx.stub.getState(id);
        if (assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    @Transaction()
    public async UpdateAsset(ctx: Context, id: string, color: string, size: number, owner: string, appraisedValue: number): Promise<void> {
        // Update an existing asset with new data
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }

        const updatedAsset = { ID: id, Color: color, Size: size, Owner: owner, AppraisedValue: appraisedValue };
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(updatedAsset))));
    }

    @Transaction()
    public async DeleteAsset(ctx: Context, id: string): Promise<void> {
        // Remove an asset from the ledger
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return ctx.stub.deleteState(id);
    }

    @Transaction(false)
    @Returns('boolean')
    public async AssetExists(ctx: Context, id: string): Promise<boolean> {
        // Check if an asset exists on the ledger by ID
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON.length > 0;
    }

    @Transaction()
    public async TransferAsset(ctx: Context, id: string, newOwner: string): Promise<string> {
        // Change ownership of an asset and return previous owner
        const assetString = await this.ReadAsset(ctx, id);
        const asset = JSON.parse(assetString) as Asset;
        const oldOwner = asset.Owner;
        asset.Owner = newOwner;
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        return oldOwner;
    }

    @Transaction(false)
    @Returns('string')
    public async GetAllAssets(ctx: Context): Promise<string> {
        // Retrieve all assets from the ledger
        const allResults = [];
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue) as Asset;
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }
}