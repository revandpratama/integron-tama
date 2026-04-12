'use client';

import { useState, useMemo, useEffect, createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box, Typography, Paper, Chip, Avatar, Alert,
    Button, TextField, Dialog, DialogTitle, DialogContent,
    DialogActions, Snackbar, Skeleton, Checkbox,
    Select, MenuItem, FormControl, InputLabel, Divider, Tooltip, ToggleButtonGroup, ToggleButton, useTheme
} from '@mui/material';
import {
    DndContext, DragOverlay, closestCorners, closestCenter, KeyboardSensor,
    PointerSensor, useSensor, useSensors, DragStartEvent,
    DragEndEvent, useDroppable
} from '@dnd-kit/core';
import { useColorMode } from '../providers/ThemeProvider';
import { alpha } from '@mui/material';
import {
    SortableContext, sortableKeyboardCoordinates,
    verticalListSortingStrategy, useSortable, arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import axios from 'axios';
import { format, differenceInDays } from 'date-fns';
import { Partner, BoardStage, IntegrationType, TrafficLight } from '../partners/types';
import { getTasksForStage, parseTaskGroup } from './constants';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CircleIcon from '@mui/icons-material/Circle';
import NotesIcon from '@mui/icons-material/Notes';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';


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

export const getColumnsBase = (lang: 'en' | 'id') => {
    const t = DICT[lang];
    return [
        { id: 'INITIATION', title: t.initPhase, color: '#64748b', description: t.initDesc },
        { id: 'KICKOFF_SETUP', title: t.kickoffSetup, color: '#3b82f6', description: t.kickoffDesc },
        { id: 'DEV_CONFIG', title: t.devConfig, color: '#8b5cf6', description: t.devDesc },
        { id: 'TESTING_VALIDATION', title: t.testVal, color: '#f59e0b', description: t.testDesc },
        { id: 'QA_REVIEW', title: t.qaReview, color: '#a855f7', description: t.qaDesc },
        { id: 'PARTNER_REVISION', title: t.partnerRev, color: '#ec4899', description: t.partnerRevDesc },
        { id: 'BLOCKED_WAITING', title: t.blocked, color: '#ef4444', description: t.blockedDesc },
        { id: 'PRE_PRODUCTION', title: t.preProd, color: '#14b8a6', description: t.preProdDesc },
        { id: 'PRODUCTION_READY', title: t.prodReady, color: '#10b981', description: t.prodReadyDesc },
        { id: 'DEPLOYED', title: t.deployed, color: '#22c55e', description: t.deployedDesc },
        { id: 'POST_DEPLOYMENT', title: t.postDeploy, color: '#0ea5e9', description: t.postDeployDesc },
        { id: 'DONE', title: t.done, color: '#0f172a', description: t.doneDesc },
    ] as { id: BoardStage; title: string; color: string; bg: string; description: string }[];
};


const TrafficColors: Record<string, string> = {
    HEALTHY: '#22c55e',
    DEGRADED: '#f59e0b',
    CRITICAL: '#ef4444'
};

export default function KanbanPage() {
    const [pageLang, setPageLang] = useState<'en' | 'id'>('en');

    useEffect(() => {
        const saved = localStorage.getItem('kanban_lang') as 'en' | 'id';
        if (saved && (saved === 'en' || saved === 'id')) {
            setPageLang(saved);
        }
    }, []);

    const handleSetLang = (l: 'en' | 'id') => {
        setPageLang(l);
        localStorage.setItem('kanban_lang', l);
    };

    return (
        <LangContext.Provider value={pageLang}>
            <KanbanContent lang={pageLang} setLang={handleSetLang} />
        </LangContext.Provider>
    );
}

function KanbanContent({ lang, setLang }: { lang: 'en' | 'id', setLang: (l: 'en' | 'id') => void }) {
    const t = DICT[lang];
    const { mode } = useColorMode();
    const COLUMNS = useMemo(() => getColumnsBase(lang).map(col => ({ ...col, bg: mode === 'light' ? alpha(col.color, 0.1) : alpha(col.color, 0.3) })), [lang, mode]);
    const queryClient = useQueryClient();
    const [activeId, setActiveId] = useState<string | null>(null);
    const [detailDialog, setDetailDialog] = useState<Partner | null>(null);
    const [toast, setToast] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
    const [trafficCommentEntry, setTrafficCommentEntry] = useState('');
    const [filterIntegrator, setFilterIntegrator] = useState<string>(t.all);
    const [defaultSet, setDefaultSet] = useState(false);
    const [localPartners, setLocalPartners] = useState<Partner[]>([]);

    // Persist filter
    useEffect(() => {
        const saved = localStorage.getItem('kanban_filter');
        if (saved) {
            // If saved is the "All" equivalent in either language, use current t.all
            if (saved === 'All' || saved === 'Semua') {
                setFilterIntegrator(t.all);
            } else {
                setFilterIntegrator(saved);
            }
            setDefaultSet(true); // Don't auto-filter if we have a saved preference
        }
    }, [t.all]);

    useEffect(() => {
        if (filterIntegrator) {
            localStorage.setItem('kanban_filter', filterIntegrator);
        }
    }, [filterIntegrator]);

    const [confirmMoveDialog, setConfirmMoveDialog] = useState<{ activeId: string, overId: string, targetStage: BoardStage, originalStage: BoardStage, missingTasks: string[] } | null>(null);

    const { data: session } = useQuery({
        queryKey: ['session'],
        queryFn: async () => {
            const res = await axios.get('/api/auth/me');
            return res.data;
        }
    });

    const { data: partners, isLoading, error } = useQuery<Partner[]>({
        queryKey: ['partners', 'kanban'],
        queryFn: async () => {
            const res = await axios.get('/api/partners?activeKanban=true');
            return res.data;
        },
        staleTime: 5000, // Slightly longer stale time for manual control
        refetchOnMount: true,
    });

    // Sync local state with server data
    useEffect(() => {
        if (partners) {
            setLocalPartners(partners);
        }
    }, [partners]);

    const updatePartnerMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Partner> }) => {
            const res = await axios.put(`/api/partners/${id}`, data);
            return res.data;
        },
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: ['partners', 'kanban'] });
            const previousPartners = queryClient.getQueryData<Partner[]>(['partners', 'kanban']);
            if (previousPartners) {
                queryClient.setQueryData<Partner[]>(['partners', 'kanban'], (old) => {
                    if (!old) return [];
                    return old.map(p => p.id === id ? { ...p, ...data } : p);
                });
            }
            // Update local state too to keep it in sync
            setLocalPartners(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
            return { previousPartners };
        },
        onError: (err: any, _, context) => {
            if (context?.previousPartners) {
                queryClient.setQueryData(['partners', 'kanban'], context.previousPartners);
            }
            const msg = err.response?.data?.error || err.message;
            setToast({ open: true, message: msg, severity: 'error' });
        },
        onSettled: (data) => {
            queryClient.invalidateQueries({ queryKey: ['partners', 'kanban'] });
            if (data && detailDialog?.id === data.id) {
                setDetailDialog(data);
            }
        },
    });

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const columns = useMemo(() => {
        const cols: Record<string, Partner[]> = {};
        COLUMNS.forEach(col => cols[col.id] = []);
        localPartners.forEach(p => {
            // Apply integrator filter
            const isAll = filterIntegrator === t.all || filterIntegrator === 'All' || filterIntegrator === 'Semua';
            if (!isAll && p.integrator?.name !== filterIntegrator) {
                return;
            }
            
            const stage = p.boardStage || 'INITIATION';
            if (cols[stage]) cols[stage].push(p);
        });
        return cols;
    }, [localPartners, filterIntegrator]);

    const integratorOptions = useMemo(() => {
        if (!partners) return [t.all];
        const names = partners
            .map(p => p.integrator?.name)
            .filter((n): n is string => Boolean(n));
        return [t.all, ...Array.from(new Set(names))];
    }, [partners]);

    // Handle initial default filter (Current User)
    useMemo(() => {
        if (partners && session?.user?.name && !defaultSet) {
            const userName = session.user.name;
            const hasMatches = partners.some(p => p.integrator?.name === userName);
            if (hasMatches) {
                setFilterIntegrator(userName);
            }
            setDefaultSet(true);
        }
    }, [partners, session, defaultSet]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: any) => {
        const { active, over } = event;
        if (!over) return;
        
        const activeIdStr = active.id as string;
        const overIdStr = over.id as string;

        if (activeIdStr === overIdStr) return;

        const activePartner = localPartners.find(p => p.id === activeIdStr);
        if (!activePartner) return;
        const activeStage = activePartner.boardStage || 'INITIATION';
        let overPartner = localPartners.find(p => p.id === overIdStr);
        let targetStage: BoardStage;

        if (COLUMNS.some(c => c.id === overIdStr)) {
            targetStage = overIdStr as BoardStage;
        } else if (overPartner) {
            targetStage = overPartner.boardStage || 'INITIATION';
        } else {
            return;
        }

        if (activeStage !== targetStage) {
            // Instant cross-column swap in local state
            setLocalPartners(prev => {
                const activeCard = prev.find(p => p.id === activeIdStr);
                if (!activeCard) return prev;
                const filtered = prev.filter(p => p.id !== activeIdStr);
                // Placing it at the start of the array ensures it appears at the top of the column 
                // when the 'columns' memo rebuilds the stage lists.
                return [{ ...activeCard, boardStage: targetStage }, ...filtered];
            });
        } else if (overPartner) {
            // Instant vertical swap in local state
            setLocalPartners(prev => {
                const stageCards = prev.filter(p => (p.boardStage || 'INITIATION') === activeStage);
                const oldIndex = stageCards.findIndex(p => p.id === activeIdStr);
                const newIndex = stageCards.findIndex(p => p.id === overIdStr);
                
                if (oldIndex !== newIndex) {
                    const moved = arrayMove(stageCards, oldIndex, newIndex);
                    // Re-merge with other stages
                    const otherCards = prev.filter(p => (p.boardStage || 'INITIATION') !== activeStage);
                    
                    // We need to update indices correctly for the moved group
                    const indexedMoved = moved.map((p, idx) => ({ ...p, kanbanOrder: idx }));
                    return [...otherCards, ...indexedMoved];
                }
                return prev;
            });
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) { 
            setActiveId(null); 
            if (partners) setLocalPartners(partners); // roll back visually
            return; 
        }

        const activeIdStr = active.id as string;
        const overIdStr = over.id as string;

        // CRITICAL BUG FIX: Do NOT return early if activeIdStr === overIdStr.
        // Due to optimistic rendering in handleDragOver, the cursor will intersect with the new position of the dragged item itself, causing it to return early and swallow the update!
        
        const originalPartner = partners?.find(p => p.id === activeIdStr);
        if (!originalPartner) {
            setActiveId(null);
            if (partners) setLocalPartners(partners);
            return;
        }
        const originalStage = originalPartner.boardStage || 'INITIATION';

        let targetStage: BoardStage;

        const overPartner = localPartners.find(p => p.id === overIdStr);
        if (COLUMNS.some(c => c.id === overIdStr)) {
            targetStage = overIdStr as BoardStage;
        } else if (overPartner) {
            targetStage = (overPartner.boardStage || 'INITIATION') as BoardStage;
        } else {
            setActiveId(null);
            if (partners) setLocalPartners(partners);
            return;
        }

        // Logic to check incomplete tasks if moving to a new stage
        if (originalStage !== targetStage) {
            const taskList = getTasksForStage(originalStage, originalPartner.integrationType || 'INBOUND');
            const stageTasks = originalPartner.boardTasks?.[originalStage] || {};
            const missingTasks = taskList.filter(task => !stageTasks[task]);
            
            if (missingTasks.length > 0) {
                setConfirmMoveDialog({
                    activeId: activeIdStr,
                    overId: overIdStr,
                    targetStage,
                    originalStage,
                    missingTasks
                });
                setActiveId(null);
                return;
            }
        }

        processMove(activeIdStr, overIdStr, targetStage, originalStage);
        setActiveId(null);
    };

    const processMove = async (activeIdStr: string, overIdStr: string, targetStage: BoardStage, originalStage: BoardStage) => {
        // Re-calculate the local ordering thoroughly first.
        // columns dictionary here reflects the state right after dragging, but might be unordered purely.
        let targetIndex: number;
        
        // We construct the visual array of the target stage
        let stagePartners: Partner[] = [];
        if (originalStage === targetStage) {
            stagePartners = localPartners.filter(p => (p.boardStage || 'INITIATION') === targetStage);
        } else {
            // For cross-column, localPartners only updated boardStage, order is basically just pushed at the end sequentially.
            // Let's accurately build the target column without the active card first
            const existingPartners = localPartners.filter(p => (p.boardStage || 'INITIATION') === targetStage && p.id !== activeIdStr);
            const activeCard = localPartners.find(p => p.id === activeIdStr)!;
            
            if (COLUMNS.some(c => c.id === overIdStr)) {
                targetIndex = 0; // Default to top of column
            } else {
                targetIndex = existingPartners.findIndex(p => p.id === overIdStr);
                if (targetIndex === -1) targetIndex = 0;
            }
            // Insert it
            existingPartners.splice(targetIndex, 0, activeCard);
            stagePartners = existingPartners;
        }

        // Update optimistic UI state so it stays solid while requests load
        setLocalPartners(prev => {
            const others = prev.filter(p => (p.boardStage || 'INITIATION') !== targetStage);
            const newTarget = stagePartners.map((p, idx) => ({ ...p, kanbanOrder: idx, boardStage: targetStage }));
            return [...others, ...newTarget];
        });

        // Fire background API calls manully to avoid React-Query race condition loops
        const updates: Promise<any>[] = [];
        if (originalStage === targetStage) {
            stagePartners.forEach((p, idx) => {
                const orig = partners?.find(x => x.id === p.id);
                if (!orig || orig.kanbanOrder !== idx) {
                    updates.push(axios.put(`/api/partners/${p.id}`, { kanbanOrder: idx }));
                }
            });
        } else {
            updates.push(axios.put(`/api/partners/${activeIdStr}`, { boardStage: targetStage, kanbanOrder: stagePartners.findIndex(p => p.id === activeIdStr) }));
            stagePartners.forEach((p, idx) => {
                if (p.id !== activeIdStr) {
                    const orig = partners?.find(x => x.id === p.id);
                    if (!orig || orig.kanbanOrder !== idx) {
                        updates.push(axios.put(`/api/partners/${p.id}`, { kanbanOrder: idx }));
                    }
                }
            });
        }

        try {
            if (updates.length > 0) {
                await Promise.all(updates);
            }
        } catch (e) {
            setToast({ open: true, message: t.failedUpdate, severity: 'error' });
            if (partners) setLocalPartners(partners); // roll back
        } finally {
            queryClient.invalidateQueries({ queryKey: ['partners', 'kanban'] });
        }
    };

    const toggleTask = (partnerId: string, stage: string, task: string, checked: boolean) => {
        const p = partners?.find(x => x.id === partnerId);
        if (!p) return;
        const tasks = p.boardTasks || {};
        const stageTasks = tasks[stage] || {};
        const newTasks = { ...tasks, [stage]: { ...stageTasks, [task]: checked } };
        updatePartnerMutation.mutate({ id: partnerId, data: { boardTasks: newTasks } });
    };

    const addTrafficComment = (partnerId: string, status: string, comment: string) => {
        if (!comment.trim()) return;
        const p = partners?.find(x => x.id === partnerId) || detailDialog;
        if (!p) return;
        const history = p.trafficComments || [];
        const newComment = { status, comment, timestamp: new Date().toISOString() };
        updatePartnerMutation.mutate({ id: partnerId, data: { trafficLight: status as TrafficLight, trafficComments: [...history, newComment] } });
        setTrafficCommentEntry('');
    };

    if (isLoading) {
        return (
            <Box sx={{ p: 4, height: '100%', overflowX: 'auto', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" fontWeight={800} sx={{ color: 'text.primary' }}>{t.boardTitle}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 3, flex: 1, minWidth: 1000 }}>
                    {[1, 2, 3, 4, 5].map(idx => (
                        <Box key={idx} sx={{ flex: 1, minWidth: 300 }}>
                            <Skeleton variant="rounded" height={60} sx={{ mb: 2, borderRadius: 3 }} />
                        </Box>
                    ))}
                </Box>
            </Box>
        );
    }
    if (error) return <Box sx={{ p: 4 }}><Alert severity="error">{t.failedLoad}</Alert></Box>;

    return (
        <Box sx={{ 
            p: 4, 
            height: '100%', 
            overflow: 'auto', 
            display: 'flex', 
            flexDirection: 'column',
            '&::-webkit-scrollbar': {
                width: '14px',
                height: '14px',
            },
            '&::-webkit-scrollbar-track': {
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                margin: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#cbd5e1',
                borderRadius: '8px',
                border: '3px solid #f1f5f9',
            },
            '&::-webkit-scrollbar-thumb:hover': {
                backgroundColor: '#94a3b8',
            },
            scrollbarWidth: 'auto',
            scrollbarColor: '#cbd5e1 #f1f5f9',
        }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <Box>
                    <Typography variant="h4" fontWeight={800} sx={{ color: 'text.primary' }}>{t.boardTitle}</Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary' }}>{t.boardSub}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                    </ToggleButtonGroup>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel id="integrator-filter-label">{t.filter}</InputLabel>
                        <Select
                            labelId="integrator-filter-label"
                            value={filterIntegrator}
                            label="{t.filter}"
                            onChange={(e) => setFilterIntegrator(e.target.value)}
                            sx={{ borderRadius: 2, bgcolor: 'background.paper' }}
                        >
                            {integratorOptions.map(name => (
                                <MenuItem key={name} value={name} sx={{ fontSize: 13 }}>
                                    {name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </Box>

            <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragStart={handleDragStart} 
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <Box sx={{ display: 'flex', gap: 3, flex: 1, minWidth: 1000, pb: 4 }}>
                    {COLUMNS.map(col => (
                        <KanbanColumn
                            key={col.id}
                            col={col}
                            partners={columns[col.id] || []}
                            onCardClick={(p) => setDetailDialog(p)}
                            toggleTask={toggleTask}
                            onUpdatePartner={(id: string, data: Partial<Partner>) => updatePartnerMutation.mutate({ id, data })}
                        />
                    ))}
                </Box>
                <DragOverlay dropAnimation={null}>
                    {activeId ? <KanbanCard partner={partners?.find(p => p.id === activeId)!} isOverlay /> : null}
                </DragOverlay>
            </DndContext>

            {/* Detail Dialog */}
            {detailDialog && (
                <PartnerDetailDialog
                    partner={detailDialog}
                    columns={COLUMNS}
                    onClose={() => setDetailDialog(null)}
                    onToggleTask={toggleTask}
                    onUpdate={(data) => updatePartnerMutation.mutate({ id: detailDialog.id, data })}
                    trafficCommentEntry={trafficCommentEntry}
                    setTrafficCommentEntry={setTrafficCommentEntry}
                    addTrafficComment={addTrafficComment}
                />
            )}

            {/* Confirmation Dialog for moving cards with incomplete tasks */}
            <Dialog 
                open={!!confirmMoveDialog} 
                onClose={() => {
                    setConfirmMoveDialog(null);
                    if (partners) setLocalPartners(partners); // roll back visually
                }}
                PaperProps={{ sx: { borderRadius: 3, maxWidth: 500 } }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#b91c1c' }}>
                    <WarningAmberIcon />
                    {t.incompleteTasks}
                </DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body1" sx={{ color: 'text.primary', mb: 2 }}>
                        You are moving this card to <strong>{COLUMNS.find(c => c.id === confirmMoveDialog?.targetStage)?.title}</strong>{t.movingPost}
                    </Typography>
                    <Paper variant="outlined" sx={{ bgcolor: '#fef2f2', borderColor: '#fecaca', maxHeight: 200, overflowY: 'auto' }}>
                        <ul style={{ margin: '8px 0', paddingLeft: 24, fontSize: 14, color: '#991b1b' }}>
                            {confirmMoveDialog?.missingTasks.map(t => (
                                <li key={t}>{t}</li>
                            ))}
                        </ul>
                    </Paper>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button 
                        color="inherit" 
                        onClick={() => {
                            setConfirmMoveDialog(null);
                            if (partners) setLocalPartners(partners); // roll back visually
                        }}
                    >
                        {t.cancelMove}
                    </Button>
                    <Button 
                        variant="contained" 
                        color="error"
                        disableElevation
                        onClick={() => {
                            if (confirmMoveDialog) {
                                processMove(
                                    confirmMoveDialog.activeId, 
                                    confirmMoveDialog.overId, 
                                    confirmMoveDialog.targetStage, 
                                    confirmMoveDialog.originalStage
                                );
                            }
                            setConfirmMoveDialog(null);
                        }}
                    >
                        {t.forceMove}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={toast.open} autoHideDuration={6000} onClose={() => setToast({ ...toast, open: false })}>
                <Alert severity={toast.severity} sx={{ width: '100%' }}>{toast.message}</Alert>
            </Snackbar>
        </Box>
    );
}

// ─── Detail Dialog (extracted for clarity) ───────────────────────────────────

function PartnerDetailDialog({ partner, columns, onClose, onToggleTask, onUpdate, trafficCommentEntry, setTrafficCommentEntry, addTrafficComment }: {
    partner: Partner;
    columns: any[];
    onClose: () => void;
    onToggleTask: (partnerId: string, stage: string, task: string, checked: boolean) => void;
    onUpdate: (data: Partial<Partner>) => void;
    trafficCommentEntry: string;
    setTrafficCommentEntry: (v: string) => void;
    addTrafficComment: (partnerId: string, status: string, comment: string) => void;
}) {
    const lang = useContext(LangContext);
    const t = DICT[lang];
    const theme = useTheme();
    const { mode } = useColorMode();
    const stage = partner.boardStage || 'INITIATION';
    const tasks = getTasksForStage(stage, partner.integrationType || 'INBOUND');
    const stageTasks = partner.boardTasks?.[stage] || {};
    const col = columns.find(c => c.id === stage);

    // For PARTNER_REVISION: compute SLA and "good to go" state
    const isRevision = stage === 'PARTNER_REVISION';
    const checkedRevisions = tasks.filter(t => stageTasks[t]);
    const noRevisionsFlagged = isRevision && checkedRevisions.length === 0;
    const daysSinceUpdate = partner.updatedAt ? differenceInDays(new Date(), new Date(partner.updatedAt)) : 0;
    const slaRemaining = isRevision ? 14 - daysSinceUpdate : null;

    // Group tasks by prefix
    const groupedTasks = useMemo(() => {
        const groups: Record<string, string[]> = {};
        tasks.forEach(task => {
            const { group } = parseTaskGroup(task, lang);
            const g = group || '_default';
            if (!groups[g]) groups[g] = [];
            groups[g].push(task);
        });
        return groups;
    }, [tasks]);

    const hasGroups = Object.keys(groupedTasks).some(k => k !== '_default');

    return (
        <Dialog
            open={true}
            onClose={onClose}
            fullWidth maxWidth="md"
            PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="h5" fontWeight={800} color="#111827">{partner.name}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">#{partner.code}</Typography>
                        {col && <Chip size="small" label={col.title} sx={{ bgcolor: col.bg, color: col.color, fontWeight: 700, fontSize: 10 }} />}
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Chip size="small" label={partner.integrationType} sx={{ bgcolor: 'action.hover', color: '#1d4ed8', fontWeight: 600 }} />
                    <Chip size="small" label={partner.complexity} sx={{ bgcolor: partner.complexity === 'HARD' ? '#fee2e2' : '#f3f4f6', color: partner.complexity === 'HARD' ? '#b91c1c' : '#374151', fontWeight: 600 }} />
                </Box>
            </DialogTitle>

            <DialogContent dividers sx={{ display: 'flex', gap: 4 }}>
                {/* LEFT: Checklists */}
                <Box sx={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>

                    {/* SLA Banner for Partner Revision */}
                    {isRevision && slaRemaining !== null && (
                        <Box sx={{
                            display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2,
                            bgcolor: slaRemaining <= 0 ? '#fef2f2' : slaRemaining <= 3 ? '#fff7ed' : '#f0fdf4',
                            border: `1px solid ${slaRemaining <= 0 ? '#fca5a5' : slaRemaining <= 3 ? '#fed7aa' : '#bbf7d0'}`
                        }}>
                            <TimerOutlinedIcon sx={{ fontSize: 18, color: slaRemaining <= 0 ? '#ef4444' : slaRemaining <= 3 ? '#f97316' : '#16a34a' }} />
                            <Box>
                                <Typography variant="caption" fontWeight={700} sx={{ color: slaRemaining <= 0 ? '#ef4444' : slaRemaining <= 3 ? '#f97316' : '#16a34a', display: 'block' }}>
                                    {slaRemaining <= 0 ? `{t.slaOverdue}  ${Math.abs(slaRemaining)} {t.days}` : `SLA: ${slaRemaining} {t.daysLeft}`}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">{t.slaWindow}</Typography>
                            </Box>
                        </Box>
                    )}

                    {/* "Good to go" banner for Partner Revision with nothing checked */}
                    {isRevision && noRevisionsFlagged && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                            <CheckCircleOutlineIcon sx={{ fontSize: 18, color: '#16a34a' }} />
                            <Typography variant="body2" fontWeight={600} sx={{ color: '#15803d' }}>
                                {t.goodToGo}
                            </Typography>
                        </Box>
                    )}

                    {/* Checklist */}
                    <Box>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: 'text.primary' }}>
                            {t.stageChecklist} {col?.title}
                        </Typography>

                        {tasks.length === 0 ? (
                            <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, bgcolor: '#f9fafb' }}>
                                <Typography variant="body2" color="text.disabled">{t.noTasks}</Typography>
                            </Paper>
                        ) : hasGroups ? (
                            // Grouped rendering
                            Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
                                <Box key={groupName} sx={{ mb: 2 }}>
                                    {groupName !== '_default' && (
                                        <Typography variant="caption" fontWeight={700} sx={{
                                            display: 'block', mb: 1, px: 1.5, py: 0.5,
                                            bgcolor: 'action.hover', borderRadius: 1, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10
                                        }}>
                                            {groupName}
                                        </Typography>
                                    )}
                                    <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5, bgcolor: '#f9fafb' }}>
                                        {groupTasks.map(task => {
                                            const { label } = parseTaskGroup(task, lang);
                                            const isChecked = stageTasks[task] || false;
                                            return (
                                                <Box key={task} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                                    <Checkbox
                                                        size="small"
                                                        checked={isChecked}
                                                        onChange={(e) => onToggleTask(partner.id, stage, task, e.target.checked)}
                                                    />
                                                    <Typography variant="body2" sx={{ color: isChecked ? '#9ca3af' : '#1f2937', textDecoration: isChecked ? 'line-through' : 'none' }}>
                                                        {label}
                                                    </Typography>
                                                </Box>
                                            );
                                        })}
                                    </Paper>
                                </Box>
                            ))
                        ) : (
                            // Flat rendering (PARTNER_REVISION, etc.)
                            <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, bgcolor: '#f9fafb' }}>
                                {tasks.map(task => {
                                    const { label } = parseTaskGroup(task, lang);
                                    const isChecked = stageTasks[task] || false;
                                    return (
                                        <Box key={task} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                            <Checkbox
                                                size="small"
                                                checked={isChecked}
                                                onChange={(e) => onToggleTask(partner.id, stage, task, e.target.checked)}
                                            />
                                            <Typography variant="body2" sx={{ color: isChecked ? '#9ca3af' : '#1f2937', textDecoration: isChecked ? 'line-through' : 'none' }}>
                                                {label}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Paper>
                        )}
                    </Box>

                    {/* Features */}
                    <Box>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: 'text.primary' }}>{t.featuresUsed}</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {(partner.features || []).length > 0 ? (
                                partner.features?.map((f: any) => (
                                    <Chip key={f.id} size="small" label={f.name} sx={{ borderRadius: 1 }} />
                                ))
                            ) : (
                                <Typography variant="body2" color="text.disabled">{t.noFeatures}</Typography>
                            )}
                        </Box>
                    </Box>

                    {/* Notes */}
                    <Box>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: 'text.primary' }}>{t.notes}</Typography>
                        <TextField
                            fullWidth multiline minRows={3}
                            value={partner.notes || ''}
                            onChange={(e) => onUpdate({ notes: e.target.value })}
                            placeholder="Add context or notes here..."
                        />
                    </Box>
                </Box>

                {/* RIGHT: Traffic Light */}
                <Box sx={{ flex: 1, borderLeft: '1px solid #e5e7eb', pl: 3 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, color: 'text.primary' }}>{t.trafficLight}</Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                        <CircleIcon sx={{ fontSize: 16, color: TrafficColors[partner.trafficLight || 'HEALTHY'] }} />
                        <Typography variant="body2" fontWeight={700}>{partner.trafficLight || 'HEALTHY'}</Typography>
                    </Box>

                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>{t.updateStatus}</InputLabel>
                        <Select
                            label="Update Status"
                            value={partner.trafficLight || 'HEALTHY'}
                            onChange={(e) => onUpdate({ trafficLight: e.target.value as TrafficLight })}
                        >
                            <MenuItem value="HEALTHY">{t.healthy}</MenuItem>
                            <MenuItem value="DEGRADED">{t.degraded}</MenuItem>
                            <MenuItem value="CRITICAL">{t.critical}</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth multiline rows={2} size="small"
                        placeholder="{t.addComment}"
                        value={trafficCommentEntry}
                        onChange={(e) => setTrafficCommentEntry(e.target.value)}
                        sx={{ mb: 1 }}
                    />
                    <Button
                        variant="contained" size="small" fullWidth
                        onClick={() => addTrafficComment(partner.id, partner.trafficLight || 'HEALTHY', trafficCommentEntry)}
                        disabled={!trafficCommentEntry.trim()}
                        sx={{ mb: 3, textTransform: 'none', bgcolor: '#0f172a' }}
                    >
                        Post Update
                    </Button>

                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1 }}>{t.history}</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 300, overflowY: 'auto' }}>
                        {(partner.trafficComments || []).map((tc: any, i: number) => (
                            <Box key={i} sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                    <Chip size="small" icon={<CircleIcon sx={{ fontSize: '10px !important', color: TrafficColors[tc.status] }} />} label={tc.status} sx={{ height: 20, fontSize: 10, bgcolor: 'transparent', pl: 0.5 }} />
                                    <Typography variant="caption" color="text.disabled">{format(new Date(tc.timestamp), 'MMM d, h:mm a')}</Typography>
                                </Box>
                                <Typography variant="caption" sx={{ color: 'text.primary', display: 'block', mt: 0.5 }}>{tc.comment}</Typography>
                            </Box>
                        ))}
                        {(!partner.trafficComments || partner.trafficComments.length === 0) && (
                            <Typography variant="caption" color="text.disabled">{t.noHistory}</Typography>
                        )}
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} sx={{ color: 'text.secondary' }}>{t.close}</Button>
            </DialogActions>
        </Dialog>
    );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({ col, partners, onCardClick, toggleTask, onUpdatePartner }: {
    col: any;
    partners: Partner[];
    onCardClick: (p: Partner) => void;
    toggleTask: any;
    onUpdatePartner: any;
}) {
    const { mode } = useColorMode();
    const lang = useContext(LangContext);
    const t = DICT[lang];
    const { setNodeRef, isOver } = useDroppable({ id: col.id });
    return (
        <Box ref={setNodeRef} id={col.id} sx={{ 
            flex: 1, display: 'flex', flexDirection: 'column', minWidth: 320, maxWidth: 320,
            borderRadius: 4, transition: 'background-color 0.2s',
            ...(isOver && { bgcolor: 'rgba(59, 130, 246, 0.04)' })
        }}>
            <Box sx={{
                p: 2, mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                bgcolor: 'background.paper', borderRadius: 3, borderTop: `4px solid ${col.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography fontWeight={700} sx={{ color: 'text.primary', fontSize: 13 }}>{col.title}</Typography>
                    <Tooltip title={col.description} placement="top" arrow>
                        <InfoOutlinedIcon sx={{ fontSize: 13, color: 'text.disabled', cursor: 'help' }} />
                    </Tooltip>
                </Box>
                <Chip size="small" label={partners.length} sx={{ bgcolor: col.bg, color: col.color, fontWeight: 700 }} />
            </Box>
            <Box sx={{
                flex: 1, bgcolor: mode === 'light' ? '#f4f4f5' : 'rgba(0,0,0,0.4)', borderRadius: 3, p: 1.5, overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: 1.5, border: '1px solid', borderColor: mode === 'light' ? '#e4e4e7' : 'divider',
                maxHeight: 'calc(100vh - 240px)'
            }}>
                <SortableContext items={partners.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    {partners.map(partner => (
                        <KanbanCard
                            key={partner.id}
                            partner={partner}
                            onClick={() => onCardClick(partner)}
                            toggleTask={toggleTask}
                            onUpdatePartner={onUpdatePartner}
                        />
                    ))}
                </SortableContext>
                {partners.length === 0 && (
                    <Box sx={{ py: 4, textAlign: 'center', color: '#a1a1aa', border: '2px dashed', borderColor: 'divider', borderRadius: 2 }}>
                        <Typography variant="caption">{t.dropHere}</Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
}

// ─── Kanban Card ─────────────────────────────────────────────────────────────

function KanbanCard({ partner, isOverlay, onClick, toggleTask, onUpdatePartner }: {
    partner: Partner;
    isOverlay?: boolean;
    onClick?: () => void;
    toggleTask?: any;
    onUpdatePartner?: any;
}) {
    const { mode } = useColorMode();
    const lang = useContext(LangContext);
    const t = DICT[lang];
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: partner.id, data: partner });
    const style = { 
        transform: CSS.Transform.toString(transform), 
        transition, 
        opacity: isDragging ? 0.4 : 1,
        // Critical for finding targets underneath the active card
        pointerEvents: isDragging ? 'none' : 'auto' as any
    };

    const daysSinceUpdate = partner.updatedAt ? differenceInDays(new Date(), new Date(partner.updatedAt)) : 0;
    const isAtRisk = daysSinceUpdate > 30;
    const isStale = daysSinceUpdate > 14 && !isAtRisk;

    // SLA for Partner Revision
    const isRevision = partner.boardStage === 'PARTNER_REVISION';
    const slaRemaining = isRevision ? 14 - daysSinceUpdate : null;
    const slaExceeded = slaRemaining !== null && slaRemaining <= 0;
    const slaWarning = slaRemaining !== null && slaRemaining > 0 && slaRemaining <= 3;

    const taskList = getTasksForStage(partner.boardStage || 'INITIATION', partner.integrationType || 'INBOUND');
    const taskCount = taskList.length;
    const stageTasks = partner.boardTasks?.[partner.boardStage || 'INITIATION'] || {};
    const tasksDone = taskCount === 0 ? 0 : Object.values(stageTasks).filter(Boolean).length;

    // "Good to go" state for revision cards
    const isRevisionGoodToGo = isRevision && taskCount > 0 && tasksDone === 0;

    return (
        <Paper
            ref={setNodeRef} style={style} {...attributes} {...listeners}
            elevation={isOverlay ? 8 : 1}
            onClick={() => { if (!isDragging && onClick) onClick(); }}
            sx={{
                p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', cursor: 'grab', bgcolor: 'background.paper',
                '&:active': { cursor: 'grabbing' },
                '&:hover': { borderColor: '#3b82f6', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)' },
                ...(slaExceeded && { borderColor: '#fca5a5', borderWidth: 2 }),
                ...(slaWarning && { borderColor: '#fed7aa', borderWidth: 2 }),
            }}
        >
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'text.primary' }}>{partner.name}</Typography>
                <CircleIcon sx={{ fontSize: 12, color: TrafficColors[partner.trafficLight || 'HEALTHY'], flexShrink: 0 }} />
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>#{partner.code}</Typography>

            {/* SLA Badge (Revision only) */}
            {isRevision && !isOverlay && slaRemaining !== null && (
                <Box sx={{ mb: 1 }} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                    <Chip
                        size="small"
                        icon={<TimerOutlinedIcon sx={{ fontSize: '12px !important' }} />}
                        label={slaRemaining <= 0 ? `${t.slaOverdue} ${Math.abs(slaRemaining)}d` : `${t.slaLeft} ${slaRemaining}d`}
                        sx={{
                            height: 20, fontSize: 10, fontWeight: 700,
                            bgcolor: slaExceeded ? '#fee2e2' : slaWarning ? '#fff7ed' : '#f0fdf4',
                            color: slaExceeded ? '#ef4444' : slaWarning ? '#f97316' : '#16a34a',
                            border: `1px solid ${slaExceeded ? '#fca5a5' : slaWarning ? '#fed7aa' : '#bbf7d0'}`
                        }}
                    />
                </Box>
            )}

            {/* "Good to go" notice on card */}
            {isRevisionGoodToGo && !isOverlay && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, p: 0.75, bgcolor: '#f0fdf4', borderRadius: 1.5 }}
                    onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                    <CheckCircleOutlineIcon sx={{ fontSize: 12, color: '#16a34a' }} />
                    <Typography variant="caption" fontWeight={600} sx={{ color: '#15803d', fontSize: 10 }}>{t.goodToGoCard}</Typography>
                </Box>
            )}

            {/* Badges */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                {partner.boardStage === 'INITIATION' && !isOverlay ? (
                    <>
                        <Select size="small" value={partner.integrationType || 'INBOUND'}
                            onChange={(e) => onUpdatePartner(partner.id, { integrationType: e.target.value })}
                            sx={{ height: 26, fontSize: 11, fontWeight: 600, bgcolor: 'action.hover', '& .MuiSelect-select': { py: 0, px: 1 } }}>
                            <MenuItem value="INBOUND" sx={{ fontSize: 12 }}>INBOUND</MenuItem>
                            <MenuItem value="OUTBOUND" sx={{ fontSize: 12 }}>OUTBOUND</MenuItem>
                            <MenuItem value="HYBRID" sx={{ fontSize: 12 }}>HYBRID</MenuItem>
                        </Select>
                        <Select size="small" value={partner.complexity || 'MEDIUM'}
                            onChange={(e) => onUpdatePartner(partner.id, { complexity: e.target.value })}
                            sx={{ height: 26, fontSize: 11, fontWeight: 600, bgcolor: 'action.hover', '& .MuiSelect-select': { py: 0, px: 1 } }}>
                            <MenuItem value="LOW" sx={{ fontSize: 12 }}>LOW</MenuItem>
                            <MenuItem value="MEDIUM" sx={{ fontSize: 12 }}>MEDIUM</MenuItem>
                            <MenuItem value="HARD" sx={{ fontSize: 12 }}>HARD</MenuItem>
                        </Select>
                    </>
                ) : (
                    <>
                        <Chip size="small" label={partner.integrationType} sx={{ height: 20, fontSize: 10, bgcolor: 'action.hover', color: '#2563eb', fontWeight: 600 }} />
                        <Chip size="small" label={partner.complexity} sx={{ height: 20, fontSize: 10, bgcolor: partner.complexity === 'HARD' ? '#fee2e2' : '#f3f4f6', color: partner.complexity === 'HARD' ? '#dc2626' : '#4b5563', fontWeight: 600 }} />
                    </>
                )}
                {isAtRisk && <Chip label="{t.atRisk}" size="small" sx={{ height: 20, fontSize: 10, bgcolor: '#fef2f2', color: '#ef4444', fontWeight: 700, border: '1px solid #fca5a5' }} />}
                {isStale && <Chip label="{t.stale}" size="small" sx={{ height: 20, fontSize: 10, bgcolor: '#fffbeb', color: '#d97706', fontWeight: 700, border: '1px solid #fcd34d' }} />}
            </Box>

            {/* Inline Checklist */}
            {!isOverlay && taskCount > 0 && (
                <Box sx={{ mt: 1, mb: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}
                    onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{t.tasks}</Typography>
                    {taskList.map(task => {
                        const { label } = parseTaskGroup(task, lang);
                        const isChecked = stageTasks[task] || false;
                        return (
                            <Box key={task} sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.2 }}>
                                <Checkbox
                                    size="small"
                                    checked={isChecked}
                                    onChange={(e) => toggleTask(partner.id, partner.boardStage || 'INITIATION', task, e.target.checked)}
                                    sx={{ p: 0, mr: 0.5, '& .MuiSvgIcon-root': { fontSize: 14 } }}
                                />
                                <Typography variant="caption" sx={{ color: isChecked ? '#9ca3af' : '#4b5563', textDecoration: isChecked ? 'line-through' : 'none', lineHeight: 1.3 }}>
                                    {label}
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>
            )}

            {/* Footer */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider' }}>
                {partner.integrator ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 22, height: 22, fontSize: 11, bgcolor: 'action.disabledBackground', color: 'text.primary', fontWeight: 700 }}>
                            {(partner.integrator.name || partner.integrator.email || 'U').charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 80 }}>
                            {partner.integrator.name || partner.integrator.email}
                        </Typography>
                    </Box>
                ) : (
                    <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>{t.unassigned}</Typography>
                )}
                {taskCount > 0 && (
                    <Tooltip title={`${tasksDone}/${taskCount} tasks checked`} placement="top">
                        <Chip
                            size="small"
                            icon={<NotesIcon sx={{ fontSize: '12px !important' }} />}
                            label={`${tasksDone}/${taskCount}`}
                            sx={{ height: 20, fontSize: 10, bgcolor: tasksDone === taskCount ? '#dcfce7' : '#f1f5f9', color: tasksDone === taskCount ? '#16a34a' : '#64748b' }}
                        />
                    </Tooltip>
                )}
            </Box>
        </Paper>
    );
}
