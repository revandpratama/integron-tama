'use client';

import {
  Box,
  Typography,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  TablePagination,
  TableSortLabel,
} from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { Partner } from '../types';
import { format } from 'date-fns';
import { useState } from 'react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ONBOARDING: { label: 'Onboarding', color: '#8b5cf6', bg: '#ede9fe' },
  DRAFT: { label: 'Draft', color: '#3b82f6', bg: '#dbeafe' },
  LIVE: { label: 'Live', color: '#ef4444', bg: '#fee2e2' },
  BLOCKED: { label: 'Blocked', color: '#10b981', bg: '#d1fae5' },
  MAINTENANCE: { label: 'Maintenance', color: '#f59e0b', bg: '#fef3c7' },
  SUSPENDED: { label: 'Suspended', color: '#ef4444', bg: '#fecaca' },
  DEFAULT: { label: 'Unknown', color: '#6b7280', bg: '#f3f4f6' },
};

interface PartnersListProps {
  partners: Partner[];
  onEdit: (partner: Partner) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
  
  // Pagination
  page: number;
  count: number;
  rowsPerPage: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  
  // Sorting
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (property: string) => void;
}

export default function PartnersList({ 
    partners, 
    onEdit, 
    onDelete, 
    loading,
    page,
    count,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange,
    sortBy,
    sortOrder,
    onSort
}: PartnersListProps) {
  
  const createSortHandler = (property: string) => () => {
      onSort(property);
  };

  return (
    <Box sx={{ pb: 10 }}>
        {/* Table Header */}
        <Box sx={{ 
            display: 'flex', 
            py: 1, 
            px: 2, 
            borderBottom: '1px solid #e5e7eb', 
            bgcolor: '#f9fafb',
            color: '#6b7280',
            alignItems: 'center'
        }}>
            <Box sx={{ width: 120, mr: 2 }}>
                <TableSortLabel
                    active={sortBy === 'status'}
                    direction={sortBy === 'status' ? sortOrder : 'asc'}
                    onClick={createSortHandler('status')}
                >
                    <Typography variant="caption" fontWeight={600}>STATUS</Typography>
                </TableSortLabel>
            </Box>
            
            <Box sx={{ flex: 1 }}>
                <TableSortLabel
                    active={sortBy === 'name'}
                    direction={sortBy === 'name' ? sortOrder : 'asc'}
                    onClick={createSortHandler('name')}
                >
                    <Typography variant="caption" fontWeight={600}>NAME</Typography>
                </TableSortLabel>
            </Box>

             <Box sx={{ flex: 1 }}>
                <Typography variant="caption" fontWeight={600}>NOTES</Typography>
            </Box>

            <Box sx={{ width: 150 }}>
                <TableSortLabel
                    active={sortBy === 'integrator'}
                    direction={sortBy === 'integrator' ? sortOrder : 'asc'}
                    onClick={createSortHandler('integrator')}
                >
                    <Typography variant="caption" fontWeight={600}>INTEGRATOR</Typography>
                </TableSortLabel>
            </Box>

            <Box sx={{ width: 100, textAlign: 'right', mr: 2 }}>
                <TableSortLabel
                    active={sortBy === 'updatedAt'}
                    direction={sortBy === 'updatedAt' ? sortOrder : 'asc'}
                    onClick={createSortHandler('updatedAt')}
                >
                    <Typography variant="caption" fontWeight={600}>UPDATED</Typography>
                </TableSortLabel>
            </Box>

            <Box sx={{ width: 32 }} /> {/* Action placeholder */}
        </Box>

        {/* List Content */}
        {partners.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: '#9ca3af' }}>
                <Typography variant="body2">{loading ? 'Loading...' : 'No partners found'}</Typography>
            </Box>
        ) : (
            partners.map(partner => (
                <PartnerRow key={partner.id} partner={partner} onEdit={onEdit} onDelete={onDelete} />
            ))
        )}
        
        {/* Pagination */}
        <TablePagination
            component="div"
            count={count}
            page={page - 1} // MUI is 0-indexed
            onPageChange={onPageChange}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={onRowsPerPageChange}
            rowsPerPageOptions={[5, 10, 25]}
            sx={{ borderTop: '1px solid #e5e7eb' }}
        />
    </Box>
  );
}

function PartnerRow({ partner, onEdit, onDelete }: { partner: Partner; onEdit: any; onDelete: any }) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const statusConfig = STATUS_CONFIG[partner.status] || STATUS_CONFIG.DEFAULT;

  const handleOpenUrl = (url?: string) => {
      if (url) window.open(url, '_blank');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        py: 1.5,
        px: 2,
        borderBottom: '1px solid #f3f4f6',
        bgcolor: 'white',
        '&:hover': { bgcolor: '#f9fafb', '& .row-actions': { opacity: 1 } },
      }}
    >
      {/* Status Chip */}
      <Box sx={{ width: 120, mr: 2 }}>
          <Chip 
            label={statusConfig.label} 
            size="small" 
            sx={{ 
                height: 24, 
                fontSize: 11, 
                fontWeight: 600, 
                bgcolor: statusConfig.bg, 
                color: statusConfig.color,
                borderRadius: '6px'
            }} 
          />
      </Box>

      {/* Name */}
      <Typography variant="body2" sx={{ flex: 1, fontWeight: 500, color: '#1f2937', fontSize: 14 }}>
        {partner.name}
      </Typography>

      {/* Notes */}
      <Typography variant="body2" sx={{ flex: 1, color: '#6b7280', fontSize: 13, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', mr: 2 }}>
        {partner.notes || '-'}
      </Typography>

      {/* Integrator / Assignees */}
      <Box sx={{ width: 150, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
           {partner.integrator ? (
               <Typography variant="caption" fontWeight={600} sx={{ color: '#4b5563' }}>
                   {partner.integrator}
               </Typography>
           ) : (
               <Typography variant="caption" sx={{ color: '#9ca3af', fontStyle: 'italic' }}>Unassigned</Typography>
           )}
      </Box>

      {/* Date */}
      <Box sx={{ width: 100, textAlign: 'right', mr: 2 }}>
        <Typography variant="caption" sx={{ color: '#6b7280' }}>
           {partner.updatedAt ? format(new Date(partner.updatedAt), 'MMM d') : '-'}
        </Typography>
      </Box>

      {/* Actions */}
      <Box className="row-actions" sx={{ opacity: 0, width: 32, display: 'flex', justifyContent: 'center' }}>
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <MoreHorizIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
        </IconButton>
        <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            PaperProps={{ sx: { boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', borderRadius: 2 } }}
        >
            <MenuItem onClick={() => { onEdit(partner); setAnchorEl(null); }} sx={{ fontSize: 13 }}>Edit</MenuItem>
            <MenuItem onClick={() => { onDelete(partner.id); setAnchorEl(null); }} sx={{ fontSize: 13, color: 'error.main' }}>Delete</MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}
