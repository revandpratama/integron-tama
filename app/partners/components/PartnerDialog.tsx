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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PartnerForm from './PartnerForm';
import { CreatePartnerInput } from '@/app/lib/validations/partner';

interface PartnerDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePartnerInput) => void;
  initialData?: Partial<CreatePartnerInput>;
  isSubmitting: boolean;
  title: string;
}

export default function PartnerDialog({
  open,
  onClose,
  onSubmit,
  initialData,
  isSubmitting,
  title,
}: PartnerDialogProps) {
  const theme = useTheme();
  // On mobile, full width. On desktop, decent drawer width
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
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: 'text.secondary',
            '&:hover': { bgcolor: alpha(theme.palette.text.secondary, 0.1) },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3, bgcolor: '#f8fafc' }}>
        <PartnerForm
          onSubmit={onSubmit}
          initialData={initialData}
          isSubmitting={isSubmitting}
        />
      </Box>

      {/* Footer / Actions */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            onClick={onClose}
            disabled={isSubmitting}
            variant="outlined"
            size="large"
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="partner-form"
            variant="contained"
            disabled={isSubmitting}
            size="large"
            disableElevation
            sx={{ px: 4 }}
          >
            {isSubmitting ? 'Saving...' : 'Save Partner'}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
