
'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Stack,
  CircularProgress,
  Chip,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Groups as GroupsIcon,
  CheckCircle as CheckCircleIcon,
  Extension as ExtensionIcon,
  MenuBook as MenuBookIcon,
  ArrowForward as ArrowForwardIcon,
  PushPin as PushPinIcon,
  Update as UpdateIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface DashboardStatsData {
  partners: {
    total: number;
    byStatus: {
      ONBOARDING?: number;
      DRAFT?: number;
      SUSPENDED?: number;
      LIVE?: number;
      MAINTENANCE?: number;
      [key: string]: number | undefined;
    };
  };
  features: {
    total: number;
    byCategory: {
      SNAP?: number;
      NON_SNAP?: number;
      [key: string]: number | undefined;
    };
  };
  knowledge: {
    total: number;
    pinned: number;
  };
  recentPartners: Array<{
    id: string;
    name: string;
    code: string;
    status: string;
    updatedAt: string;
  }>;
  pinnedNotes: Array<{
    id: string;
    title: string;
    tags: string[];
    updatedAt: string;
  }>;
}

export default function DashboardStats() {
  const { data, isLoading, error } = useQuery<DashboardStatsData>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await axios.get('/api/dashboard/stats');
      return res.data;
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4} textAlign="center">
        <Typography color="error">Failed to load dashboard statistics.</Typography>
      </Box>
    );
  }

  if (!data) return null;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
        System Overview
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Partners */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="Total Partners"
            value={data.partners.total}
            icon={<GroupsIcon sx={{ fontSize: 40, color: 'primary.main' }} />}
            color="primary"
          />
        </Grid>
        {/* Production */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="Live Partners"
            value={data.partners.byStatus.LIVE || 0}
            icon={<CheckCircleIcon sx={{ fontSize: 40, color: 'success.main' }} />}
            color="success"
          />
        </Grid>
        {/* Features */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="Total Features"
            value={data.features.total}
            icon={<ExtensionIcon sx={{ fontSize: 40, color: 'secondary.main' }} />}
            color="secondary"
          />
        </Grid>
        {/* Knowledge */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="Knowledge Base"
            value={data.knowledge.total}
            icon={<MenuBookIcon sx={{ fontSize: 40, color: 'info.main' }} />}
            color="info"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Activity */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                 <Box display="flex" alignItems="center" gap={1}>
                    <UpdateIcon color="action" />
                    <Typography variant="h6" fontWeight={600}>
                    Recently Updated
                    </Typography>
                 </Box>
                 <Button component={Link} href="/partners" size="small" endIcon={<ArrowForwardIcon />}>
                    View All
                 </Button>
              </Box>
              
              <List disablePadding>
                  {data.recentPartners.length === 0 ? (
                      <Typography color="text.secondary" textAlign="center" py={4}>
                          No recent activity.
                      </Typography>
                  ) : (
                      data.recentPartners.map((partner) => (
                          <ListItem 
                            key={partner.id} 
                            disableGutters 
                            component={Link} 
                            href={`/partners?id=${partner.id}`} // Assuming we can link to partner details, or just partners page
                            sx={{ 
                                textDecoration: 'none', 
                                color: 'inherit',
                                borderBottom: '1px solid #f3f4f6',
                                '&:last-child': { borderBottom: 'none' },
                                '&:hover': { bgcolor: '#f9fafb' },
                                px: 1,
                                py: 1.5
                            }}
                          >
                              <Box sx={{ width: '100%' }}>
                                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                      <Typography variant="subtitle2" fontWeight={600}>
                                          {partner.name}
                                      </Typography>
                                      <Chip 
                                        label={partner.status} 
                                        size="small" 
                                        color={partner.status === 'LIVE' ? 'success' : partner.status === 'ONBOARDING' ? 'info' : 'default'} 
                                        variant="outlined"
                                        sx={{ height: 20, fontSize: 10 }}
                                      />
                                  </Box>
                                  <Box display="flex" justifyContent="space-between" alignItems="center">
                                      <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                                          {partner.code}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                          {formatDistanceToNow(new Date(partner.updatedAt), { addSuffix: true })}
                                      </Typography>
                                  </Box>
                              </Box>
                          </ListItem>
                      ))
                  )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Pinned Notes */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                    <PushPinIcon sx={{ color: '#f59e0b' }} />
                    <Typography variant="h6" fontWeight={600}>
                    Pinned Notes
                    </Typography>
                </Box>
                <Button component={Link} href="/knowledge" size="small" endIcon={<ArrowForwardIcon />}>
                    Knowledge Base
                </Button>
              </Box>

              <List disablePadding>
                  {data.pinnedNotes.length === 0 ? (
                      <Typography color="text.secondary" textAlign="center" py={4}>
                          No pinned notes.
                      </Typography>
                  ) : (
                      data.pinnedNotes.map((note) => (
                          <ListItem
                             key={note.id}
                             disableGutters
                             sx={{ 
                                borderBottom: '1px solid #f3f4f6',
                                '&:last-child': { borderBottom: 'none' },
                                py: 1.5,
                                px: 1
                             }}
                          >
                              <Box sx={{ width: '100%' }}>
                                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                      {note.title}
                                  </Typography>
                                  <Box display="flex" gap={1} flexWrap="wrap">
                                      {note.tags.map(tag => (
                                          <Chip key={tag} label={tag} size="small" sx={{ height: 20, fontSize: 10, bgcolor: '#f3f4f6' }} />
                                      ))}
                                  </Box>
                              </Box>
                          </ListItem>
                      ))
                  )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function SummaryCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {value}
            </Typography>
          </Box>
          <Box>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );
}
