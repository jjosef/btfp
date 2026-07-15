import type { Thing } from './thing.js';
export type ContributionStatus = 'pending' | 'approved' | 'rejected';
export interface Contribution {
    id: string;
    /** Set when proposing an edit to an existing thing; absent for a brand-new thing. */
    thingId?: string;
    contributorId: string;
    status: ContributionStatus;
    payload: Partial<Thing>;
    createdAt: string;
    reviewedAt?: string;
    reviewerId?: string;
    reviewNotes?: string;
}
//# sourceMappingURL=contribution.d.ts.map