'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Stack,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { format } from 'date-fns';

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  level: 'Info' | 'Important' | 'Critical';
  isCompleted: boolean;
}

const LEVEL_OPTIONS = ['Info', 'Important', 'Critical'];

const LEVEL_ICONS = {
  Info: <InfoIcon fontSize="small" color="info" />,
  Important: <WarningIcon fontSize="small" color="warning" />,
  Critical: <ErrorIcon fontSize="small" color="error" />,
};

export default function RemindersPage() {
  const [open, setOpen] = useState(false);
  const [detailReminder, setDetailReminder] = useState<Reminder | null>(null);

  const queryClient = useQueryClient();

  // ... (From previous: formData state)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledAt: '',
    level: 'Info',
  });

  const { data: reminders } = useQuery<Reminder[]>({
    queryKey: ['reminders'],
    queryFn: async () => {
      // Fetch all reminders
      const res = await axios.get('/api/reminders');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await axios.post('/api/reminders', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['active-reminders'] });
      setOpen(false);
      setFormData({ title: '', description: '', scheduledAt: '', level: 'Info' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/reminders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['active-reminders'] });
      setDetailReminder(null);
    },
  });
  
  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.put(`/api/reminders/${id}`, { isCompleted: true });
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['reminders'] });
        queryClient.invalidateQueries({ queryKey: ['active-reminders'] });
        setDetailReminder(null);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
            <Typography variant="h4" fontWeight={700}>Reminders</Typography>
            <Typography variant="body1" color="text.secondary">Manage your scheduled alerts and tasks.</Typography>
        </Box>
        <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => setOpen(true)}
            sx={{ bgcolor: '#0f172a', textTransform: 'none', borderRadius: 2 }}
        >
          New Reminder
        </Button>
      </Box>

      <Grid container spacing={3}>
        {reminders?.map((reminder) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={reminder.id}>
            <Card sx={{ 
                height: '100%', 
                opacity: reminder.isCompleted ? 0.6 : 1,
                borderLeftWidth: reminder.isCompleted ? 0 : 6,
                borderLeftStyle: 'solid',
                borderLeftColor: 
                    reminder.level === 'Critical' ? 'error.main' : 
                    reminder.level === 'Important' ? 'warning.main' : 'info.main',
                position: 'relative'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Chip 
                    label={reminder.level} 
                    size="small" 
                    color={
                        reminder.level === 'Critical' ? 'error' : 
                        reminder.level === 'Important' ? 'warning' : 'info'
                    }
                    variant={reminder.isCompleted ? 'outlined' : 'filled'}
                  />
                  <IconButton size="small" onClick={() => deleteMutation.mutate(reminder.id)} sx={{ color: 'text.disabled' }}>
                      <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                
                <Typography variant="h6" sx={{ textDecoration: reminder.isCompleted ? 'line-through' : 'none' }}>
                    {reminder.title}
                </Typography>
                
                {reminder.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {reminder.description}
                    </Typography>
                )}

                <Typography variant="caption" display="block" sx={{ mt: 2, fontWeight: 600, color: 'text.secondary' }}>
                    Due: {format(new Date(reminder.scheduledAt), 'MMM d, yyyy h:mm a')}
                </Typography>
                
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                     <Button 
                        size="small" 
                        variant="outlined" 
                        color="inherit"
                        fullWidth
                        startIcon={<VisibilityIcon />}
                        onClick={() => setDetailReminder(reminder)}
                    >
                        View Details
                    </Button>
                    {!reminder.isCompleted && (
                        <Button 
                            size="small" 
                            variant="contained" 
                            color="success"
                            fullWidth
                            startIcon={<CheckCircleIcon />}
                            onClick={() => completeMutation.mutate(reminder.id)}
                        >
                            Complete
                        </Button>
                    )}
                </Box>

                {reminder.isCompleted && (
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main' }}>
                        <CheckCircleIcon fontSize="small" />
                        <Typography variant="caption" fontWeight={700}>Completed</Typography>
                    </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
            <DialogTitle fontWeight={700}>Create Reminder</DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <TextField
                        label="Title"
                        fullWidth
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. UAT Sign-off"
                    />
                     <TextField
                        label="Description"
                        fullWidth
                        multiline
                        minRows={2}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    <TextField
                        label="Date & Time"
                        type="datetime-local"
                        fullWidth
                        required
                        value={formData.scheduledAt}
                        onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        select
                        label="Priority Level"
                        fullWidth
                        value={formData.level}
                        onChange={(e) => setFormData({ ...formData, level: e.target.value as 'Info' | 'Important' | 'Critical' })}
                    >
                        {LEVEL_OPTIONS.map(opt => (
                            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                        ))}
                    </TextField>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
                <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
                <Button type="submit" variant="contained" sx={{ bgcolor: '#0f172a' }}>Set Reminder</Button>
            </DialogActions>
        </form>
      </Dialog>

      {/* View Details Dialog */}
      {detailReminder && (
          <Dialog open={Boolean(detailReminder)} onClose={() => setDetailReminder(null)} fullWidth maxWidth="sm">
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {LEVEL_ICONS[detailReminder.level]}
                  <Typography variant="h6" fontWeight={700}>{detailReminder.title}</Typography>
              </DialogTitle>
              <DialogContent>
                  <Box sx={{ mb: 2 }}>
                       <Chip 
                            label={detailReminder.level} 
                            size="small" 
                            color={
                                detailReminder.level === 'Critical' ? 'error' : 
                                detailReminder.level === 'Important' ? 'warning' : 'info'
                            } 
                        />
                        {detailReminder.isCompleted && <Chip label="Completed" size="small" color="success" sx={{ ml: 1 }} />}
                  </Box>
                  <DialogContentText sx={{ color: '#374151', whiteSpace: 'pre-wrap', mb: 3 }}>
                      {detailReminder.description || 'No description provided.'}
                  </DialogContentText>
                  
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Due Date
                  </Typography>
                   <Typography variant="body2" color="text.primary">
                       {format(new Date(detailReminder.scheduledAt), 'PPPP p')}
                   </Typography>
              </DialogContent>
              <DialogActions sx={{ p: 2 }}>
                   {!detailReminder.isCompleted && (
                        <Button 
                            startIcon={<CheckCircleIcon />}
                            color="success"
                            onClick={() => completeMutation.mutate(detailReminder.id)}
                        >
                            Mark Complete
                        </Button>
                   )}
                   <Button onClick={() => setDetailReminder(null)} color="inherit">Close</Button>
                   <Button 
                        startIcon={<DeleteIcon />} 
                        color="error" 
                        onClick={() => deleteMutation.mutate(detailReminder.id)}
                    >
                       Delete
                   </Button>
              </DialogActions>
          </Dialog>
      )}
    </Box>
  );
}
