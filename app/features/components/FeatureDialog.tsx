'use client';

import {
  Drawer,
  IconButton,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
  Button,
  Stack,
  alpha,
  TextField,
  MenuItem,
  Chip,
  InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { CreateFeatureInput } from '@/app/lib/validations/feature';
import { useState, useEffect } from 'react';

interface FeatureDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFeatureInput) => void;
  initialData?: Partial<CreateFeatureInput>;
  isSubmitting: boolean;
  title: string;
}

// Helper for Array Inputs
function ArrayInput({ 
    label, 
    values, 
    onChange, 
    placeholder 
}: { 
    label: string, 
    values: string[], 
    onChange: (vals: string[]) => void,
    placeholder: string
}) {
    const [newItem, setNewItem] = useState('');

    const handleAdd = () => {
        if (newItem.trim()) {
            onChange([...values, newItem.trim()]);
            setNewItem('');
        }
    };

    const handleRemove = (index: number) => {
        const newValues = [...values];
        newValues.splice(index, 1);
        onChange(newValues);
    };

    return (
        <Stack spacing={1}>
            <Typography variant="caption" fontWeight={600} color="text.secondary">
                {label}
            </Typography>
            <Stack spacing={1}>
                {values.map((val, idx) => (
                    <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                         <TextField
                            fullWidth
                            size="small"
                            value={val}
                            InputProps={{
                                readOnly: true,
                                sx: { bgcolor: '#f1f5f9', fontSize: 13 }
                            }}
                         />
                         <IconButton size="small" onClick={() => handleRemove(idx)} color="error">
                             <DeleteIcon fontSize="small" />
                         </IconButton>
                    </Box>
                ))}
            </Stack>
            <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder={placeholder}
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAdd();
                        }
                    }}
                    sx={{
                        '& .MuiInputBase-root': { fontSize: 13 }
                    }}
                />
                <Button 
                    variant="outlined" 
                    sx={{ minWidth: 40, px: 0 }}
                    onClick={handleAdd}
                    disabled={!newItem.trim()}
                >
                    <AddIcon fontSize="small" />
                </Button>
            </Box>
        </Stack>
    )
}

function FeatureForm({ initialData, onSubmit, isSubmitting }: { 
    initialData?: Partial<CreateFeatureInput>, 
    onSubmit: (data: CreateFeatureInput) => void,
    isSubmitting: boolean 
}) {
    const [formData, setFormData] = useState<CreateFeatureInput>({
        name: initialData?.name || '',
        category: (initialData?.category as "SNAP" | "NON_SNAP") || 'SNAP',
        apigeeProducts: initialData?.apigeeProducts || [],
        apigeeTraceProxies: initialData?.apigeeTraceProxies || [],
        notes: initialData?.notes || '',
    });

    useEffect(() => {
        if (initialData) {
             setFormData({
                name: initialData.name || '',
                category: (initialData.category as "SNAP" | "NON_SNAP") || 'SNAP',
                apigeeProducts: initialData.apigeeProducts || [],
                apigeeTraceProxies: initialData.apigeeTraceProxies || [],
                notes: initialData.notes || '',
            });
        } else {
             setFormData({
                name: '',
                category: 'SNAP',
                apigeeProducts: [],
                apigeeTraceProxies: [],
                notes: '',
            });
        }
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form id="feature-form" onSubmit={handleSubmit}>
            <Stack spacing={3}>
                <TextField
                    label="Feature Name"
                    fullWidth
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
                
                <TextField
                    select
                    label="Category"
                    fullWidth
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value as "SNAP" | "NON_SNAP"})}
                >
                    <MenuItem value="SNAP">SNAP</MenuItem>
                    <MenuItem value="NON_SNAP">NON-SNAP</MenuItem>
                </TextField>

                <Box sx={{ py: 1 }}>
                    <DividerWrapper label="Technical Specs" />
                </Box>

                <ArrayInput
                    label="Apigee Products"
                    placeholder="Add Product Name..."
                    values={formData.apigeeProducts}
                    onChange={(vals) => setFormData({...formData, apigeeProducts: vals})}
                />

                <ArrayInput
                    label="Apigee Trace Proxies"
                    placeholder="Add Proxy Name..."
                    values={formData.apigeeTraceProxies}
                    onChange={(vals) => setFormData({...formData, apigeeTraceProxies: vals})}
                />

                <Box sx={{ py: 1 }}>
                    <DividerWrapper label="Additional Notes" />
                </Box>
                
                <TextField
                    label="Implementation Notes / Gotchas"
                    fullWidth
                    multiline
                    rows={4}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="e.g. Requires X-Auth header..."
                />
            </Stack>
        </form>
    );
}

function DividerWrapper({ label }: { label: string }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'text.secondary' }}>
            <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {label}
            </Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
        </Box>
    )
}

export default function FeatureDialog({
  open,
  onClose,
  onSubmit,
  initialData,
  isSubmitting,
  title,
}: FeatureDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
            width: isMobile ? '100%' : 600,
            boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 2.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="h6" fontWeight={600} sx={{ color: 'text.primary' }}>
          {title}
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3, bgcolor: '#f8fafc' }}>
         <FeatureForm 
            initialData={initialData} 
            onSubmit={onSubmit} 
            isSubmitting={isSubmitting} 
         />
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button onClick={onClose} disabled={isSubmitting} variant="outlined" color="inherit">
            Cancel
          </Button>
          <Button
            type="submit"
            form="feature-form"
            variant="contained"
            disabled={isSubmitting}
            disableElevation
            sx={{ px: 4 }}
          >
            {isSubmitting ? 'Saving...' : 'Save Feature'}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
