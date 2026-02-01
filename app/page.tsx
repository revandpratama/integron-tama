'use client';

import { Box } from '@mui/material';
import DashboardStats from './components/DashboardStats';
import ReminderBanner from './components/ReminderBanner';

export default function Home() {
  return (
    <Box sx={{ p: 4 }}>
      <ReminderBanner />
      <DashboardStats />
    </Box>
  );
}
