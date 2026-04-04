'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box, Typography, Paper, Chip, Avatar, Alert,
    Button, TextField, Dialog, DialogTitle, DialogContent,
    DialogActions, Snackbar, Skeleton, Checkbox,
    Select, MenuItem, FormControl, InputLabel, Divider, Tooltip
} from '@mui/material';
import {
    DndContext, DragOverlay, closestCorners, closestCenter, KeyboardSensor,
    PointerSensor, useSensor, useSensors, DragStartEvent,
    DragEndEvent, useDroppable
} from '@dnd-kit/core';
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

const COLUMNS: { id: BoardStage; title: string; color: string; bg: string; description: string }[] = [
    { id: 'INITIATION', title: 'Initiation Phase', color: '#64748b', bg: '#f1f5f9', description: 'Configure integration type and initial partner setup.' },
    { id: 'KICKOFF_SETUP', title: 'Kickoff & Setup', color: '#3b82f6', bg: '#dbeafe', description: 'Kickoff meeting and documentation sharing with partner.' },
    { id: 'DEV_CONFIG', title: 'Development / Config', color: '#8b5cf6', bg: '#ede9fe', description: 'Partner integrates their system using sandbox credentials.' },
    { id: 'TESTING_VALIDATION', title: 'Testing & Validation', color: '#f59e0b', bg: '#fef3c7', description: 'Partner runs tests (SIT, E2E) and submits results. Integrator validates submissions before escalating to QA.' },
    { id: 'QA_REVIEW', title: 'QA Review (Formal)', color: '#a855f7', bg: '#f3e8ff', description: 'Formal QA department sign-off before pre-production.' },
    { id: 'PARTNER_REVISION', title: 'Partner Revision', color: '#ec4899', bg: '#fce7f3', description: 'Repair shop: tracks exactly what the partner needs to fix. SLA: 14 days.' },
    { id: 'BLOCKED_WAITING', title: 'Blocked / Waiting', color: '#ef4444', bg: '#fee2e2', description: 'Waiting for partner action or external dependencies.' },
    { id: 'PRE_PRODUCTION', title: 'Pre-Production', color: '#14b8a6', bg: '#ccfbf1', description: 'Tabletop sessions and production attribute setup.' },
    { id: 'PRODUCTION_READY', title: 'Production Ready', color: '#10b981', bg: '#d1fae5', description: 'Awaiting deployment by OSO Team.' },
    { id: 'DEPLOYED', title: 'Deployed', color: '#22c55e', bg: '#dcfce7', description: 'Partner is live. Status is automatically updated to LIVE.' },
    { id: 'POST_DEPLOYMENT', title: 'Post-Deployment', color: '#0ea5e9', bg: '#e0f2fe', description: 'ASPI compliance, incident monitoring, and initial traffic checks.' },
    { id: 'DONE', title: 'Done', color: '#0f172a', bg: '#e2e8f0', description: 'Completed active management. Shows cards updated within last 30 days (max 20).' },
];

const TrafficColors: Record<string, string> = {
    HEALTHY: '#22c55e',
    DEGRADED: '#f59e0b',
    CRITICAL: '#ef4444'
};

