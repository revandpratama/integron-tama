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

const TASK_ID_MAP: Record<string, string> = {
    'Email Technical Documentation to Partner': 'Kirim Dokumentasi Teknis via Email ke Partner',
    'Provide Checklist': 'Berikan Checklist',
    'SIT API Testing': 'SIT API Testing',
    'SIT Document Received': 'Dokumen SIT Diterima',
    'Devsite Document Received': 'Dokumen Devsite Diterima',
    'Reconciliation Document Received': 'Dokumen Reconciliation Diterima',
    'SIT Logs / Connectivity Validated': 'Log SIT / Connectivity Tervalidasi',
    'Devsite Results Validated': 'Hasil Devsite Tervalidasi',
    'Reconciliation Format Validated (BRI Standard)': 'Format Reconciliation Tervalidasi (Standar BRI)',
    'E2E Testing (Outbound / Webhook)': 'E2E Testing (Outbound / Webhook)',
    'SIT Revision (Requested by Integrator)': 'Revisi SIT (Diminta oleh Integrator)',
    'Devsite Revision (Requested by Integrator)': 'Revisi Devsite (Diminta oleh Integrator)',
    'Reconciliation Revision (Requested by Integrator)': 'Revisi Reconciliation (Diminta oleh Integrator)',
    'SIT Revision (Requested by QA)': 'Revisi SIT (Diminta oleh QA)',
    'Devsite Revision (Requested by QA)': 'Revisi Devsite (Diminta oleh QA)',
    'Reconciliation Revision (Requested by QA)': 'Revisi Reconciliation (Diminta oleh QA)',
    'Send documentation': 'Kirim dokumentasi',
    'Share checklist': 'Bagikan checklist',
    'Add attributes in Apigee': 'Tambah atribut di Apigee',
    'Send credentials for sandbox': 'Kirim kredensial untuk sandbox',
    'Final QA Technical Sign-off': 'Final QA Technical Sign-off',
    'Fill SOP Confluence Partnership': 'Isi SOP Confluence Partnership',
    'Add production attributes': 'Tambah atribut produksi',
    'Tabletop session': 'Sesi Tabletop',
    'Done tabletop, wait for deployment by OSO Team': 'Selesai tabletop, tunggu deployment oleh Tim OSO',
    'Send credentials and partner id for production': 'Kirim kredensial dan partner id untuk produksi',
    'Monitor initial traffic': 'Monitor traffic awal',
    'Add partner to Team Sheets': 'Tambah partner ke Team Sheets',
    'Register partner URL to System (Token, BRIVA Online, Notification)': 'Daftarkan partner URL ke Sistem (Token, BRIVA Online, Notification)',
    'Open Firewall IRIS': 'Buka Firewall IRIS',
    'Request Ops Open Firewall': 'Request Ops Buka Firewall'
};

// Parses the task key prefix, returns group label and display label.
export function parseTaskGroup(task: string, lang: 'en' | 'id' = 'en'): { group: string; label: string } {
    const match = task.match(/^\[(\w+)\]\s+(.+)$/);
    const rawLabel = match ? match[2] : task;
    const prefix = match ? match[1] : '';

    const displayLabel = lang === 'id' ? (TASK_ID_MAP[rawLabel] || rawLabel) : rawLabel;

    if (!prefix) return { group: '', label: displayLabel };

    const groupMap: Record<string, Record<string, string>> = {
        en: {
            Test: 'Testing Phase',
            Gate: 'Partner Submission Gate',
            Check: 'Integrator Sanity Check',
        },
        id: {
            Test: 'Phase Testing',
            Gate: 'Gate Pengiriman Partner',
            Check: 'Sanity Check Integrator',
        }
    };

    return { group: groupMap[lang][prefix] || prefix, label: displayLabel };
}
