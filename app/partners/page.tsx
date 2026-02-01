'use client';

import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  TextField,
  Divider,
  IconButton,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import PartnersList from './components/PartnersList';
import PartnerDialog from './components/PartnerDialog';
import { CreatePartnerInput } from '@/app/lib/validations/partner';
import { Partner } from './types';
import { useDebounce } from '@/app/lib/hooks/useDebounce';

const STATUS_FILTERS = ['All', 'DRAFT', 'ONBOARDING', 'LIVE', 'MAINTENANCE', 'SUSPENDED'];

export default function PartnersPage() {
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  
  // Pagination & Sort State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [orderBy, setOrderBy] = useState('updatedAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const queryClient = useQueryClient();

  // Fetch partners
  const { data: response, isLoading, error } = useQuery<{ data: Partner[], meta: any }>({
    queryKey: ['partners', page, limit, orderBy, order, statusFilter, debouncedSearchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: orderBy,
        order: order,
        search: debouncedSearchQuery,
      });
      if (statusFilter !== 'All') params.append('status', statusFilter);
      
      const res = await axios.get(`/api/partners?${params.toString()}`);
      return res.data;
    },
    placeholderData: (previousData) => previousData,
  });

  const partners = response?.data || [];
  const meta = response?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

  // Helper for Sorting
  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  
  // Mutations (Create/Update/Delete)
  const createMutation = useMutation({
    mutationFn: async (data: CreatePartnerInput) => {
      const response = await axios.post('/api/partners', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      setDialogOpen(false);
      setEditingPartner(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreatePartnerInput }) => {
      const response = await axios.put(`/api/partners/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      setDialogOpen(false);
      setEditingPartner(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/partners/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });

  const handleCreateClick = () => {
    setEditingPartner(null);
    setDialogOpen(true);
  };

  const handleEditClick = (partner: Partner) => {
    setEditingPartner(partner);
    setDialogOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm('Delete this partner?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (data: CreatePartnerInput) => {
    if (editingPartner) {
      updateMutation.mutate({ id: editingPartner.id, data });
    } else {
      createMutation.mutate(data);
    }
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
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
             {/* Title */}
             <Typography variant="h6" fontWeight={700} sx={{ color: '#1f2937' }}>
                Partners
             </Typography>
             
             {/* Add Button */}
             <Button
                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                onClick={handleCreateClick}
                variant="outlined"
                size="small"
                sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 2,
                    borderColor: '#e5e7eb',
                    color: '#374151',
                    '&:hover': { bgcolor: '#f9fafb', borderColor: '#d1d5db' }
                }}
             >
                Add Partner
             </Button>

             <Divider orientation="vertical" flexItem sx={{ height: 24, alignSelf: 'center' }} />

             {/* Use Filter Tabs for Status */}
             <Box sx={{ display: 'flex', gap: 0.5 }}>
                 {STATUS_FILTERS.map(status => {
                     const isActive = statusFilter === status;
                     return (
                         <Box
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            sx={{
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 1.5,
                                cursor: 'pointer',
                                fontSize: 13,
                                fontWeight: isActive ? 600 : 500,
                                color: isActive ? '#1f2937' : '#6b7280',
                                bgcolor: isActive ? '#f3f4f6' : 'transparent',
                                '&:hover': { bgcolor: '#f3f4f6', color: '#1f2937' }
                            }}
                         >
                             {status}
                         </Box>
                     )
                 })}
             </Box>
        </Box>
        
        {/* Right Action: Search */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 0.5 }}>
             <Box sx={{ position: 'relative' }}>
                 <SearchIcon sx={{ fontSize: 18, color: '#9ca3af', position: 'absolute', top: 8, left: 8 }} />
                 <TextField
                    placeholder="Search partners..."
                    variant="outlined"
                    size="small"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    sx={{ 
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            paddingLeft: 3.5,
                            height: 32,
                            width: 200,
                            fontSize: 13,
                            bgcolor: '#f9fafb',
                            '& fieldset': { borderColor: 'transparent' },
                            '&:hover fieldset': { borderColor: '#e5e7eb' },
                            '&.Mui-focused fieldset': { borderColor: '#3b82f6' }
                        }
                    }}
                 />
             </Box>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 0 }}>
        {error && (
            <Alert severity="error" sx={{ m: 2 }}>Error loading partners</Alert>
        )}
        
        <PartnersList
          partners={partners}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          loading={isLoading}
          
          page={page}
          count={meta.total}
          rowsPerPage={limit}
          onPageChange={(e, newPage) => setPage(newPage + 1)}
          onRowsPerPageChange={(e) => {
              setLimit(parseInt(e.target.value, 10));
              setPage(1);
          }}
          
          sortBy={orderBy}
          sortOrder={order}
          onSort={handleSort}
        />
      </Box>

      {/* Drawer */}
      <PartnerDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingPartner(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingPartner ? {
            ...editingPartner,
            integrator: editingPartner.integrator || undefined,
            notes: editingPartner.notes || undefined,
            kanbanStage: editingPartner.kanbanStage || undefined,
            docStatus: editingPartner.docStatus || undefined,
        } : undefined}
        isSubmitting={isSubmitting}
        title={editingPartner ? 'Edit Partner' : 'New Partner'}
      />
    </Box>
  );
}
