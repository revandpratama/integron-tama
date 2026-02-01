'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Box, Typography, Card, CardContent, IconButton, Button, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import { format } from 'date-fns';

interface Reminder {
  id: string;
  title: string;
  level: 'Info' | 'Important' | 'Critical';
  scheduledAt: string;
}

const LEVEL_CONFIG = {
  Info: { icon: <InfoIcon fontSize="small" />, color: 'info.main', bg: 'info.light' },
  Important: { icon: <WarningIcon fontSize="small" />, color: 'warning.main', bg: 'warning.light' },
  Critical: { icon: <ErrorIcon fontSize="small" />, color: 'error.main', bg: 'error.light' },
};

export default function ReminderBanner() {
  const queryClient = useQueryClient();

  const { data: reminders } = useQuery<Reminder[]>({
    queryKey: ['active-reminders'],
    queryFn: async () => {
      const res = await axios.get('/api/reminders?active=true');
      return res.data;
    },
    refetchInterval: 60000, // Check every minute
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.put(`/api/reminders/${id}`, { isCompleted: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-reminders'] });
    },
  });

  if (!reminders || reminders.length === 0) return null;

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
        <NotificationsActiveIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>
          Active Reminders
        </Typography>
        <Chip label={reminders.length} size="small" color="primary" sx={{ fontWeight: 700 }} />
      </Box>

      <Box sx={{ display: 'flex', overflowX: 'auto', gap: 2, pb: 2 }}>
        {reminders.map((reminder) => {
            const config = LEVEL_CONFIG[reminder.level] || LEVEL_CONFIG.Info;
            return (
                <Card 
                    key={reminder.id} 
                    sx={{ 
                        minWidth: 300, 
                        flexShrink: 0, 
                        borderLeft: 6, 
                        borderColor: config.color,
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' 
                    }}
                >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                           <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ color: config.color, display: 'flex' }}>{config.icon}</Box>
                                <Typography variant="subtitle2" fontWeight={700}>
                                    {reminder.level.toUpperCase()}
                                </Typography>
                           </Box>
                           <Typography variant="caption" color="text.secondary">
                                {format(new Date(reminder.scheduledAt), 'h:mm a')}
                           </Typography>
                        </Box>
                        
                        <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
                            {reminder.title}
                        </Typography>

                        <Button 
                            size="small" 
                            variant="outlined" 
                            startIcon={<CheckCircleIcon />}
                            onClick={() => completeMutation.mutate(reminder.id)}
                            fullWidth
                            sx={{ textTransform: 'none', borderRadius: 2 }}
                        >
                            Mark Done
                        </Button>
                    </CardContent>
                </Card>
            );
        })}
      </Box>
    </Box>
  );
}
