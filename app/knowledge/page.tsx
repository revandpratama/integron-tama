'use client';

import {
  Box,
  Typography,
  Button,
  Grid,
  TextField,
  InputAdornment,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  TablePagination,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { KnowledgeNote, CreateNoteInput } from './types';
import NoteCard from './components/NoteCard';
import NoteDialog from './components/NoteDialog';
import { useDebounce } from '@/app/lib/hooks/useDebounce';

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
  
  const [page, setPage] = useState(0); // MUI is 0-indexed
  const [rowsPerPage, setRowsPerPage] = useState(12); // Grid 3x4 or 4x3

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<KnowledgeNote | null>(null);
  const [viewNote, setViewNote] = useState<KnowledgeNote | null>(null);

  const queryClient = useQueryClient();

  // Fetch Notes
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
  });

  const notes = response?.data || [];
  const totalCount = response?.meta.total || 0;

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

  // View Details (Simple dialog for now)
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

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Box sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ color: '#111827' }}>
            Knowledge Base
          </Typography>
          <Typography variant="body1" sx={{ color: '#6b7280' }}>
            Tribal knowledge, tips, and documentation.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ bgcolor: '#0f172a', textTransform: 'none', borderRadius: 2 }}
          onClick={() => {
            setEditingNote(null);
            setDialogOpen(true);
          }}
        >
          New Note
        </Button>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          placeholder="Search by title, content, or #tag..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#9ca3af' }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => { setSearchQuery(''); setPage(0); }}>
                  <Box component="span" sx={{ fontSize: 20 }}>×</Box>
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'white',
              borderRadius: 3,
              '& fieldset': { borderColor: '#e5e7eb' },
              '&:hover fieldset': { borderColor: '#d1d5db' },
              '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
            },
          }}
        />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">Failed to load knowledge base.</Alert>
        ) : notes.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 10, color: '#9ca3af' }}>
            <SearchIcon sx={{ fontSize: 60, opacity: 0.2, mb: 2 }} />
            <Typography variant="h6" color="text.secondary">No notes found</Typography>
            <Typography variant="body2" color="text.secondary">
                {searchQuery ? 'Try adjusting your search terms' : 'Create a note to get started!'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
              xl: 'repeat(5, 1fr)'
            },
            gap: 3 
          }}>
            {notes.map((note) => (
              <Box key={note.id} sx={{ minWidth: 0 }}>
                <NoteCard
                  note={note}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onClick={handleView}
                  onTogglePin={handleTogglePin}
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>
      
      {/* Pagination */}
      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={handlePageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={[12, 24, 48]}
        sx={{ borderTop: '1px solid #e5e7eb', mt: 2 }}
      />

      {/* Create/Edit Dialog */}
      <NoteDialog
        open={dialogOpen}
        onClose={() => {
            setDialogOpen(false);
            setEditingNote(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingNote ? {
            title: editingNote.title,
            content: editingNote.content,
            tags: editingNote.tags,
            isPinned: editingNote.isPinned
        } : undefined}
        isSubmitting={isSubmitting}
      />

      {/* specific View Dialog (Optional, but nice for reading long content) */}
      <Dialog 
        open={Boolean(viewNote)} 
        onClose={() => setViewNote(null)}
        maxWidth="md"
        fullWidth
      >
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
                                  mr: 1, 
                                  bgcolor: '#f1f5f9', 
                                  color: '#64748b', 
                                  px: 1, 
                                  py: 0.5, 
                                  borderRadius: 1, 
                                  fontSize: 12,
                                  fontWeight: 600
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
                      <Button onClick={() => {
                          if (viewNote) {
                            navigator.clipboard.writeText(viewNote.content);
                            // Optional: Show toast
                          }
                      }}>
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
