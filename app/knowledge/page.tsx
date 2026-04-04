'use client';

import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  TablePagination,
  Skeleton,
  Chip,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { KnowledgeNote, CreateNoteInput } from './types';
import NoteDialog from './components/NoteDialog';
import { useDebounce } from '@/app/lib/hooks/useDebounce';
import { format } from 'date-fns';

interface KnowledgeResponse {
  data: KnowledgeNote[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<KnowledgeNote | null>(null);
  const [viewNote, setViewNote] = useState<KnowledgeNote | null>(null);

  const queryClient = useQueryClient();

  // Fetch Notes (large limit for client-side tag filter, server search still works)
  const { data: response, isLoading, error } = useQuery<KnowledgeResponse>({
    queryKey: ['knowledge-notes', debouncedSearchQuery, page, rowsPerPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
      });
      if (debouncedSearchQuery) params.append('q', debouncedSearchQuery);
      
      const res = await axios.get(`/api/knowledge?${params.toString()}`);
      return res.data;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 0,
    refetchOnMount: true,
  });

  const notes = response?.data || [];
  const totalCount = response?.meta.total || 0;

  // Extract all unique tags from current page for the filter bar
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(n => n.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [notes]);

  // Client-side tag filter on top of server results
  const filteredNotes = useMemo(() => {
    if (!activeTag) return notes;
    return notes.filter(n => n.tags.includes(activeTag));
  }, [notes, activeTag]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: CreateNoteInput) => {
      await axios.post('/api/knowledge', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-notes'] });
      setDialogOpen(false);
      setEditingNote(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateNoteInput }) => {
      await axios.put(`/api/knowledge/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-notes'] });
      setDialogOpen(false);
      setEditingNote(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/knowledge/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-notes'] });
    },
  });

  const handleSubmit = (data: CreateNoteInput) => {
    if (editingNote) {
      updateMutation.mutate({ id: editingNote.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this note?')) {
        deleteMutation.mutate(id);
    }
  };

  const handleEdit = (note: KnowledgeNote) => {
    setEditingNote(note);
    setDialogOpen(true);
  };

  const handleView = (note: KnowledgeNote) => {
    setViewNote(note);
  };

  const handleTogglePin = (note: KnowledgeNote) => {
    updateMutation.mutate({
        id: note.id,
        data: {
            title: note.title,
            content: note.content,
            tags: note.tags,
            isPinned: !note.isPinned
        }
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'white' }}>
      
      {/* Header Toolbar */}
      <Box sx={{ 
          px: 3, 
          pt: 2, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid #e5e7eb',
          minHeight: 60,
          flexShrink: 0,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#1f2937' }}>
            Knowledge Base
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            size="small"
            onClick={() => { setEditingNote(null); setDialogOpen(true); }}
            sx={{
              textTransform: 'none', fontWeight: 600, borderRadius: 2,
              borderColor: '#e5e7eb', color: '#374151',
              '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' }
            }}
          >
            New Note
          </Button>
        </Box>

        {/* Search */}
        <Box sx={{ position: 'relative' }}>
          <SearchIcon sx={{ fontSize: 18, color: '#9ca3af', position: 'absolute', top: 8, left: 8 }} />
          <TextField
            placeholder="Search notes..."
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2, paddingLeft: 3.5, height: 32, width: 220, fontSize: 13,
                bgcolor: '#f9fafb',
                '& fieldset': { borderColor: 'transparent' },
                '&:hover fieldset': { borderColor: '#e5e7eb' },
                '&.Mui-focused fieldset': { borderColor: '#3b82f6' }
              }
            }}
          />
        </Box>
      </Box>

      {/* Tag Filter Bar */}
      {allTags.length > 0 && (
        <Box sx={{ px: 3, py: 1.5, display: 'flex', gap: 0.75, flexWrap: 'wrap', borderBottom: '1px solid #f3f4f6', bgcolor: '#fafafa', flexShrink: 0 }}>
          <Chip
            label="All"
            size="small"
            onClick={() => setActiveTag(null)}
            sx={{
              height: 24, fontSize: 11, fontWeight: 600, borderRadius: '6px',
              bgcolor: activeTag === null ? '#1f2937' : '#f3f4f6',
              color: activeTag === null ? 'white' : '#6b7280',
              cursor: 'pointer',
              '&:hover': { bgcolor: activeTag === null ? '#374151' : '#e5e7eb' }
            }}
          />
          {allTags.map(tag => (
            <Chip
              key={tag}
              label={`#${tag}`}
              size="small"
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              sx={{
                height: 24, fontSize: 11, fontWeight: 600, borderRadius: '6px',
                bgcolor: activeTag === tag ? '#eff6ff' : '#f3f4f6',
                color: activeTag === tag ? '#2563eb' : '#6b7280',
                cursor: 'pointer',
                border: activeTag === tag ? '1px solid #bfdbfe' : '1px solid transparent',
                '&:hover': { bgcolor: '#eff6ff', color: '#2563eb' }
              }}
            />
          ))}
        </Box>
      )}

      {/* Table Header */}
      <Box sx={{ display: 'flex', px: 3, py: 1, borderBottom: '1px solid #e5e7eb', bgcolor: '#f9fafb', flexShrink: 0 }}>
        <Box sx={{ width: 32, mr: 1 }} />
        <Box sx={{ flex: 2 }}>
          <Typography variant="caption" fontWeight={600} sx={{ color: '#6b7280' }}>TITLE</Typography>
        </Box>
        <Box sx={{ flex: 3, display: { xs: 'none', md: 'block' } }}>
          <Typography variant="caption" fontWeight={600} sx={{ color: '#6b7280' }}>PREVIEW</Typography>
        </Box>
        <Box sx={{ width: 220 }}>
          <Typography variant="caption" fontWeight={600} sx={{ color: '#6b7280' }}>TAGS</Typography>
        </Box>
        <Box sx={{ width: 100, textAlign: 'right' }}>
          <Typography variant="caption" fontWeight={600} sx={{ color: '#6b7280' }}>UPDATED</Typography>
        </Box>
        <Box sx={{ width: 88 }} />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <Box>
            {[...Array(8)].map((_, i) => (
              <Box key={i} sx={{ display: 'flex', px: 3, py: 2, borderBottom: '1px solid #f3f4f6', alignItems: 'center', gap: 2 }}>
                <Skeleton variant="circular" width={20} height={20} />
                <Skeleton variant="text" width="25%" />
                <Skeleton variant="text" width="35%" sx={{ ml: 2 }} />
                <Skeleton variant="rounded" width={100} height={20} sx={{ ml: 'auto' }} />
              </Box>
            ))}
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>Failed to load knowledge base.</Alert>
        ) : filteredNotes.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 10, color: '#9ca3af' }}>
            <SearchIcon sx={{ fontSize: 60, opacity: 0.2, mb: 2 }} />
            <Typography variant="h6" color="text.secondary">No notes found</Typography>
            <Typography variant="body2" color="text.secondary">
              {searchQuery || activeTag ? 'Try adjusting your filters' : 'Create a note to get started!'}
            </Typography>
          </Box>
        ) : (
          filteredNotes.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
            />
          ))
        )}
      </Box>
      
      {/* Pagination */}
      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[25, 50, 100]}
        sx={{ borderTop: '1px solid #e5e7eb', flexShrink: 0 }}
      />

      {/* Create/Edit Dialog */}
      <NoteDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingNote(null); }}
        onSubmit={handleSubmit}
        initialData={editingNote ? {
            title: editingNote.title,
            content: editingNote.content,
            tags: editingNote.tags,
            isPinned: editingNote.isPinned
        } : undefined}
        isSubmitting={isSubmitting}
      />

      {/* View Dialog */}
      <Dialog open={Boolean(viewNote)} onClose={() => setViewNote(null)} maxWidth="md" fullWidth>
          {viewNote && (
              <>
                  <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" fontWeight={700}>{viewNote.title}</Typography>
                         {viewNote.isPinned && (
                            <Box component="span" sx={{ fontSize: 12, bgcolor: '#eff6ff', color: '#3b82f6', px: 1, py: 0.5, borderRadius: 1 }}>
                                Pinned
                            </Box>
                         )}
                      </Box>
                  </DialogTitle>
                  <DialogContent dividers>
                      <Box sx={{ mb: 2 }}>
                          {viewNote.tags.map(tag => (
                              <Box component="span" key={tag} sx={{ 
                                  mr: 1, bgcolor: '#f1f5f9', color: '#64748b',
                                  px: 1, py: 0.5, borderRadius: 1, fontSize: 12, fontWeight: 600
                              }}>
                                  #{tag}
                              </Box>
                          ))}
                      </Box>
                      <DialogContentText sx={{ whiteSpace: 'pre-wrap', color: '#374151', fontSize: 16, lineHeight: 1.6 }}>
                          {viewNote.content}
                      </DialogContentText>
                  </DialogContent>
                  <DialogActions>
                      <Button onClick={() => { if (viewNote) navigator.clipboard.writeText(viewNote.content); }}>
                          Copy Content
                      </Button>
                      <Button onClick={() => setViewNote(null)}>Close</Button>
                      <Button onClick={() => { setViewNote(null); handleEdit(viewNote); }} variant="contained" sx={{ bgcolor: '#0f172a' }}>
                        Edit
                      </Button>
                  </DialogActions>
              </>
          )}
      </Dialog>
    </Box>
  );
}

