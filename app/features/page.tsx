'use client';

import {
  Box,
  Typography,
  Button,
  TextField,
  Divider,
  Alert,
  TablePagination,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import FeaturesList from './components/FeaturesList';
import FeatureDialog from './components/FeatureDialog';
import { CreateFeatureInput, Feature } from '@/app/lib/validations/feature';
import { useDebounce } from '@/app/lib/hooks/useDebounce';

const CATEGORY_FILTERS = ['All', 'SNAP', 'NON_SNAP'];

interface FeaturesResponse {
  data: Feature[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function FeaturesPage() {
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  const [page, setPage] = useState(0); // MUI TablePagination is 0-indexed
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);

  const queryClient = useQueryClient();

  // Fetch
  const { data: response, isLoading, error } = useQuery<FeaturesResponse>({
    queryKey: ['features', page, rowsPerPage, debouncedSearchQuery, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (page + 1).toString(), // API is 1-indexed
        limit: rowsPerPage.toString(),
        search: debouncedSearchQuery,
      });
      
      if (categoryFilter !== 'All') {
        params.append('category', categoryFilter);
      }

      const res = await axios.get(`/api/features?${params.toString()}`);
      return res.data;
    },
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new
  });

  const features = response?.data || [];
  const totalCount = response?.meta.total || 0;

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: CreateFeatureInput) => {
      const response = await axios.post('/api/features', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      setDialogOpen(false);
      setEditingFeature(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateFeatureInput }) => {
      const response = await axios.put(`/api/features/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      setDialogOpen(false);
      setEditingFeature(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/features/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
    },
  });

  const handleCreateClick = () => {
    setEditingFeature(null);
    setDialogOpen(true);
  };

  const handleEditClick = (feature: Feature) => {
    setEditingFeature(feature);
    setDialogOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm('Delete this feature?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleNoteUpdate = (feature: Feature, newNotes: string) => {
      const payload: CreateFeatureInput = {
          name: feature.name,
          category: feature.category,
          apigeeProducts: feature.apigeeProducts,
          apigeeTraceProxies: feature.apigeeTraceProxies,
          notes: newNotes,
      };
      updateMutation.mutate({ id: feature.id, data: payload });
  };

  const handleSubmit = (data: CreateFeatureInput) => {
    if (editingFeature) {
      updateMutation.mutate({ id: editingFeature.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const isSubmitting = createMutation.isPending && dialogOpen;

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
                Integration Catalog (Paginated)
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
                Add Feature
             </Button>

             <Divider orientation="vertical" flexItem sx={{ height: 24, alignSelf: 'center' }} />

             {/* Category Filters */}
             <Box sx={{ display: 'flex', gap: 0.5 }}>
                 {CATEGORY_FILTERS.map(cat => {
                     const isActive = categoryFilter === cat;
                     return (
                         <Box
                            key={cat}
                            onClick={() => { setCategoryFilter(cat); setPage(0); }}
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
                             {cat.replace('_', '-')}
                         </Box>
                     )
                 })}
             </Box>
        </Box>
        
        {/* Search */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 0.5 }}>
             <Box sx={{ position: 'relative' }}>
                 <SearchIcon sx={{ fontSize: 18, color: '#9ca3af', position: 'absolute', top: 8, left: 8 }} />
                 <TextField
                    placeholder="Search features..."
                    variant="outlined"
                    size="small"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                    sx={{ 
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            paddingLeft: 3.5,
                            height: 32,
                            width: 240,
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
            <Alert severity="error" sx={{ m: 2 }}>Error loading features</Alert>
        )}
        
        <FeaturesList
          features={features}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onNoteUpdate={handleNoteUpdate} // Connect update handler
          loading={isLoading}
          
          page={page}
          count={totalCount}
          rowsPerPage={rowsPerPage}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      </Box>

      {/* Drawer */}
      <FeatureDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingFeature(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingFeature ? {
            ...editingFeature,
        } : undefined}
        isSubmitting={isSubmitting}
        title={editingFeature ? 'Edit Feature' : 'New Feature'}
      />
    </Box>
  );
}
