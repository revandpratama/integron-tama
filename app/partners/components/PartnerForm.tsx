'use client';

import {
  Box,
  TextField,
  MenuItem,
  Tabs,
  Tab,
  Stack,
  Typography,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { CreatePartnerInput } from '@/app/lib/validations/partner';

interface PartnerFormProps {
  initialData?: Partial<CreatePartnerInput>;
  onSubmit: (data: CreatePartnerInput) => void;
  isSubmitting?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`partner-tabpanel-${index}`}
      aria-labelledby={`partner-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const AM_OPTIONS = ['Aditya', 'Budi', 'Chandra', 'Dewi', 'Eka'];

export default function PartnerForm({ initialData, onSubmit, isSubmitting }: PartnerFormProps) {
  const [formData, setFormData] = useState<CreatePartnerInput>({
    name: initialData?.name || '',
    code: initialData?.code || '',
    status: initialData?.status || 'DRAFT',
    integrator: initialData?.integrator || '',
    notes: initialData?.notes || '',
  });

  // Sync state when initialData changes (fix for reused dialog)
  useEffect(() => {
    if (initialData) {
        setFormData({
            name: initialData.name || '',
            code: initialData.code || '',
            status: initialData.status || 'DRAFT',
            integrator: initialData.integrator || '',
            notes: initialData.notes || '',
        });
    } else {
        // Reset if initialData is null (Create new)
         setFormData({
            name: '',
            code: '',
            status: 'DRAFT',
            integrator: '',
            notes: '',
        });
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
    event: any // SelectChangeEvent
  ) => {
    setFormData((prev) => ({
       ...prev,
       [field]: event.target.value 
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
              value={formData.integrator}
              onChange={handleSelectChange('integrator')}
              disabled={isSubmitting}
            >
                <MenuItem value=""><em>Unassigned</em></MenuItem>
                {AM_OPTIONS.map(name => (
                    <MenuItem key={name} value={name}>{name}</MenuItem>
                ))}
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
