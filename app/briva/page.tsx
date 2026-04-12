'use client';

import DashboardLayout from '../components/DashboardLayout';
import { Box, Typography, Paper } from '@mui/material';

export default function BrivaPage() {
  return (
    <DashboardLayout>
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          BRIVA WS Trigger Notif and flag pay
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          This feature is currently under development. Here we will implement the BRIVA Webhook trigger and payment flagging simulation.
        </Typography>

        <Paper 
          variant="outlined" 
          sx={{ 
            p: 6, 
            borderRadius: 4, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderStyle: 'dashed',
            bgcolor: 'action.hover'
          }}
        >
          <Typography variant="h6" color="text.disabled">
            Feature Placeholder
          </Typography>
        </Paper>
      </Box>
    </DashboardLayout>
  );
}
