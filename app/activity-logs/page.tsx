'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Box,
  Typography,
  Card,
  TextField,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Chip,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { format } from 'date-fns';

export default function ActivityLogPage() {
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState('');
  const [entityType, setEntityType] = useState('');
  const [userId, setUserId] = useState('');
  const [broadSearch, setBroadSearch] = useState(false);
  
  // fetch users for dropdown
  const { data: users } = useQuery<{id: string, name: string | null, email: string}[]>({
      queryKey: ['users'],
      queryFn: async () => {
          const res = await axios.get('/api/users');
          return res.data;
      }
  });
  
  // debounced search text
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [modalData, setModalData] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['activity-logs', paginationModel.page, paginationModel.pageSize, debouncedSearch, actionType, entityType, userId, broadSearch],
    queryFn: async () => {
      const res = await axios.get('/api/logs', {
        params: {
          page: paginationModel.page,
          pageSize: paginationModel.pageSize,
          search: debouncedSearch,
          actionType,
          entityType,
          userId,
          broadSearch,
        }
      });
      return res.data; // { data: [...], total: number }
    },
    placeholderData: (prev) => prev,
  });

  const columns: GridColDef[] = [
    { 
      field: 'createdAt', 
      headerName: 'Time', 
      width: 200,
      renderCell: (params) => (
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, mt: 1.5 }}>
             {format(new Date(params.row.createdAt), 'MMM d, yyyy HH:mm:ss')}
          </Typography>
      )
    },
    { 
      field: 'userName', 
      headerName: 'User', 
      width: 240,
      renderCell: (params) => {
         const name = params.value || '-';
         return (
          <Box display="flex" alignItems="center" gap={1.5} height="100%">
              <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}>
                  {name.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="body2" fontWeight={600} color="text.primary">{name}</Typography>
          </Box>
         );
      }
    },
    { 
      field: 'actionType', 
      headerName: 'Action', 
      width: 220,
      renderCell: (params) => {
          const getActionStyle = (action: string) => {
              if (action.includes('CREATE')) return { bgcolor: '#e6f4ea', color: '#137333', border: '1px solid #ceead6' };
              if (action.includes('UPDATE')) return { bgcolor: '#e8f0fe', color: '#1a73e8', border: '1px solid #d2e3fc' };
              if (action.includes('DELETE')) return { bgcolor: '#fce8e6', color: '#c5221f', border: '1px solid #fad2cf' };
              if (action.includes('PIN')) return { bgcolor: '#fef7e0', color: '#b06000', border: '1px solid #feefc3' };
              return { bgcolor: '#f1f3f4', color: '#3c4043', border: '1px solid #dadce0' };
          };
          return (
              <Box display="flex" alignItems="center" height="100%">
                  <Chip 
                      label={params.value.replace('_', ' ')} 
                      size="small" 
                      sx={{ fontWeight: 600, borderRadius: '6px', ...getActionStyle(params.value) }}
                  />
              </Box>
          );
      }
    },
    { 
      field: 'entityType', 
      headerName: 'Entity Type', 
      width: 140,
      renderCell: (params) => (
          <Typography variant="body2" sx={{ textTransform: 'capitalize', fontWeight: 600, color: 'text.secondary', mt: 1.5 }}>
              {params.value}
          </Typography>
      )
    },
    { field: 'entityId', headerName: 'Entity ID', width: 140 },
    { 
        field: 'metadata', 
        headerName: 'What Changed', 
        flex: 2,
        minWidth: 400,
        renderCell: (params) => {
            if (!params.row.metadata || Object.keys(params.row.metadata).length === 0) return <span style={{ color: 'gray' }}>None</span>;

            const formatSummary = (action: string, meta: any) => {
                if (action.startsWith('CREATE_')) return `Created: ${meta.name || meta.title || 'Item'}`;
                if (action.startsWith('DELETE_')) return `Deleted: ${meta.name || meta.title || 'Item'}`;
                if (action.startsWith('UPDATE_') && meta.updatedFields) return `Updated: ${meta.updatedFields.join(', ')}`;
                if (action === 'PIN_KNOWLEDGE') return meta.isPinned ? 'Pinned to Dashboard' : 'Unpinned from Dashboard';
                if (action === 'UPDATE_PARTNER_STATUS') return `Status changed from ${meta.from || 'unknown'} to ${meta.to || 'unknown'}`;
                if (action === 'MOVE_PARTNER') return `Stage moved from ${meta.from || 'unknown'} to ${meta.to || 'unknown'}`;
                if (meta.notes) return 'Notes updated';
                return 'Details updated';
            };
            
            const summaryString = formatSummary(params.row.actionType, params.row.metadata);

            return (
                <Box display="flex" alignItems="center" justifyContent="space-between" width="100%" height="100%">
                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                        {summaryString}
                    </Typography>
                    <Button 
                        size="small" 
                        variant="outlined" 
                        sx={{ minWidth: 'auto', p: '2px 10px', borderRadius: '6px', ml: 2, textTransform: 'none', fontWeight: 600 }} 
                        onClick={() => setModalData(params.row.metadata)}
                    >
                        Raw JSON
                    </Button>
                </Box>
            );
        }
    },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setDebouncedSearch(search);
      setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  return (
    <Box p={4} sx={{ maxWidth: 1600, margin: '0 auto' }}>
      <Typography variant="h4" fontWeight={800} gutterBottom sx={{ letterSpacing: '-0.5px', color: '#111827', mb: 4 }}>
        System Activity Audit
      </Typography>

      <Card sx={{ p: 3, mb: 4, borderRadius: 3, boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.03)', border: '1px solid #f3f4f6' }}>
        <Box component="form" onSubmit={handleSearchSubmit} display="flex" gap={2} flexWrap="wrap">
            <TextField 
                label="Search" 
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ flexGrow: 1, minWidth: 200 }}
            />
            <TextField 
                select
                label="Action Type"
                size="small"
                value={actionType}
                onChange={(e) => { setActionType(e.target.value); setPaginationModel(prev => ({ ...prev, page: 0 })); }}
                sx={{ minWidth: 200 }}
            >
                <MenuItem value="">All Actions</MenuItem>
                <MenuItem value="CREATE_PARTNER">Create Partner</MenuItem>
                <MenuItem value="UPDATE_PARTNER">Update Partner</MenuItem>
                <MenuItem value="DELETE_PARTNER">Delete Partner</MenuItem>
                <MenuItem value="CREATE_PERSON">Create Person</MenuItem>
                <MenuItem value="UPDATE_PERSON">Update Person</MenuItem>
                <MenuItem value="DELETE_PERSON">Delete Person</MenuItem>
                <MenuItem value="CREATE_FEATURE">Create Feature</MenuItem>
                <MenuItem value="UPDATE_FEATURE">Update Feature</MenuItem>
                <MenuItem value="DELETE_FEATURE">Delete Feature</MenuItem>
                <MenuItem value="CREATE_KNOWLEDGE">Create Note</MenuItem>
                <MenuItem value="UPDATE_KNOWLEDGE">Update Note</MenuItem>
                <MenuItem value="PIN_KNOWLEDGE">Pin Note</MenuItem>
                <MenuItem value="DELETE_KNOWLEDGE">Delete Note</MenuItem>
            </TextField>
            <TextField 
                select
                label="Entity Type"
                size="small"
                value={entityType}
                onChange={(e) => { setEntityType(e.target.value); setPaginationModel(prev => ({ ...prev, page: 0 })); }}
                sx={{ minWidth: 200 }}
            >
                <MenuItem value="">All Entities</MenuItem>
                <MenuItem value="partner">Partner</MenuItem>
                <MenuItem value="feature">Feature</MenuItem>
                <MenuItem value="people">People</MenuItem>
                <MenuItem value="knowledge">Knowledge Base</MenuItem>
            </TextField>
            <TextField 
                select
                label="User"
                size="small"
                value={userId}
                onChange={(e) => { setUserId(e.target.value); setPaginationModel(prev => ({ ...prev, page: 0 })); }}
                sx={{ minWidth: 200 }}
            >
                <MenuItem value="">All Users</MenuItem>
                {users?.map(u => (
                     <MenuItem key={u.id} value={u.id}>{u.name || u.email}</MenuItem>
                ))}
            </TextField>
            <Box display="flex" alignItems="center" pl={1} mr="auto">
                <FormControlLabel 
                    control={<Checkbox checked={broadSearch} onChange={(e) => { setBroadSearch(e.target.checked); setPaginationModel(prev => ({ ...prev, page: 0 })); }} size="small" />} 
                    label={<Typography variant="body2" fontWeight={600} color="text.secondary">Deep Search</Typography>}
                />
            </Box>
            <Button type="submit" variant="contained" sx={{ px: 4, borderRadius: 2, fontWeight: 600, boxShadow: 'none', '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } }}>Apply Filters</Button>
            <Button variant="outlined" onClick={() => refetch()} sx={{ px: 3, borderRadius: 2, fontWeight: 600 }}>Refresh</Button>
        </Box>
      </Card>

      <Card sx={{ height: 650, borderRadius: 3, boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.04)', border: '1px solid #f3f4f6' }}>
        <DataGrid
          rows={data?.data || []}
          columns={columns}
          rowCount={data?.total || 0}
          loading={isLoading}
          paginationModel={paginationModel}
          paginationMode="server"
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          rowHeight={60}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#ffffff',
                borderBottom: '2px solid #f3f4f6',
                color: '#6b7280',
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
            },
            '& .MuiDataGrid-cell': {
                borderBottom: '1px solid #f9fafb',
            },
            '& .MuiDataGrid-row:hover': {
                backgroundColor: '#f9fafb',
            },
            '& .MuiDataGrid-footerContainer': {
                borderTop: '2px solid #f3f4f6',
            }
          }}
        />
      </Card>

      <Dialog open={!!modalData} onClose={() => setModalData(null)} maxWidth="sm" fullWidth>
          <DialogTitle>Metadata Details</DialogTitle>
          <DialogContent dividers>
              <Box component="pre" sx={{ bgcolor: '#f3f4f6', p: 2, borderRadius: 1, overflowX: 'auto', fontSize: 13, m: 0 }}>
                  {JSON.stringify(modalData, null, 2)}
              </Box>
          </DialogContent>
          <DialogActions>
              <Button onClick={() => setModalData(null)}>Close</Button>
          </DialogActions>
      </Dialog>
    </Box>
  );
}
