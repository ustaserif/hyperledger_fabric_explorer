// src/ticket.ts
export class Ticket {
    public ticketID: string;
    public userID: string;
    public isUsed: boolean;

    constructor(ticketID: string, userID: string, isUsed: boolean = false) {
        this.ticketID = ticketID;
        this.userID = userID;
        this.isUsed = isUsed;
    }
}
