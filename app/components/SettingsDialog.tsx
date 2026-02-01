'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  Divider,
  Stack,
  useTheme
} from '@mui/material';
import { useColorMode } from '@/app/providers/ThemeProvider';
import DarkModeIcon from '@mui/icons-material/DarkMode';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const theme = useTheme();
  const colorMode = useColorMode();
  const isDarkMode = theme.palette.mode === 'dark';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>Settings</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
            
            {/* Appearance Section */}
            <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', fontSize: 12, fontWeight: 700 }}>
                    Appearance
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <DarkModeIcon color="action" />
                        <Typography variant="body1" fontWeight={500}>Dark Mode</Typography>
                    </Box>
                    <Switch 
                        checked={isDarkMode} 
                        onChange={colorMode.toggleColorMode} 
                        color="primary"
                    />
                </Box>
            </Box>

            <Divider />
            
            {/* More settings can go here */}
             <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', fontSize: 12, fontWeight: 700 }}>
                    General
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Version 0.1.0
                </Typography>
            </Box>

        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">Close</Button>
      </DialogActions>
    </Dialog>
  );
}
