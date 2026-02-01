export type PartnerStatus = 'DRAFT' | 'ONBOARDING' | 'LIVE' | 'MAINTENANCE' | 'SUSPENDED';
export type KanbanStage = 'AWAITING_KICKOFF' | 'SANDBOX_ACTIVE' | 'SIT_VERIFICATION' | 'REVISION_PENDING' | 'READY_FOR_DEPLOY';

export interface PartnerDocStatus {
    sit: 'PENDING' | 'IN_REVIEW' | 'NEEDS_REVISION' | 'APPROVED';
    reconcile: 'PENDING' | 'IN_REVIEW' | 'NEEDS_REVISION' | 'APPROVED';
    devsite: 'PENDING' | 'IN_REVIEW' | 'NEEDS_REVISION' | 'APPROVED';
}

export interface Partner {
    id: string;
    name: string;
    code: string;
    status: PartnerStatus;
    kanbanStage?: KanbanStage | null;
    docStatus?: PartnerDocStatus | any; // using any fallback for safety if db JSON mismatch logic

    createdAt?: string | Date;
    updatedAt?: string | Date;
    integrator?: string | null;
    notes?: string | null;
}