// ─── Row Component ───────────────────────────────────────────────────────────

function NoteRow({ note, onView, onEdit, onDelete, onTogglePin }: {
  note: KnowledgeNote;
  onView: (note: KnowledgeNote) => void;
  onEdit: (note: KnowledgeNote) => void;
  onDelete: (id: string) => void;
  onTogglePin: (note: KnowledgeNote) => void;
}) {
  const preview = note.content.replace(/\n/g, ' ').slice(0, 100);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 3,
        py: 1.5,
        borderBottom: '1px solid #f3f4f6',
        bgcolor: note.isPinned ? '#fffbeb' : 'white',
        '&:hover': { bgcolor: note.isPinned ? '#fef3c7' : '#f9fafb', '& .note-actions': { opacity: 1 } },
        cursor: 'pointer',
      }}
      onClick={() => onView(note)}
    >
      {/* Pin indicator */}
      <Box sx={{ width: 32, mr: 1, display: 'flex', alignItems: 'center' }}>
        {note.isPinned && <PushPinIcon sx={{ fontSize: 14, color: '#f59e0b' }} />}
      </Box>

      {/* Title */}
      <Box sx={{ flex: 2 }}>
        <Typography variant="body2" fontWeight={600} sx={{ color: '#1f2937', fontSize: 14, lineHeight: 1.4 }}>
          {note.title}
        </Typography>
      </Box>

      {/* Preview */}
      <Box sx={{ flex: 3, display: { xs: 'none', md: 'block' }, mr: 2 }}>
        <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {preview}{note.content.length > 100 ? '...' : ''}
        </Typography>
      </Box>

      {/* Tags */}
      <Box sx={{ width: 220, display: 'flex', flexWrap: 'wrap', gap: 0.5, mr: 1 }}>
        {note.tags.slice(0, 3).map(tag => (
          <Box
            key={tag}
            component="span"
            sx={{
              px: 0.75, py: 0.25, bgcolor: '#f1f5f9', color: '#64748b',
              borderRadius: '4px', fontSize: 11, fontWeight: 600,
            }}
          >
            #{tag}
          </Box>
        ))}
        {note.tags.length > 3 && (
          <Tooltip title={note.tags.slice(3).map(t => `#${t}`).join(', ')}>
            <Box component="span" sx={{ px: 0.75, py: 0.25, bgcolor: '#f3f4f6', color: '#9ca3af', borderRadius: '4px', fontSize: 11, fontWeight: 600 }}>
              +{note.tags.length - 3}
            </Box>
          </Tooltip>
        )}
      </Box>

      {/* Date */}
      <Box sx={{ width: 100, textAlign: 'right' }}>
        <Typography variant="caption" sx={{ color: '#9ca3af' }}>
          {format(new Date(note.updatedAt), 'MMM d, yyyy')}
        </Typography>
      </Box>

      {/* Actions */}
      <Box
        className="note-actions"
        sx={{ width: 88, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Tooltip title={note.isPinned ? 'Unpin' : 'Pin'}>
          <IconButton size="small" onClick={() => onTogglePin(note)}>
            {note.isPinned
              ? <PushPinIcon sx={{ fontSize: 15, color: '#f59e0b' }} />
              : <PushPinOutlinedIcon sx={{ fontSize: 15, color: '#9ca3af' }} />
            }
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(note)}>
            <EditOutlinedIcon sx={{ fontSize: 15, color: '#6b7280' }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" onClick={() => onDelete(note.id)}>
            <DeleteOutlineIcon sx={{ fontSize: 15, color: '#ef4444' }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
