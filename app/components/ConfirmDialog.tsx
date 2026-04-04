'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmText?: string;
  cancelText?: string;
  severity?: 'primary' | 'error' | 'warning';
}

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onClose,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  severity = 'primary',
}: ConfirmDialogProps) {
  const getColor = () => {
    switch (severity) {
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: 3,
          padding: 1,
          maxWidth: 400
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <Box sx={{ 
          bgcolor: severity === 'error' ? '#fef2f2' : (severity === 'warning' ? '#fffbeb' : '#eff6ff'),
          borderRadius: '50%',
          p: 1,
          display: 'flex'
        }}>
          <WarningAmberIcon sx={{ color: getColor(), fontSize: 24 }} />
        </Box>
        <Typography variant="h6" fontWeight={700} sx={{ color: '#1f2937' }}>
          {title}
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ pb: 2 }}>
        <Typography variant="body2" sx={{ color: '#6b7280', lineHeight: 1.6 }}>
          {message}
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button 
          onClick={onClose} 
          variant="text" 
          sx={{ 
            textTransform: 'none', 
            fontWeight: 600, 
            color: '#6b7280',
            '&:hover': { bgcolor: '#f3f4f6' }
          }}
        >
          {cancelText}
        </Button>
        <Button 
          onClick={() => { onConfirm(); onClose(); }}
          variant="contained"
          sx={{ 
            textTransform: 'none', 
            fontWeight: 600,
            borderRadius: 2,
            bgcolor: getColor(),
            boxShadow: 'none',
            '&:hover': { bgcolor: severity === 'error' ? '#dc2626' : (severity === 'warning' ? '#d97706' : '#2563eb'), boxShadow: 'none' }
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
