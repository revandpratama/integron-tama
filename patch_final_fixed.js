const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, 'app/kanban/page.tsx');
let content = fs.readFileSync(pageFile, 'utf-8');

// Replace standard strings
content = content.replace(/Integration Board/g, '{t.boardTitle}');
content = content.replace(/Track partner onboarding through a 12-stage lifecycle\./g, '{t.boardSub}');
content = content.replace(/Filter by Integrator/g, '{t.filter}');
content = content.replace(/'All'/g, 't.all');
content = content.replace(/Failed to load board/g, '{t.failedLoad}');
content = content.replace(/'Failed to update board completely'/g, 't.failedUpdate');

content = content.replace(/<WarningAmberIcon \/>\s*Incomplete Tasks Detected/g, '<WarningAmberIcon />\n                    {t.incompleteTasks}');
content = content.replace(/You are moving this card to <strong>\{COLUMNS\.find(.*?)\}\?.title\}<\/strong>/g, '{t.movingPre} <strong>{getColumns(lang).find$1}?.title}</strong>');
content = content.replace(/, but there are uncompleted tasks in its current stage\. Do you want to proceed\?/g, '{t.movingPost}');

content = content.replace(/Cancel Move/g, '{t.cancelMove}');
content = content.replace(/Force Move/g, '{t.forceMove}');

content = content.replace(/14-day partner revision window from last update/g, '{t.slaWindow}');
content = content.replace(/No revisions flagged — partner is good to go ✓/g, '{t.goodToGo}');
content = content.replace(/Stage Checklist:/g, '{t.stageChecklist}');
content = content.replace(/No tasks for this stage\./g, '{t.noTasks}');
content = content.replace(/Features Used/g, '{t.featuresUsed}');
content = content.replace(/No features mapped/g, '{t.noFeatures}');
content = content.replace(/>Notes</g, '>{t.notes}<');
content = content.replace(/>Traffic Light</g, '>{t.trafficLight}<');
content = content.replace(/>Update Status</g, '>{t.updateStatus}<');
content = content.replace(/>Healthy</g, '>{t.healthy}<');
content = content.replace(/>Degraded</g, '>{t.degraded}<');
content = content.replace(/>Critical</g, '>{t.critical}<');
content = content.replace(/Add incident or status comment\.\.\./g, '{t.addComment}');
content = content.replace(/>Post Update</g, '>{t.postUpdate}<');
content = content.replace(/>Incident History</g, '>{t.history}<');
content = content.replace(/No history available\./g, '{t.noHistory}');
content = content.replace(/>Close</g, '>{t.close}<');
content = content.replace(/>SLA:/g, '>{t.slaLeft}:');
content = content.replace(/day\(s\) remaining/g, '{t.daysLeft}');
content = content.replace(/day\(s\)/g, '{t.days}');
content = content.replace(/SLA Overdue by/g, '{t.slaOverdue} ');

content = content.replace(/Drop here/g, '{t.dropHere}');

content = content.replace(/`SLA Overdue \$\{Math\.abs\(slaRemaining\)\}d`/g, '`${t.slaOverdue} ${Math.abs(slaRemaining)}d`');
content = content.replace(/`SLA \$\{slaRemaining\}d left`/g, '`${t.slaLeft} ${slaRemaining}d`');

content = content.replace(/No revisions flagged — good to go/g, '{t.goodToGoCard}');
content = content.replace(/At Risk \(>30d\)/g, '{t.atRisk}');
content = content.replace(/Stale \(2w\)/g, '{t.stale}');
content = content.replace(/>Tasks:</g, '>{t.tasks}<');
content = content.replace(/>Unassigned</g, '>{t.unassigned}<');

// Modify array iterations
content = content.replace(/COLUMNS\.forEach/g, 'getColumns(lang).forEach');
content = content.replace(/COLUMNS\.some/g, 'getColumns(lang).some');
content = content.replace(/COLUMNS\.map/g, 'getColumns(lang).map');
content = content.replace(/COLUMNS\.find/g, 'getColumns(lang).find');


