'use client';

import {
  Box,
  Typography,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  TablePagination,
} from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { Feature } from '@/app/lib/validations/feature';
import { format } from 'date-fns';
import { useState } from 'react';
import CodeIcon from '@mui/icons-material/Code'; // For SNAP
import ApiIcon from '@mui/icons-material/Api';   // For NON-SNAP

import FeatureNotes from './FeatureNotes';

interface FeaturesListProps {
  features: Feature[];
  onEdit: (feature: Feature) => void;
  onDelete: (id: string) => void;
  onNoteUpdate: (feature: Feature, notes: string) => void;
  loading?: boolean;

  // Pagination
  page: number;
  count: number;
  rowsPerPage: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function FeatureRow({ feature, onEdit, onDelete, onNoteUpdate }: { 
    feature: Feature; 
    onEdit: any; 
    onDelete: any;
    onNoteUpdate: (feature: Feature, notes: string) => void;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const isSnap = feature.category === 'SNAP';
  const categoryColor = isSnap ? '#10b981' : '#8b5cf6';
  const categoryBg = isSnap ? '#d1fae5' : '#ede9fe';

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
      {/* Category Chip */}
      <Box sx={{ width: 100, mr: 2 }}>
          <Chip
            icon={isSnap ? <CodeIcon sx={{ fontSize: 14 }} /> : <ApiIcon sx={{ fontSize: 14 }} />}
            label={feature.category.replace('_', '-')}
            size="small"
            sx={{
                height: 24,
                fontSize: 11,
                fontWeight: 600,
                bgcolor: categoryBg,
                color: categoryColor,
                borderRadius: '6px',
                '& .MuiChip-icon': { color: 'inherit', ml: 0.5 }
            }}
          />
      </Box>

      {/* Name & Notes */}
      <Box sx={{ flex: 1, minWidth: 200, mr: 2 }}>
          <Typography variant="body2" fontWeight={600} sx={{ color: '#1f2937', mb: 0.5 }}>
              {feature.name}
          </Typography>
          <FeatureNotes 
             initialNotes={feature.notes || ''} 
             onSave={(newNotes) => onNoteUpdate(feature, newNotes)}
          />
      </Box>

      {/* Technical Specs */}
      <Box sx={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5, mr: 2 }}>
           {feature.apigeeProducts.length > 0 && (
               <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                   <Typography variant="caption" sx={{ color: '#9ca3af', width: 60 }}>Products:</Typography>
                   <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                       {feature.apigeeProducts.map((p, i) => (
                           <Chip key={`${p}-${i}`} label={p} size="small" variant="outlined" sx={{ height: 20, fontSize: 10, borderRadius: 1 }} />
                       ))}
                   </Box>
               </Box>
           )}
           {feature.apigeeTraceProxies.length > 0 && (
               <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                   <Typography variant="caption" sx={{ color: '#9ca3af', width: 60 }}>Proxies:</Typography>
                   <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                       {feature.apigeeTraceProxies.map((p, i) => (
                           <Chip key={`${p}-${i}`} label={p} size="small" variant="outlined" sx={{ height: 20, fontSize: 10, borderRadius: 1, bgcolor: '#f1f5f9', border: 'none' }} />
                       ))}
                   </Box>
               </Box>
           )}
           {feature.apigeeProducts.length === 0 && feature.apigeeTraceProxies.length === 0 && (
               <Typography variant="caption" sx={{ color: '#d1d5db', fontStyle: 'italic' }}>No technical specs</Typography>
           )}
      </Box>

      {/* Date */}
      <Typography variant="caption" sx={{ width: 100, textAlign: 'right', color: '#6b7280', mr: 2 }}>
         {format(new Date(feature.updatedAt), 'MMM d')}
      </Typography>

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
            <MenuItem onClick={() => { onEdit(feature); setAnchorEl(null); }} sx={{ fontSize: 13 }}>Edit</MenuItem>
            <MenuItem onClick={() => { onDelete(feature.id); setAnchorEl(null); }} sx={{ fontSize: 13, color: 'error.main' }}>Delete</MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}

export default function FeaturesList({ 
    features, 
    onEdit, 
    onDelete, 
    onNoteUpdate, 
    loading,
    page,
    count,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange
}: FeaturesListProps) {
  return (
    <Box sx={{ pb: 10 }}>
        {/* Header */}
        <Box sx={{ 
            display: 'flex', 
            py: 1, 
            px: 2, 
            borderBottom: '1px solid #e5e7eb', 
            bgcolor: '#f9fafb',
            color: '#6b7280'
        }}>
            <Typography variant="caption" fontWeight={600} sx={{ width: 100, mr: 2 }}>CATEGORY</Typography>
            <Typography variant="caption" fontWeight={600} sx={{ flex: 1, minWidth: 200, mr: 2 }}>FEATURE NAME</Typography>
            <Typography variant="caption" fontWeight={600} sx={{ flex: 1.5, mr: 2 }}>TECHNICAL SPECS</Typography>
            <Typography variant="caption" fontWeight={600} sx={{ width: 100, textAlign: 'right', mr: 2 }}>UPDATED</Typography>
            <Box sx={{ width: 32 }} />
        </Box>

        {features.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: '#9ca3af' }}>
                <Typography variant="body2">{loading ? 'Loading...' : 'No features found'}</Typography>
            </Box>
        ) : (
            features.map(feature => (
                <FeatureRow 
                    key={feature.id} 
                    feature={feature} 
                    onEdit={onEdit} 
                    onDelete={onDelete}
                    onNoteUpdate={onNoteUpdate}
                />
            ))
        )}

        <TablePagination
            component="div"
            count={count}
            page={page}
            onPageChange={onPageChange}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={onRowsPerPageChange}
            rowsPerPageOptions={[10, 25, 50]}
            sx={{ borderTop: '1px solid #e5e7eb' }}
        />
    </Box>
  );
}
