// src/membership.ts
export class Membership {
    public userID: string;
    public membershipStatus: string; // "active", "expired", etc.

    constructor(userID: string, membershipStatus: string) {
        this.userID = userID;
        this.membershipStatus = membershipStatus;
    }
}