content = content.replace(
    /export default function KanbanPage\(\) \{/,
    `export default function KanbanPage() {
    const [pageLang, setPageLang] = useState<'en' | 'id'>('en');
    return (
        <LangContext.Provider value={pageLang}>
            <KanbanContent lang={pageLang} setLang={setPageLang} />
        </LangContext.Provider>
    );
}

function KanbanContent({ lang, setLang }: { lang: 'en' | 'id', setLang: (l: 'en' | 'id') => void }) {
    const t = DICT[lang];`
);

content = content.replace(
    /\/\/ ─── Detail Dialog/,
    `} // End of KanbanContent\n\n// ─── Detail Dialog`
);

content = content.replace(
    /function PartnerDetailDialog\(.*?\{([\s\S]*?)const stage = partner\.boardStage/m,
    (match) => match.replace("const stage = partner", "const lang = useContext(LangContext);\n    const t = DICT[lang];\n    const stage = partner")
);

content = content.replace(
    /function KanbanColumn\(\{[\s\S]*?\}\) \{/,
    `function KanbanColumn({ col, partners, onCardClick, toggleTask, onUpdatePartner }: {
    col: any;
    partners: Partner[];
    onCardClick: (p: Partner) => void;
    toggleTask: any;
    onUpdatePartner: any;
}) {
    const lang = useContext(LangContext);
    const t = DICT[lang];`
);

content = content.replace(
    /function KanbanCard\(\{[\s\S]*?\}\) \{/,
    `function KanbanCard({ partner, isOverlay, onClick, toggleTask, onUpdatePartner }: {
    partner: Partner;
    isOverlay?: boolean;
    onClick?: () => void;
    toggleTask?: any;
    onUpdatePartner?: any;
}) {
    const lang = useContext(LangContext);
    const t = DICT[lang];`
);

content = content.replace(
    /<Box sx=\{\{ display: 'flex', alignItems: 'center', gap: 2 \}\}>/,
    `<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ToggleButtonGroup
                        size="small"
                        color="primary"
                        value={lang}
                        exclusive
                        onChange={(e, val) => { if(val) setLang(val) }}
                        sx={{ bgcolor: 'background.paper', mr: 2, height: 40 }}
                    >
                        <ToggleButton value="en" sx={{ fontSize: 13, py: 0.5, px: 2 }}>EN</ToggleButton>
                        <ToggleButton value="id" sx={{ fontSize: 13, py: 0.5, px: 2 }}>ID</ToggleButton>
                    </ToggleButtonGroup>`
);

content = content.replace(
    /import \{ useState, useMemo, useEffect \} from 'react';/,
    "import { useState, useMemo, useEffect, createContext, useContext } from 'react';"
);

content = content.replace(
    /import \{[^}]+useDroppable\n\} from '@dnd-kit\/core';/,
    "import {\n    Box, Typography, Paper, Chip, Avatar, Alert,\n    Button, TextField, Dialog, DialogTitle, DialogContent,\n    DialogActions, Snackbar, Skeleton, Checkbox,\n    Select, MenuItem, FormControl, InputLabel, Divider, Tooltip,\n    ToggleButton, ToggleButtonGroup\n} from '@mui/material';\nimport {\n    DndContext, DragOverlay, closestCorners, closestCenter, KeyboardSensor,\n    PointerSensor, useSensor, useSensors, DragStartEvent,\n    DragEndEvent, useDroppable\n} from '@dnd-kit/core';"
);


const contextStr = `
export const LangContext = createContext<'en' | 'id'>('en');

export const DICT = {
    en: {
        boardTitle: 'Integration Board',
        boardSub: 'Track partner onboarding through a 12-stage lifecycle.',
        filter: 'Filter by Integrator',
        all: 'All',
        dropHere: 'Drop here',
        unassigned: 'Unassigned',
        tasks: 'Tasks:',
        noTasks: 'No tasks for this stage.',
        stageChecklist: 'Stage Checklist:',
        featuresUsed: 'Features Used',
        noFeatures: 'No features mapped',
        notes: 'Notes',
        trafficLight: 'Traffic Light',
        updateStatus: 'Update Status',
        healthy: 'Healthy',
        degraded: 'Degraded',
        critical: 'Critical',
        postUpdate: 'Post Update',
        history: 'Incident History',
        noHistory: 'No history available.',
        failedLoad: 'Failed to load board',
        failedUpdate: 'Failed to update board completely',
        addComment: 'Add incident or status comment...',
        slaOverdue: 'SLA Overdue',
        slaLeft: 'SLA',
        slaWindow: '14-day partner revision window from last update',
        goodToGo: 'No revisions flagged — partner is good to go ✓',
        goodToGoCard: 'No revisions flagged — good to go',
        atRisk: 'At Risk (>30d)',
        stale: 'Stale (2w)',
        daysLeft: 'day(s) remaining',
        days: 'day(s)',
        incompleteTasks: 'Incomplete Tasks Detected',
        movingPre: 'You are moving this card to',
        movingPost: ', but there are uncompleted tasks in its current stage. Do you want to proceed?',
        cancelMove: 'Cancel Move',
        forceMove: 'Force Move',
        close: 'Close',
        initPhase: 'Initiation Phase',
        initDesc: 'Configure integration type and initial partner setup.',
        kickoffSetup: 'Kickoff & Setup',
        kickoffDesc: 'Kickoff meeting and documentation sharing with partner.',
        devConfig: 'Development / Config',
        devDesc: 'Partner integrates their system using sandbox credentials.',
        testVal: 'Testing & Validation',
        testDesc: 'Partner runs tests (SIT, E2E) and submits results. Integrator validates submissions before escalating to QA.',
        qaReview: 'QA Review (Formal)',
        qaDesc: 'Formal QA department sign-off before pre-production.',
        partnerRev: 'Partner Revision',
        partnerRevDesc: 'Repair shop: tracks exactly what the partner needs to fix. SLA: 14 days.',
        blocked: 'Blocked / Waiting',
        blockedDesc: 'Waiting for partner action or external dependencies.',
        preProd: 'Pre-Production',
        preProdDesc: 'Tabletop sessions and production attribute setup.',
        prodReady: 'Production Ready',
        prodReadyDesc: 'Awaiting deployment by OSO Team.',
        deployed: 'Deployed',
        deployedDesc: 'Partner is live. Status is automatically updated to LIVE.',
        postDeploy: 'Post-Deployment',
        postDeployDesc: 'ASPI compliance, incident monitoring, and initial traffic checks.',
        done: 'Done',
        doneDesc: 'Completed active management. Shows cards updated within last 30 days (max 20).'
    },
    id: {
        boardTitle: 'Papan Integrasi',
        boardSub: 'Lacak proses onboarding mitra melalui 12 tahap siklus hidup.',
        filter: 'Filter berdasarkan Integrator',
        all: 'Semua',
        dropHere: 'Letakkan di sini',
        unassigned: 'Belum ditugaskan',
        tasks: 'Tugas:',
        noTasks: 'Tidak ada tugas untuk tahap ini.',
        stageChecklist: 'Daftar Periksa Tahap:',
        featuresUsed: 'Fitur yang Digunakan',
        noFeatures: 'Tidak ada fitur yang dipetakan',
        notes: 'Catatan',
        trafficLight: 'Prioritas (Lampu Lalu Lintas)',
        updateStatus: 'Perbarui Status',
        healthy: 'Sehat',
        degraded: 'Menurun',
        critical: 'Kritis',
        postUpdate: 'Kirim Pembaruan',
        history: 'Riwayat Insiden',
        noHistory: 'Tidak ada riwayat yang tersedia.',
        failedLoad: 'Gagal memuat papan',
        failedUpdate: 'Gagal memperbarui papan sepenuhnya',
        addComment: 'Tambahkan komentar insiden atau status...',
        slaOverdue: 'SLA Terlewat',
        slaLeft: 'SLA tersisa',
        slaWindow: 'Jendela revisi mitra 14 hari sejak pembaruan terakhir',
        goodToGo: 'Tidak ada revisi yang ditandai — mitra siap lanjut ✓',
        goodToGoCard: 'Tidak ada revisi — siap lanjut',
        atRisk: 'Beresiko (>30h)',
        stale: 'Usang (2m)',
        daysLeft: 'hari tersisa',
        days: 'hari',
        incompleteTasks: 'Tugas Belum Selesai Terdeteksi',
        movingPre: 'Anda memindahkan kartu ini ke',
        movingPost: ', tetapi ada tugas yang belum selesai pada tahap saat ini. Lanjutkan?',
        cancelMove: 'Batal Pindah',
        forceMove: 'Paksa Pindah',
        close: 'Tutup',
        initPhase: 'Fase Inisiasi',
        initDesc: 'Konfigurasi jenis integrasi dan pengaturan awal mitra.',
        kickoffSetup: 'Kickoff & Persiapan',
        kickoffDesc: 'Rapat kickoff dan berbagi dokumentasi dengan mitra.',
        devConfig: 'Pengembangan / Konfigurasi',
        devDesc: 'Mitra mengintegrasikan sistem mereka menggunakan kredensial sandbox.',
        testVal: 'Pengujian & Validasi',
        testDesc: 'Mitra menjalankan pengujian (SIT, E2E) dan mengirimkan hasil. Tervalidasi sebelum masuk QA.',
        qaReview: 'Tinjauan QA (Formal)',
        qaDesc: 'Persetujuan resmi departemen QA sebelum pra-produksi.',
        partnerRev: 'Revisi Mitra',
        partnerRevDesc: 'Melacak perbaikan yang perlu dilakukan mitra. SLA: 14 hari.',
        blocked: 'Diblokir / Menunggu',
        blockedDesc: 'Menunggu tindakan mitra atau dependensi eksternal.',
        preProd: 'Pra-Produksi',
        preProdDesc: 'Sesi tabletop dan pengaturan atribut produksi.',
        prodReady: 'Siap Produksi',
        prodReadyDesc: 'Menunggu penyebaran oleh Tim OSO.',
        deployed: 'Disebarkan',
        deployedDesc: 'Mitra sudah live. Status secara otomatis diperbarui ke LIVE.',
        postDeploy: 'Pasca-Penyebaran',
        postDeployDesc: 'Kepatuhan ASPI, pemantauan insiden, dan pemeriksaan lalu lintas awal.',
        done: 'Selesai',
        doneDesc: 'Manajemen aktif selesai. Menampilkan kartu yang diperbarui (maks 20).'
    }
};

export const getColumns = (lang: 'en' | 'id') => {
    const t = DICT[lang];
    return [
        { id: 'INITIATION', title: t.initPhase, color: '#64748b', bg: '#f1f5f9', description: t.initDesc },
        { id: 'KICKOFF_SETUP', title: t.kickoffSetup, color: '#3b82f6', bg: '#dbeafe', description: t.kickoffDesc },
        { id: 'DEV_CONFIG', title: t.devConfig, color: '#8b5cf6', bg: '#ede9fe', description: t.devDesc },
        { id: 'TESTING_VALIDATION', title: t.testVal, color: '#f59e0b', bg: '#fef3c7', description: t.testDesc },
        { id: 'QA_REVIEW', title: t.qaReview, color: '#a855f7', bg: '#f3e8ff', description: t.qaDesc },
        { id: 'PARTNER_REVISION', title: t.partnerRev, color: '#ec4899', bg: '#fce7f3', description: t.partnerRevDesc },
        { id: 'BLOCKED_WAITING', title: t.blocked, color: '#ef4444', bg: '#fee2e2', description: t.blockedDesc },
        { id: 'PRE_PRODUCTION', title: t.preProd, color: '#14b8a6', bg: '#ccfbf1', description: t.preProdDesc },
        { id: 'PRODUCTION_READY', title: t.prodReady, color: '#10b981', bg: '#d1fae5', description: t.prodReadyDesc },
        { id: 'DEPLOYED', title: t.deployed, color: '#22c55e', bg: '#dcfce7', description: t.deployedDesc },
        { id: 'POST_DEPLOYMENT', title: t.postDeploy, color: '#0ea5e9', bg: '#e0f2fe', description: t.postDeployDesc },
        { id: 'DONE', title: t.done, color: '#0f172a', bg: '#e2e8f0', description: t.doneDesc },
    ] as { id: BoardStage; title: string; color: string; bg: string; description: string }[];
};
`;

content = content.replace(
    /const COLUMNS:([\s\S]*?)\];/,
    contextStr
);


fs.writeFileSync(pageFile, content);
console.log("Rewrote page.tsx properly!");