export default function KanbanPage() {
    const queryClient = useQueryClient();
    const [activeId, setActiveId] = useState<string | null>(null);
    const [detailDialog, setDetailDialog] = useState<Partner | null>(null);
    const [toast, setToast] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
    const [trafficCommentEntry, setTrafficCommentEntry] = useState('');
    const [filterIntegrator, setFilterIntegrator] = useState<string>('All');
    const [defaultSet, setDefaultSet] = useState(false);
    const [localPartners, setLocalPartners] = useState<Partner[]>([]);

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
            if (filterIntegrator !== 'All' && p.integrator?.name !== filterIntegrator) {
                return;
            }
            
            const stage = p.boardStage || 'INITIATION';
            if (cols[stage]) cols[stage].push(p);
        });
        return cols;
    }, [localPartners, filterIntegrator]);

    const integratorOptions = useMemo(() => {
        if (!partners) return ['All'];
        const names = partners
            .map(p => p.integrator?.name)
            .filter((n): n is string => Boolean(n));
        return ['All', ...Array.from(new Set(names))];
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
                const updated = prev.map(p => {
                    if (p.id === activeIdStr) {
                        return { ...p, boardStage: targetStage };
                    }
                    return p;
                });
                return updated;
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
        if (!over) { setActiveId(null); return; }

        const activeIdStr = active.id as string;
        const overIdStr = over.id as string;

        if (activeIdStr === overIdStr) {
            setActiveId(null);
            return;
        }

        const activePartner = localPartners.find(p => p.id === activeIdStr);
        if (!activePartner) return;

        const activeStage = activePartner.boardStage || 'INITIATION';
        let overPartner = localPartners.find(p => p.id === overIdStr);
        let targetStage: BoardStage;
        let targetIndex: number;

        // 1. Identify target stage and approximate index using the visual state (localPartners)
        if (COLUMNS.some(c => c.id === overIdStr)) {
            // Dropped on the column background
            targetStage = overIdStr as BoardStage;
            const stagePartners = (columns[targetStage] || []);
            targetIndex = stagePartners.length; 
        } else if (overPartner) {
            // Dropped on another card
            targetStage = overPartner.boardStage || 'INITIATION';
            const stagePartners = (columns[targetStage] || []);
            targetIndex = stagePartners.findIndex(p => p.id === overIdStr);
        } else {
            setActiveId(null);
            return;
        }

        // 2. Perform the reorder logic server-side
        if (activeStage === targetStage) {
            const stagePartners = [...(columns[activeStage] || [])];
            const oldIndex = stagePartners.findIndex(p => p.id === activeIdStr);
            const newIndex = targetIndex;

            if (oldIndex !== newIndex) {
                const newOrder = arrayMove(stagePartners, oldIndex, newIndex);
                newOrder.forEach((p, idx) => {
                    if (p.kanbanOrder !== idx || p.id === activeIdStr) {
                        updatePartnerMutation.mutate({ id: p.id, data: { kanbanOrder: idx } });
                    }
                });
            }
        } else {
            const targetPartners = [...(columns[targetStage] || [])];
            updatePartnerMutation.mutate({ 
                id: activeIdStr, 
                data: { boardStage: targetStage, kanbanOrder: targetIndex } 
            });

            targetPartners.forEach((p, idx) => {
                if (idx >= targetIndex) {
                    updatePartnerMutation.mutate({ id: p.id, data: { kanbanOrder: idx + 1 } });
                }
            });
        }

        setActiveId(null);
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
                    <Typography variant="h4" fontWeight={800} sx={{ color: '#111827' }}>Integration Board</Typography>
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
    if (error) return <Box sx={{ p: 4 }}><Alert severity="error">Failed to load board</Alert></Box>;

    return (
        <Box sx={{ p: 4, height: '100%', overflowX: 'auto', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <Box>
                    <Typography variant="h4" fontWeight={800} sx={{ color: '#111827' }}>Integration Board</Typography>
                    <Typography variant="body1" sx={{ color: '#6b7280' }}>Track partner onboarding through a 12-stage lifecycle.</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel id="integrator-filter-label">Filter by Integrator</InputLabel>
                        <Select
                            labelId="integrator-filter-label"
                            value={filterIntegrator}
                            label="Filter by Integrator"
                            onChange={(e) => setFilterIntegrator(e.target.value)}
                            sx={{ borderRadius: 2, bgcolor: 'white' }}
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
                    onClose={() => setDetailDialog(null)}
                    onToggleTask={toggleTask}
                    onUpdate={(data) => updatePartnerMutation.mutate({ id: detailDialog.id, data })}
                    trafficCommentEntry={trafficCommentEntry}
                    setTrafficCommentEntry={setTrafficCommentEntry}
                    addTrafficComment={addTrafficComment}
                />
            )}

            <Snackbar open={toast.open} autoHideDuration={6000} onClose={() => setToast({ ...toast, open: false })}>
                <Alert severity={toast.severity} sx={{ width: '100%' }}>{toast.message}</Alert>
            </Snackbar>
        </Box>
    );
}

// ─── Detail Dialog (extracted for clarity) ───────────────────────────────────

function PartnerDetailDialog({
    partner, onClose, onToggleTask, onUpdate, trafficCommentEntry, setTrafficCommentEntry, addTrafficComment
}: {
    partner: Partner;
    onClose: () => void;
    onToggleTask: (partnerId: string, stage: string, task: string, checked: boolean) => void;
    onUpdate: (data: Partial<Partner>) => void;
    trafficCommentEntry: string;
    setTrafficCommentEntry: (v: string) => void;
    addTrafficComment: (partnerId: string, status: string, comment: string) => void;
}) {
    const stage = partner.boardStage || 'INITIATION';
    const tasks = getTasksForStage(stage, partner.integrationType || 'INBOUND');
    const stageTasks = partner.boardTasks?.[stage] || {};
    const col = COLUMNS.find(c => c.id === stage);

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
            const { group } = parseTaskGroup(task);
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
                    <Chip size="small" label={partner.integrationType} sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 600 }} />
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
                                    {slaRemaining <= 0 ? `SLA Overdue by ${Math.abs(slaRemaining)} day(s)` : `SLA: ${slaRemaining} day(s) remaining`}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">14-day partner revision window from last update</Typography>
                            </Box>
                        </Box>
                    )}

                    {/* "Good to go" banner for Partner Revision with nothing checked */}
                    {isRevision && noRevisionsFlagged && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                            <CheckCircleOutlineIcon sx={{ fontSize: 18, color: '#16a34a' }} />
                            <Typography variant="body2" fontWeight={600} sx={{ color: '#15803d' }}>
                                No revisions flagged — partner is good to go ✓
                            </Typography>
                        </Box>
                    )}

                    {/* Checklist */}
                    <Box>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: '#374151' }}>
                            Stage Checklist: {col?.title}
                        </Typography>

                        {tasks.length === 0 ? (
                            <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, bgcolor: '#f9fafb' }}>
                                <Typography variant="body2" color="text.disabled">No tasks for this stage.</Typography>
                            </Paper>
                        ) : hasGroups ? (
                            // Grouped rendering
                            Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
                                <Box key={groupName} sx={{ mb: 2 }}>
                                    {groupName !== '_default' && (
                                        <Typography variant="caption" fontWeight={700} sx={{
                                            display: 'block', mb: 1, px: 1.5, py: 0.5,
                                            bgcolor: '#f1f5f9', borderRadius: 1, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10
                                        }}>
                                            {groupName}
                                        </Typography>
                                    )}
                                    <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5, bgcolor: '#f9fafb' }}>
                                        {groupTasks.map(task => {
                                            const { label } = parseTaskGroup(task);
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
                                    const isChecked = stageTasks[task] || false;
                                    return (
                                        <Box key={task} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                            <Checkbox
                                                size="small"
                                                checked={isChecked}
                                                onChange={(e) => onToggleTask(partner.id, stage, task, e.target.checked)}
                                            />
                                            <Typography variant="body2" sx={{ color: isChecked ? '#9ca3af' : '#1f2937', textDecoration: isChecked ? 'line-through' : 'none' }}>
                                                {task}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Paper>
                        )}
                    </Box>

                    {/* Features */}
                    <Box>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: '#374151' }}>Features Used</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {(partner.features || []).length > 0 ? (
                                partner.features?.map((f: any) => (
                                    <Chip key={f.id} size="small" label={f.name} sx={{ borderRadius: 1 }} />
                                ))
                            ) : (
                                <Typography variant="body2" color="text.disabled">No features mapped</Typography>
                            )}
                        </Box>
                    </Box>

                    {/* Notes */}
                    <Box>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: '#374151' }}>Notes</Typography>
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
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, color: '#374151' }}>Traffic Light</Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                        <CircleIcon sx={{ fontSize: 16, color: TrafficColors[partner.trafficLight || 'HEALTHY'] }} />
                        <Typography variant="body2" fontWeight={700}>{partner.trafficLight || 'HEALTHY'}</Typography>
                    </Box>

                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Update Status</InputLabel>
                        <Select
                            label="Update Status"
                            value={partner.trafficLight || 'HEALTHY'}
                            onChange={(e) => onUpdate({ trafficLight: e.target.value as TrafficLight })}
                        >
                            <MenuItem value="HEALTHY">Healthy</MenuItem>
                            <MenuItem value="DEGRADED">Degraded</MenuItem>
                            <MenuItem value="CRITICAL">Critical</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth multiline rows={2} size="small"
                        placeholder="Add incident or status comment..."
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

                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1 }}>Incident History</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 300, overflowY: 'auto' }}>
                        {(partner.trafficComments || []).map((tc: any, i: number) => (
                            <Box key={i} sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                    <Chip size="small" icon={<CircleIcon sx={{ fontSize: '10px !important', color: TrafficColors[tc.status] }} />} label={tc.status} sx={{ height: 20, fontSize: 10, bgcolor: 'transparent', pl: 0.5 }} />
                                    <Typography variant="caption" color="text.disabled">{format(new Date(tc.timestamp), 'MMM d, h:mm a')}</Typography>
                                </Box>
                                <Typography variant="caption" sx={{ color: '#334155', display: 'block', mt: 0.5 }}>{tc.comment}</Typography>
                            </Box>
                        ))}
                        {(!partner.trafficComments || partner.trafficComments.length === 0) && (
                            <Typography variant="caption" color="text.disabled">No history available.</Typography>
                        )}
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} sx={{ color: '#6b7280' }}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({ col, partners, onCardClick, toggleTask, onUpdatePartner }: {
    col: typeof COLUMNS[0];
    partners: Partner[];
    onCardClick: (p: Partner) => void;
    toggleTask: any;
    onUpdatePartner: any;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: col.id });
    return (
        <Box ref={setNodeRef} id={col.id} sx={{ 
            flex: 1, display: 'flex', flexDirection: 'column', minWidth: 320, maxWidth: 320,
            borderRadius: 4, transition: 'background-color 0.2s',
            ...(isOver && { bgcolor: 'rgba(59, 130, 246, 0.04)' })
        }}>
            <Box sx={{
                p: 2, mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                bgcolor: 'white', borderRadius: 3, borderTop: `4px solid ${col.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography fontWeight={700} sx={{ color: '#374151', fontSize: 13 }}>{col.title}</Typography>
                    <Tooltip title={col.description} placement="top" arrow>
                        <InfoOutlinedIcon sx={{ fontSize: 13, color: '#9ca3af', cursor: 'help' }} />
                    </Tooltip>
                </Box>
                <Chip size="small" label={partners.length} sx={{ bgcolor: col.bg, color: col.color, fontWeight: 700 }} />
            </Box>
            <Box sx={{
                flex: 1, bgcolor: '#f4f4f5', borderRadius: 3, p: 1.5, overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: 1.5, border: '1px solid #e4e4e7'
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
                    <Box sx={{ py: 4, textAlign: 'center', color: '#a1a1aa', border: '2px dashed #d4d4d8', borderRadius: 2 }}>
                        <Typography variant="caption">Drop here</Typography>
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
                p: 2, borderRadius: 3, border: '1px solid #e5e7eb', cursor: 'grab', bgcolor: 'white',
                '&:active': { cursor: 'grabbing' },
                '&:hover': { borderColor: '#3b82f6', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)' },
                ...(slaExceeded && { borderColor: '#fca5a5', borderWidth: 2 }),
                ...(slaWarning && { borderColor: '#fed7aa', borderWidth: 2 }),
            }}
        >
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#1f2937' }}>{partner.name}</Typography>
                <CircleIcon sx={{ fontSize: 12, color: TrafficColors[partner.trafficLight || 'HEALTHY'], flexShrink: 0 }} />
            </Box>
            <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1 }}>#{partner.code}</Typography>

            {/* SLA Badge (Revision only) */}
            {isRevision && !isOverlay && slaRemaining !== null && (
                <Box sx={{ mb: 1 }} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                    <Chip
                        size="small"
                        icon={<TimerOutlinedIcon sx={{ fontSize: '12px !important' }} />}
                        label={slaRemaining <= 0 ? `SLA Overdue ${Math.abs(slaRemaining)}d` : `SLA ${slaRemaining}d left`}
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
                    <Typography variant="caption" fontWeight={600} sx={{ color: '#15803d', fontSize: 10 }}>No revisions flagged — good to go</Typography>
                </Box>
            )}

            {/* Badges */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                {partner.boardStage === 'INITIATION' && !isOverlay ? (
                    <>
                        <Select size="small" value={partner.integrationType || 'INBOUND'}
                            onChange={(e) => onUpdatePartner(partner.id, { integrationType: e.target.value })}
                            sx={{ height: 26, fontSize: 11, fontWeight: 600, bgcolor: '#eff6ff', '& .MuiSelect-select': { py: 0, px: 1 } }}>
                            <MenuItem value="INBOUND" sx={{ fontSize: 12 }}>INBOUND</MenuItem>
                            <MenuItem value="OUTBOUND" sx={{ fontSize: 12 }}>OUTBOUND</MenuItem>
                            <MenuItem value="HYBRID" sx={{ fontSize: 12 }}>HYBRID</MenuItem>
                        </Select>
                        <Select size="small" value={partner.complexity || 'MEDIUM'}
                            onChange={(e) => onUpdatePartner(partner.id, { complexity: e.target.value })}
                            sx={{ height: 26, fontSize: 11, fontWeight: 600, bgcolor: '#f3f4f6', '& .MuiSelect-select': { py: 0, px: 1 } }}>
                            <MenuItem value="LOW" sx={{ fontSize: 12 }}>LOW</MenuItem>
                            <MenuItem value="MEDIUM" sx={{ fontSize: 12 }}>MEDIUM</MenuItem>
                            <MenuItem value="HARD" sx={{ fontSize: 12 }}>HARD</MenuItem>
                        </Select>
                    </>
                ) : (
                    <>
                        <Chip size="small" label={partner.integrationType} sx={{ height: 20, fontSize: 10, bgcolor: '#eff6ff', color: '#2563eb', fontWeight: 600 }} />
                        <Chip size="small" label={partner.complexity} sx={{ height: 20, fontSize: 10, bgcolor: partner.complexity === 'HARD' ? '#fee2e2' : '#f3f4f6', color: partner.complexity === 'HARD' ? '#dc2626' : '#4b5563', fontWeight: 600 }} />
                    </>
                )}
                {isAtRisk && <Chip label="At Risk (>30d)" size="small" sx={{ height: 20, fontSize: 10, bgcolor: '#fef2f2', color: '#ef4444', fontWeight: 700, border: '1px solid #fca5a5' }} />}
                {isStale && <Chip label="Stale (2w)" size="small" sx={{ height: 20, fontSize: 10, bgcolor: '#fffbeb', color: '#d97706', fontWeight: 700, border: '1px solid #fcd34d' }} />}
            </Box>

            {/* Inline Checklist */}
            {!isOverlay && taskCount > 0 && (
                <Box sx={{ mt: 1, mb: 1, pt: 1, borderTop: '1px solid #f3f4f6' }}
                    onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Tasks:</Typography>
                    {taskList.map(task => {
                        const { label } = parseTaskGroup(task);
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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, pt: 1.5, borderTop: '1px dashed #e5e7eb' }}>
                {partner.integrator ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 22, height: 22, fontSize: 11, bgcolor: '#cbd5e1', color: '#334155', fontWeight: 700 }}>
                            {(partner.integrator.name || partner.integrator.email || 'U').charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 80 }}>
                            {partner.integrator.name || partner.integrator.email}
                        </Typography>
                    </Box>
                ) : (
                    <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>Unassigned</Typography>
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
