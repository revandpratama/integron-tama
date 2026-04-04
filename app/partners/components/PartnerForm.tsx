'use client';

import {
  Box,
  TextField,
  MenuItem,
  Stack,
  Typography,
  Autocomplete,
  Chip,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { CreatePartnerInput } from '@/app/lib/validations/partner';

interface PartnerFormProps {
  initialData?: Partial<CreatePartnerInput> & { features?: { id: string; name: string; category: string }[] };
  onSubmit: (data: CreatePartnerInput) => void;
  isSubmitting?: boolean;
}

interface FeatureOption {
  id: string;
  name: string;
  category: string;
}

const CATEGORY_COLOR: Record<string, { bg: string; color: string }> = {
  SNAP:     { bg: '#dbeafe', color: '#1d4ed8' },
  NON_SNAP: { bg: '#ede9fe', color: '#6d28d9' },
};

export default function PartnerForm({ initialData, onSubmit, isSubmitting }: PartnerFormProps) {
  const [formData, setFormData] = useState<CreatePartnerInput>({
    name: initialData?.name || '',
    code: initialData?.code || '',
    status: initialData?.status || 'DRAFT',
    integratorId: initialData?.integratorId || undefined,
    notes: initialData?.notes || '',
    featureIds: initialData?.featureIds || [],
  });

  const [selectedFeatures, setSelectedFeatures] = useState<FeatureOption[]>(
    initialData?.features || []
  );

  const { data: users, isLoading: usersLoading } = useQuery<{id: string, name: string | null, email: string}[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await axios.get('/api/users');
      return res.data;
    }
  });

  const { data: featuresResponse, isLoading: featuresLoading } = useQuery<{ data: FeatureOption[] }>({
    queryKey: ['features', 'all'],
    queryFn: async () => {
      const res = await axios.get('/api/features?limit=500&page=1');
      return res.data;
    },
    staleTime: 60_000,
  });

  const allFeatures = featuresResponse?.data || [];

  // Sync state when initialData changes (fix for reused dialog)
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        code: initialData.code || '',
        status: initialData.status || 'DRAFT',
        integratorId: initialData.integratorId || undefined,
        notes: initialData.notes || '',
        featureIds: initialData.featureIds || [],
      });
      setSelectedFeatures(initialData.features || []);
    } else {
      setFormData({
        name: '',
        code: '',
        status: 'DRAFT',
        integratorId: undefined,
        notes: '',
        featureIds: [],
      });
      setSelectedFeatures([]);
    }
  }, [initialData]);

  const handleChange = (field: keyof CreatePartnerInput) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSelectChange = (field: keyof CreatePartnerInput) => (
    event: any
  ) => {
    setFormData((prev) => ({
       ...prev,
       [field]: event.target.value 
    }));
  };

  const handleFeaturesChange = (_: any, newValue: FeatureOption[]) => {
    setSelectedFeatures(newValue);
    setFormData(prev => ({
      ...prev,
      featureIds: newValue.map(f => f.id),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} id="partner-form">
      <Stack spacing={3}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ color: 'text.secondary' }}>
            Partner Information
          </Typography>
          
          <TextField
            fullWidth
            label="Partner Name"
            value={formData.name}
            onChange={handleChange('name')}
            required
            disabled={isSubmitting}
            placeholder="e.g. Tokopedia"
          />
          
          <TextField
            fullWidth
            label="Partner Code"
            value={formData.code}
            onChange={handleChange('code')}
            required
            disabled={isSubmitting}
            helperText="Unique internal identifier (e.g. TOKOPEDIA_V1)"
            placeholder="e.g. COMPANY_CODE"
          />
          
          <TextField
              select
              label="Integrator"
              fullWidth
              value={formData.integratorId || ''}
              onChange={handleSelectChange('integratorId')}
              disabled={isSubmitting || usersLoading}
            >
                <MenuItem value=""><em>Unassigned</em></MenuItem>
                {users?.map(user => {
                    const displayName = user.name || user.email;
                    return <MenuItem key={user.id} value={user.id}>{displayName}</MenuItem>
                })}
          </TextField>
          
          <TextField
            fullWidth
            select
            label="Status"
            value={formData.status}
            onChange={handleSelectChange('status')}
            required
            disabled={isSubmitting}
          >
            <MenuItem value="DRAFT">DRAFT</MenuItem>
            <MenuItem value="ONBOARDING">ONBOARDING</MenuItem>
            <MenuItem value="LIVE">LIVE</MenuItem>
            <MenuItem value="MAINTENANCE">MAINTENANCE</MenuItem>
            <MenuItem value="SUSPENDED">SUSPENDED</MenuItem>
          </TextField>

          {/* Feature Multi-Select */}
          <Box>
            <Autocomplete
              multiple
              options={allFeatures}
              value={selectedFeatures}
              onChange={handleFeaturesChange}
              loading={featuresLoading}
              disabled={isSubmitting}
              groupBy={(option) => option.category}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const colors = CATEGORY_COLOR[option.category] || { bg: '#f3f4f6', color: '#374151' };
                  const tagProps = getTagProps({ index });
                  return (
                    <Chip
                      key={option.id}
                      label={option.name}
                      size="small"
                      {...tagProps}
                      sx={{
                        bgcolor: colors.bg,
                        color: colors.color,
                        fontWeight: 600,
                        fontSize: 11,
                        height: 22,
                        '& .MuiChip-deleteIcon': { color: colors.color, opacity: 0.6 }
                      }}
                    />
                  );
                })
              }
              renderOption={(props, option) => {
                const colors = CATEGORY_COLOR[option.category] || { bg: '#f3f4f6', color: '#374151' };
                return (
                  <Box component="li" {...props} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">{option.name}</Typography>
                    <Chip
                      label={option.category.replace('_', '-')}
                      size="small"
                      sx={{ bgcolor: colors.bg, color: colors.color, fontWeight: 600, fontSize: 10, height: 18 }}
                    />
                  </Box>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Features / Products Used"
                  placeholder={selectedFeatures.length === 0 ? "Select SNAP or Non-SNAP features..." : ""}
                  helperText="Select all features this partner will integrate"
                />
              )}
            />
          </Box>

          <TextField
              label="Notes"
              fullWidth
              multiline
              minRows={3}
              value={formData.notes}
              onChange={handleChange('notes')}
              disabled={isSubmitting}
              placeholder="Internal notes, blockers, or context..."
          />
      </Stack>
    </form>
  );
}
