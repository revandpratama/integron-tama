import { IntegrationType, BoardStage } from '../partners/types';

export const GLOBAL_INITIATION_TASKS = [
    'Email Technical Documentation to Partner',
    'Provide Checklist'
];

// Task key prefixes define visual group sections in the UI:
// [Test]  = Testing Phase
// [Gate]  = Partner Submission Gate
// [Check] = Integrator Sanity Check

const TESTING_VALIDATION_INBOUND: string[] = [
    '[Test] SIT API Testing',
    '[Gate] SIT Document Received',
    '[Gate] Devsite Document Received',
    '[Gate] Reconciliation Document Received',
    '[Check] SIT Logs / Connectivity Validated',
    '[Check] Devsite Results Validated',
    '[Check] Reconciliation Format Validated (BRI Standard)',
];

const TESTING_VALIDATION_OUTBOUND: string[] = [
    '[Test] SIT API Testing',
    '[Test] E2E Testing (Outbound / Webhook)',
    '[Gate] SIT Document Received',
    '[Gate] Devsite Document Received',
    '[Gate] Reconciliation Document Received',
    '[Check] SIT Logs / Connectivity Validated',
    '[Check] Devsite Results Validated',
    '[Check] Reconciliation Format Validated (BRI Standard)',
];

// Partner Revision tasks are the same regardless of type; they track exactly what needs fixing.
const PARTNER_REVISION_TASKS: string[] = [
    'SIT Revision (Requested by Integrator)',
    'Devsite Revision (Requested by Integrator)',
    'Reconciliation Revision (Requested by Integrator)',
    'SIT Revision (Requested by QA)',
    'Devsite Revision (Requested by QA)',
    'Reconciliation Revision (Requested by QA)',
];

export const INBOUND_TASKS: Partial<Record<BoardStage, string[]>> = {
    KICKOFF_SETUP: ['Send documentation', 'Share checklist'],
    DEV_CONFIG: ['Add attributes in Apigee', 'Send credentials for sandbox'],
    TESTING_VALIDATION: TESTING_VALIDATION_INBOUND,
    QA_REVIEW: ['Final QA Technical Sign-off'],
    PARTNER_REVISION: PARTNER_REVISION_TASKS,
    BLOCKED_WAITING: [],
    PRE_PRODUCTION: ['Fill SOP Confluence Partnership', 'Add production attributes', 'Tabletop session'],
    PRODUCTION_READY: ['Done tabletop, wait for deployment by OSO Team'],
    DEPLOYED: [],
    POST_DEPLOYMENT: ['Send credentials and partner id for production', 'Monitor initial traffic']
};

export const OUTBOUND_TASKS: Partial<Record<BoardStage, string[]>> = {
    KICKOFF_SETUP: ['Add partner to Team Sheets', 'Send documentation', 'Share checklist'],
    DEV_CONFIG: [
        'Add attributes in Apigee',
        'Register partner URL to System (Token, BRIVA Online, Notification)',
        'Send credentials for sandbox',
        'Open Firewall IRIS'
    ],
    TESTING_VALIDATION: TESTING_VALIDATION_OUTBOUND,
    QA_REVIEW: ['Final QA Technical Sign-off'],
    PARTNER_REVISION: PARTNER_REVISION_TASKS,
    BLOCKED_WAITING: [],
    PRE_PRODUCTION: ['Request Ops Open Firewall', 'Fill SOP Confluence Partnership', 'Add production attributes', 'Tabletop session'],
    PRODUCTION_READY: ['Done tabletop, wait for deployment by OSO Team'],
    DEPLOYED: [],
    POST_DEPLOYMENT: ['Send credentials and partner id for production', 'Monitor initial traffic']
};

export const getTasksForStage = (stage: BoardStage, type: IntegrationType): string[] => {
    if (stage === 'INITIATION') return GLOBAL_INITIATION_TASKS;
    if (type === 'INBOUND') return INBOUND_TASKS[stage] || [];
    if (type === 'OUTBOUND' || type === 'HYBRID') return OUTBOUND_TASKS[stage] || [];
    return [];
};

// Parses the task key prefix, returns group label and display label.
export function parseTaskGroup(task: string): { group: string; label: string } {
    const match = task.match(/^\[(\w+)\]\s+(.+)$/);
    if (!match) return { group: '', label: task };
    const prefix = match[1];
    const label = match[2];
    const groupMap: Record<string, string> = {
        Test: 'Testing Phase',
        Gate: 'Partner Submission Gate',
        Check: 'Integrator Sanity Check',
    };
    return { group: groupMap[prefix] || prefix, label };
}
