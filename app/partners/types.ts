export type PartnerStatus = 'DRAFT' | 'ONBOARDING' | 'LIVE' | 'MAINTENANCE' | 'SUSPENDED';
export type BoardStage = 'INITIATION' | 'KICKOFF_SETUP' | 'DEV_CONFIG' | 'TESTING_VALIDATION' | 'QA_REVIEW' | 'PARTNER_REVISION' | 'BLOCKED_WAITING' | 'PRE_PRODUCTION' | 'PRODUCTION_READY' | 'DEPLOYED' | 'POST_DEPLOYMENT' | 'DONE' | 'ARCHIVED';
export type IntegrationType = 'INBOUND' | 'OUTBOUND' | 'HYBRID';
export type Complexity = 'LOW' | 'MEDIUM' | 'HARD';
export type TrafficLight = 'HEALTHY' | 'DEGRADED' | 'CRITICAL';


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
    boardStage?: BoardStage | null;
    kanbanStage?: BoardStage | null; // Keep for backward compat temporarily, though shouldn't use
    integrationType?: IntegrationType;
    complexity?: Complexity;
    trafficLight?: TrafficLight;
    boardTasks?: any;
    trafficComments?: any[];
    docStatus?: PartnerDocStatus | any; // using any fallback for safety if db JSON mismatch logic

    createdAt?: string | Date;
    updatedAt?: string | Date;
    kanbanOrder?: number;
    integratorId?: string | null;
    integrator?: { id: string; name: string | null; email: string } | null;
    notes?: string | null;
    features?: { id: string; name: string; category: string }[];
}
