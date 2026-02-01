'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Box, 
    Typography, 
    Paper, 
    Chip, 
    Avatar,
    Alert,
    CircularProgress,
    Button,
    IconButton,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip,
    Snackbar
} from '@mui/material';
import { 
    DndContext, 
    DragOverlay, 
    closestCorners, 
    KeyboardSensor, 
    PointerSensor, 
    useSensor, 
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    useDroppable
} from '@dnd-kit/core';
import { 
    arrayMove, 
    SortableContext, 
    sortableKeyboardCoordinates, 
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import axios from 'axios';
import { format, differenceInDays } from 'date-fns';
import { Partner, PartnerStatus, KanbanStage, PartnerDocStatus } from '../partners/types'; // Assuming types generic import, or just from validation if not there
import { KanbanStageEnum } from '@/app/lib/validations/partner';
import { canMoveToReady } from '@/app/kanban/utils';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import ErrorIcon from '@mui/icons-material/Error';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

// Kanban Columns Configuration
const COLUMNS: { id: string; title: string; color: string; bg: string }[] = [
    { id: 'AWAITING_KICKOFF', title: 'Awaiting Kickoff', color: '#64748b', bg: '#f1f5f9' },
    { id: 'SANDBOX_ACTIVE', title: 'Sandbox Active', color: '#3b82f6', bg: '#dbeafe' },
    { id: 'SIT_VERIFICATION', title: 'SIT Verification', color: '#8b5cf6', bg: '#ede9fe' },
    { id: 'REVISION_PENDING', title: 'Revision Pending', color: '#ef4444', bg: '#fee2e2' },
    { id: 'READY_FOR_DEPLOY', title: 'Ready for Deploy', color: '#10b981', bg: '#d1fae5' },
];

export default function KanbanPage() {
    const queryClient = useQueryClient();
    const [activeId, setActiveId] = useState<string | null>(null);
    const [noteDialog, setNoteDialog] = useState<{ id: string, notes: string } | null>(null);
    // Toast state
    const [toast, setToast] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    const { data: partners, isLoading, error } = useQuery<Partner[]>({
        queryKey: ['partners', 'kanban'], // added 'kanban' to key
        queryFn: async () => {
            const res = await axios.get('/api/partners?activeKanban=true');
            return res.data;
        }
    });

    const updatePartnerMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Partner> }) => {
            // Optimistic updates are tricky with complex validation, relying on server response or optimistic + rollback
            // For now, let's just send it.
            try {
                await axios.put(`/api/partners/${id}`, data);
            } catch (err: any) {
                // Throw to trigger onError
                throw err.response?.data?.error || err.message;
            }
        },
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: ['partners', 'kanban'] });
            const previousPartners = queryClient.getQueryData<Partner[]>(['partners', 'kanban']);
            
            // Optimistic update
            if (previousPartners) {
                queryClient.setQueryData<Partner[]>(['partners', 'kanban'], (old) => {
                    if (!old) return [];
                    return old.map(p => p.id === id ? { ...p, ...data } : p);
                });
            }
            return { previousPartners };
        },
        onError: (err: string, newTodo, context) => {
            if (context?.previousPartners) {
                queryClient.setQueryData(['partners', 'kanban'], context.previousPartners);
            }
            setToast({ open: true, message: err, severity: 'error' });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['partners', 'kanban'] });
            setNoteDialog(null);
        },
    });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Group partners by kanbanStage
    const columns = useMemo(() => {
        const cols: Record<string, Partner[]> = {};
        COLUMNS.forEach(col => cols[col.id] = []);
        partners?.forEach(p => {
            const stage = p.kanbanStage || 'AWAITING_KICKOFF'; // Default to first stage if missing but active
            if (cols[stage]) {
                cols[stage].push(p);
            }
        });
        return cols;
    }, [partners]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        // ... (standard logic)
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        
        if (!over) {
            setActiveId(null);
            return;
        }

        const activeId = active.id as string;
        const overId = over.id as string; // This is primarily the column ID (KanbanStage)
        const partner = partners?.find(p => p.id === activeId);
        
        if (!partner) return;

        let newStage: KanbanStage | undefined;
        
        // Check if dropped on a column
        if (COLUMNS.some(c => c.id === overId)) {
            newStage = overId as KanbanStage;
        } else {
            // Check if dropped on another card
            const overPartner = partners?.find(p => p.id === overId);
            if (overPartner) {
                newStage = overPartner.kanbanStage || 'AWAITING_KICKOFF';
            }
        }

        // Current stage
        const currentStage = partner.kanbanStage || 'AWAITING_KICKOFF';

        if (newStage && newStage !== currentStage) {
            // Guardrail: Moving to READY_FOR_DEPLOY
            if (newStage === 'READY_FOR_DEPLOY') {
                if (!canMoveToReady(partner.docStatus)) {
                    setToast({ 
                        open: true, 
                        message: "Cannot deploy: Missing required document approvals.", 
                        severity: 'error' 
                    });
                    setActiveId(null);
                    return; // Abort drop
                }
            }

            updatePartnerMutation.mutate({ id: activeId, data: { kanbanStage: newStage } });
        }

        setActiveId(null);
    };

    if (isLoading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
    if (error) return <Box sx={{ p: 4 }}><Alert severity="error">Failed to load board</Alert></Box>;

    const handleGoLive = (id: string) => {
        updatePartnerMutation.mutate({ id, data: { status: 'LIVE' } });
    };

    const handleDocUpdate = (id: string, docType: string, isChecked: boolean) => {
        const partner = partners?.find(p => p.id === id);
        if (!partner) return;
        
        const currentDocs = partner.docStatus || { sit: 'PENDING', reconcile: 'PENDING', devsite: 'PENDING' };
        const newStatus = isChecked ? 'APPROVED' : 'PENDING';
        
        const updatedDocs = {
            ...currentDocs,
            [docType]: newStatus
        };
        
        updatePartnerMutation.mutate({ id, data: { docStatus: updatedDocs } });
    };

    return (
        <Box sx={{ p: 4, height: '100%', overflowX: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="h4" fontWeight={800} sx={{ color: '#111827' }}>Integration Board</Typography>
                    <Typography variant="body1" sx={{ color: '#6b7280' }}>Track partner onboarding, issues, and production status.</Typography>
                </Box>
            </Box>

            <DndContext 
                sensors={sensors} 
                collisionDetection={closestCorners} 
                onDragStart={handleDragStart} 
                onDragOver={handleDragOver} 
                onDragEnd={handleDragEnd}
            >
                <Box sx={{ display: 'flex', gap: 3, flex: 1, minWidth: 1000 }}>
                    {COLUMNS.map(col => (
                        <KanbanColumn 
                            key={col.id} 
                            col={col} 
                            partners={columns[col.id] || []}
                            onEditNotes={setNoteDialog}
                            onGoLive={handleGoLive}
                            onToggleDoc={handleDocUpdate}
                        />
                    ))}
                </Box>

                <DragOverlay dropAnimation={null}>
                    {activeId ? (
                        <KanbanCard partner={partners?.find(p => p.id === activeId)!} isOverlay />
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Note Dialog */}
            {noteDialog && (
                 <Dialog 
                    open={Boolean(noteDialog)} 
                    onClose={() => setNoteDialog(null)} 
                    fullWidth 
                    maxWidth="md"
                    PaperProps={{ sx: { height: '60vh' } }}
                 >
                     <DialogTitle sx={{ fontWeight: 700 }}>Update Notes</DialogTitle>
                     <DialogContent>
                         <TextField
                             fullWidth
                             multiline
                             value={noteDialog.notes}
                             onChange={(e) => setNoteDialog(prev => prev ? { ...prev, notes: e.target.value } : null)}
                             placeholder="Add specific notes, blockers, or context..."
                             sx={{ 
                                 mt: 1, 
                                 height: '100%', 
                                 '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' },
                                 '& textarea': { height: '100% !important', overflowY: 'auto !important' }
                             }}
                         />
                     </DialogContent>
                     <DialogActions sx={{ p: 2 }}>
                         <Button onClick={() => setNoteDialog(null)} sx={{ color: '#6b7280' }}>Cancel</Button>
                         <Button 
                            variant="contained" 
                            onClick={() => updatePartnerMutation.mutate({ id: noteDialog.id, data: { notes: noteDialog.notes } })}
                            sx={{ bgcolor: '#0f172a', textTransform: 'none' }}
                        >
                             Save Notes
                         </Button>
                     </DialogActions>
                 </Dialog>
            )}

            <Snackbar 
                open={toast.open} 
                autoHideDuration={6000} 
                onClose={() => setToast({ ...toast, open: false })}
            >
                <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} sx={{ width: '100%' }}>
                    {toast.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}


function KanbanColumn({ 
    col, 
    partners, 
    onEditNotes,
    onGoLive,
    onToggleDoc
}: { 
    col: typeof COLUMNS[0], 
    partners: Partner[], 
    onEditNotes: (dialog: { id: string, notes: string }) => void,
    onGoLive: (id: string) => void,
    onToggleDoc: (id: string, doc: string, val: boolean) => void
}) {
    const { setNodeRef } = useDroppable({
        id: col.id,
    });

    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 280 }}>
            {/* Column Header */}
            <Box sx={{ 
                p: 2, 
                mb: 2, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                bgcolor: 'white', 
                borderRadius: 3,
                borderTop: `4px solid ${col.color}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <Typography fontWeight={700} sx={{ color: '#374151' }}>{col.title}</Typography>
                <Chip size="small" label={partners.length} sx={{ bgcolor: col.bg, color: col.color, fontWeight: 700 }} />
            </Box>

            {/* Column Content */}
            <Box 
                ref={setNodeRef}
                id={col.id}
                sx={{ 
                    flex: 1, 
                    bgcolor: '#f3f4f6', 
                    borderRadius: 3, 
                    p: 2, 
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                }}
            >
                <SortableContext 
                    items={partners.map(p => p.id)} 
                    strategy={verticalListSortingStrategy}
                >
                    {partners.map(partner => (
                        <KanbanCard 
                            key={partner.id} 
                            partner={partner} 
                            onEditNotes={() => onEditNotes({ id: partner.id, notes: partner.notes || '' })}
                            onGoLive={() => onGoLive(partner.id)}
                            onToggleDoc={(doc, val) => onToggleDoc(partner.id, doc, val)}
                        />
                    ))}
                </SortableContext>
                {partners.length === 0 && (
                    <Box sx={{ py: 4, textAlign: 'center', color: '#9ca3af', border: '2px dashed #e5e7eb', borderRadius: 2 }}>
                        <Typography variant="caption">No items</Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
}

import { Checkbox, FormControlLabel } from '@mui/material';

function KanbanCard({ 
    partner, 
    isOverlay, 
    onEditNotes, 
    onGoLive,
    onToggleDoc 
}: { 
    partner: Partner; 
    isOverlay?: boolean; 
    onEditNotes?: () => void, 
    onGoLive?: () => void,
    onToggleDoc?: (doc: string, val: boolean) => void 
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: partner.id, data: partner });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };
    
    const isStale = partner.updatedAt ? differenceInDays(new Date(), new Date(partner.updatedAt)) > 7 : false;

    // Doc Status Badges
    const docStatus: PartnerDocStatus = partner.docStatus || { sit: 'PENDING', reconcile: 'PENDING', devsite: 'PENDING' };

    return (
        <Paper
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            elevation={isOverlay ? 5 : 0}
            sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid #e5e7eb',
                cursor: 'grab',
                bgcolor: 'white',
                '&:hover': {
                    borderColor: '#3b82f6',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    '& .edit-icon': { opacity: 1 }
                },
                ...(isDragging && {
                    bgcolor: '#eff6ff',
                    borderColor: '#3b82f6',
                    borderStyle: 'dashed'
                })
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#1f2937' }}>{partner.name}</Typography>
                {isStale && (
                     <Chip label="Stale" size="small" sx={{ height: 20, fontSize: 10, bgcolor: '#fee2e2', color: '#ef4444' }} />
                )}
            </Box>
            
            <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mb: 1.5 }}>{partner.code}</Typography>
            
            {/* Doc Status Checkboxes */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }} onPointerDown={(e) => e.stopPropagation()}> 
                {[
                    { key: 'sit', label: 'SIT' },
                    { key: 'reconcile', label: 'REC' },
                    { key: 'devsite', label: 'DEV' }
                ].map((doc) => (
                    <Box 
                        key={doc.key} 
                        sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            bgcolor: (docStatus as any)[doc.key] === 'APPROVED' ? '#dcfce7' : '#f3f4f6',
                            pl: 0.5,
                            pr: 1,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: (docStatus as any)[doc.key] === 'APPROVED' ? '#bbf7d0' : '#e5e7eb'
                        }}
                    >
                        <Checkbox 
                            size="small"
                            checked={(docStatus as any)[doc.key] === 'APPROVED'}
                            onChange={(e) => onToggleDoc && onToggleDoc(doc.key, e.target.checked)}
                            sx={{ p: 0.5, '&.Mui-checked': { color: '#16a34a' } }}
                        />
                        <Typography variant="caption" fontWeight={600} sx={{ fontSize: 10, color: (docStatus as any)[doc.key] === 'APPROVED' ? '#166534' : '#6b7280' }}>
                            {doc.label}
                        </Typography>
                    </Box>
                ))}
            </Box>

            {/* Notes Section */}
            {partner.notes && (
                <Box 
                    sx={{ mb: 2, p: 1, bgcolor: '#fffbeb', borderRadius: 1, border: '1px solid #fef3c7', cursor: 'pointer' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onEditNotes) onEditNotes();
                    }}
                >
                    <Typography variant="caption" sx={{ color: '#92400e', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {partner.notes.length > 25 ? `${partner.notes.substring(0, 25)}...` : partner.notes}
                    </Typography>
                </Box>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                 {partner.integrator ? (
                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                         <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: '#fca5a5' }}>{partner.integrator.charAt(0)}</Avatar>
                         <Typography variant="caption" color="text.secondary">{partner.integrator}</Typography>
                     </Box>
                 ) : (
                     <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>Unassigned</Typography>
                 )}
                 
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                     {!isOverlay && onEditNotes && (
                         <Button
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditNotes();
                            }}
                            startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                            sx={{ 
                                minWidth: 0,
                                px: 1, 
                                py: 0.5, 
                                fontSize: 11,
                                textTransform: 'none',
                                color: partner.notes ? '#3b82f6' : '#9ca3af',
                                bgcolor: partner.notes ? '#eff6ff' : 'transparent',
                                '&:hover': { bgcolor: '#dbeafe', color: '#1d4ed8' }
                            }}
                        >
                            {partner.notes ? 'Edit' : 'Add Note'}
                        </Button>
                     )}
                     <Typography variant="caption" color="text.disabled">
                        {partner.updatedAt ? format(new Date(partner.updatedAt), 'MMM d') : ''}
                     </Typography>
                 </Box>
            </Box>

            {/* Go Live Button */}
            {!isOverlay && partner.kanbanStage === 'READY_FOR_DEPLOY' && onGoLive && (
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #f3f4f6' }}>
                    <Button 
                        fullWidth 
                        variant="contained" 
                        color="success" 
                        size="small"
                        startIcon={<RocketLaunchIcon />}
                        onClick={(e) => {
                            e.stopPropagation();
                            onGoLive();
                        }}
                    >
                        Go Live
                    </Button>
                </Box>
            )}
        </Paper>
    );
}
