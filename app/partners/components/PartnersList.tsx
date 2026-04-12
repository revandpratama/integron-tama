'use client';

import {
  Box,
  Typography,
  IconButton,
  Chip,
  Menu,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  TablePagination,
  TableSortLabel,
  Tooltip,
  Button,
} from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useTheme, alpha } from '@mui/material/styles';
import { useColorMode } from '@/app/providers/ThemeProvider';
import { Partner } from '../types';
import { format } from 'date-fns';
import { useState } from 'react';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ONBOARDING: { label: 'Onboarding', color: '#8b5cf6' },
  DRAFT: { label: 'Draft', color: '#3b82f6' },
  LIVE: { label: 'Live', color: '#059669' },
  MAINTENANCE: { label: 'Maintenance', color: '#f59e0b' },
  SUSPENDED: { label: 'Suspended', color: '#ef4444' },
  DEFAULT: { label: 'Unknown', color: '#6b7280' },
};

const CATEGORY_COLOR: Record<string, string> = {
  SNAP:     '#3b82f6',
  NON_SNAP: '#8b5cf6',
};

interface PartnersListProps {
  partners: Partner[];
  onEdit: (partner: Partner) => void;
  onDelete: (id: string) => void;
  onStartOnboarding: (id: string) => void;
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
    onStartOnboarding,
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
            borderBottom: '1px solid', 
            borderColor: 'divider',
            bgcolor: 'background.default',
            color: 'text.secondary',
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

            <Box sx={{ flex: 1.5 }}>
                <Typography variant="caption" fontWeight={600}>FEATURES</Typography>
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

            <Box sx={{ width: 180 }} /> {/* Action placeholder */}
        </Box>

        {/* List Content */}
        {partners.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.disabled' }}>
                <Typography variant="body2">{loading ? 'Loading...' : 'No partners found'}</Typography>
            </Box>
        ) : (
            partners.map(partner => (
                <PartnerRow key={partner.id} partner={partner} onEdit={onEdit} onDelete={onDelete} onStartOnboarding={onStartOnboarding} />
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
            sx={{ borderTop: '1px solid', borderColor: 'divider' }}
        />
    </Box>
  );
}

function PartnerRow({ partner, onEdit, onDelete, onStartOnboarding }: { 
    partner: Partner; 
    onEdit: any; 
    onDelete: any;
    onStartOnboarding: (id: string) => void;
}) {
  const theme = useTheme();
  const { mode } = useColorMode();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const statusConfig = STATUS_CONFIG[partner.status] || STATUS_CONFIG.DEFAULT;
  const features = partner.features || [];
  const visibleFeatures = features.slice(0, 2);
  const extraCount = features.length - visibleFeatures.length;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        py: 1.5,
        px: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        '&:hover': { bgcolor: 'action.hover', '& .row-actions': { opacity: 1 } },
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
                bgcolor: alpha(statusConfig.color, 0.1), 
                color: statusConfig.color,
                borderRadius: '6px'
            }} 
          />
      </Box>

      {/* Name */}
      <Typography variant="body2" sx={{ flex: 1, fontWeight: 500, color: 'text.primary', fontSize: 14 }}>
        {partner.name}
      </Typography>

      {/* Features */}
      <Box sx={{ flex: 1.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, mr: 1 }}>
        {features.length === 0 ? (
          <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>—</Typography>
        ) : (
          <>
            {visibleFeatures.map(f => {
              const color = CATEGORY_COLOR[f.category] || '#6b7280';
              return (
                <Chip
                  key={f.id}
                  label={f.name}
                  size="small"
                  sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: alpha(color, 0.1), color: color, borderRadius: '4px' }}
                />
              );
            })}
            {extraCount > 0 && (
              <Tooltip title={features.slice(2).map(f => f.name).join(', ')}>
                <Chip
                  label={`+${extraCount}`}
                  size="small"
                  sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: 'action.hover', color: 'text.secondary', borderRadius: '4px', cursor: 'default' }}
                />
              </Tooltip>
            )}
          </>
        )}
      </Box>

      {/* Notes */}
      <Typography variant="body2" sx={{ flex: 1, color: 'text.secondary', fontSize: 13, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', mr: 2 }}>
        {partner.notes || '-'}
      </Typography>

      {/* Integrator / Assignees */}
      <Box sx={{ width: 150, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
           {partner.integrator ? (
               <Chip 
                   size="small" 
                   icon={<PersonOutlineIcon sx={{ fontSize: '16px !important' }} />} 
                   label={partner.integrator.name || partner.integrator.email || 'User'} 
                   sx={{ bgcolor: 'action.hover', color: 'text.primary', fontWeight: 500 }} 
               />
           ) : (
               <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>Unassigned</Typography>
           )}
      </Box>

      {/* Date */}
      <Box sx={{ width: 100, textAlign: 'right', mr: 2 }}>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
           {partner.updatedAt ? format(new Date(partner.updatedAt), 'MMM d') : '-'}
        </Typography>
      </Box>

      {/* Actions */}
      <Box 
        className="row-actions" 
        sx={{ 
            opacity: partner.status === 'DRAFT' ? 1 : 0, 
            width: 180, 
            display: 'flex', 
            justifyContent: 'flex-end', 
            alignItems: 'center', 
            mr: 1, 
            gap: 1 
        }}
      >
        {partner.status === 'DRAFT' && (
            <Button 
                variant="contained" 
                size="small" 
                color="primary"
                startIcon={<PlayArrowIcon sx={{ fontSize: 14 }} />}
                onClick={(e) => { e.stopPropagation(); onStartOnboarding(partner.id); }}
                sx={{ 
                    textTransform: 'none', 
                    borderRadius: '100px', 
                    height: 28, 
                    fontSize: 11, 
                    fontWeight: 700, 
                    boxShadow: mode === 'light' ? '0 1px 2px rgba(59, 130, 246, 0.3)' : 'none',
                    px: 1.5,
                    bgcolor: 'primary.main',
                    '&:hover': { bgcolor: 'primary.dark', boxShadow: mode === 'light' ? '0 2px 4px rgba(37, 99, 235, 0.4)' : 'none' }
                }}
            >
                Start Onboarding
            </Button>
        )}
        <IconButton 
            size="small" 
            onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); }}
            sx={{ 
                bgcolor: 'transparent',
                '&:hover': { bgcolor: 'action.hover' }
            }}
        >
          <MoreHorizIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
        </IconButton>
        <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            onClick={(e) => e.stopPropagation()}
            PaperProps={{ sx: { boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1)', borderRadius: 2, mt: 0.5 } }}
        >
            <MenuItem onClick={() => { onEdit(partner); setAnchorEl(null); }} sx={{ fontSize: 13, py: 1, px: 2 }}>Edit Details</MenuItem>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem onClick={() => { onDelete(partner.id); setAnchorEl(null); }} sx={{ fontSize: 13, py: 1, px: 2, color: 'error.main' }}>Delete Partner</MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}
