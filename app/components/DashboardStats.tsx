'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  TextField,
  Divider
} from '@mui/material';
import {
  Groups as GroupsIcon,
  CheckCircle as CheckCircleIcon,
  Extension as ExtensionIcon,
  MenuBook as MenuBookIcon,
  Add as AddIcon,
  FormatListBulleted as FormatListBulletedIcon,
  History as HistoryIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
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
  };
  todos: Array<{
    id: string;
    title: string;
    isCompleted: boolean;
    createdAt: string;
  }>;
  activityLogs: Array<{
    id: string;
    actionType: string;
    entityType: string;
    entityId: string;
    metadata: any;
    createdAt: string;
    userName: string;
  }>;
}

export default function DashboardStats() {
  const queryClient = useQueryClient();
  const [newTodo, setNewTodo] = useState('');

  const { data, isLoading, error } = useQuery<DashboardStatsData>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await axios.get('/api/dashboard/stats');
      return res.data;
    },
    refetchInterval: 30000,
  });

  const addTodoMutation = useMutation({
    mutationFn: async (title: string) => {
      return axios.post('/api/todos', { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setNewTodo('');
    }
  });

  const toggleTodoMutation = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: string, isCompleted: boolean }) => {
      return axios.patch(`/api/todos/${id}`, { isCompleted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  });

  const deleteTodoMutation = useMutation({
    mutationFn: async (id: string) => {
      return axios.delete(`/api/todos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  });

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.trim()) {
      addTodoMutation.mutate(newTodo.trim());
    }
  };

  const renderActivityMessage = (log: any) => {
    return (
      <Box sx={{ width: '100%', wordBreak: 'break-word', whiteSpace: 'normal', pr: 2 }}>
        <Typography variant="body2">
          <strong>{log.userName}</strong> performed <strong>{log.actionType}</strong> on <em>{log.entityType}</em>
        </Typography>
        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontFamily: 'monospace' }}>
            {JSON.stringify(log.metadata)}
          </Typography>
        )}
      </Box>
    );
  };

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

      <Grid container spacing={4} sx={{ mb: 6 }}>
        {/* Total Partners */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="Total Partners"
            value={data.partners.total}
            icon={<GroupsIcon sx={{ fontSize: 64, color: 'primary.main' }} />}
            color="primary"
          />
        </Grid>
        {/* Production */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="Live Partners"
            value={data.partners.byStatus.LIVE || 0}
            icon={<CheckCircleIcon sx={{ fontSize: 64, color: 'success.main' }} />}
            color="success"
          />
        </Grid>
        {/* Features */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="Total Features"
            value={data.features.total}
            icon={<ExtensionIcon sx={{ fontSize: 64, color: 'secondary.main' }} />}
            color="secondary"
          />
        </Grid>
        {/* Knowledge */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="Knowledge Base Notes"
            value={data.knowledge.total}
            icon={<MenuBookIcon sx={{ fontSize: 64, color: 'info.main' }} />}
            color="info"
          />
        </Grid>
      </Grid>

      <Grid container spacing={4} sx={{ minHeight: 500, flexGrow: 1 }}>
        {/* Todo List */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', maxHeight: 600 }}>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 4, overflow: 'hidden' }}>
              <Box display="flex" alignItems="center" gap={1} mb={3}>
                <FormatListBulletedIcon sx={{ color: 'primary.main', fontSize: 32 }} />
                <Typography variant="h5" fontWeight={600}>
                  My To-Do
                </Typography>
              </Box>

              <Box component="form" onSubmit={handleAddTodo} display="flex" gap={1} mb={2}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="What needs to be done?"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  disabled={addTodoMutation.isPending}
                />
                <Button 
                    type="submit" 
                    variant="contained" 
                    disabled={!newTodo.trim() || addTodoMutation.isPending}
                    sx={{ minWidth: 'auto', px: 2 }}
                >
                  <AddIcon />
                </Button>
              </Box>

              <List disablePadding sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                {data.todos.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center" py={4}>
                        Your to-do list is empty.
                    </Typography>
                ) : (
                    data.todos.map((todo) => (
                        <ListItem
                           key={todo.id}
                           disableGutters
                           secondaryAction={
                               <IconButton edge="end" onClick={() => deleteTodoMutation.mutate(todo.id)} size="small" color="error">
                                   <DeleteIcon fontSize="small" />
                               </IconButton>
                           }
                           sx={{ 
                              borderBottom: '1px solid #f3f4f6',
                              '&:last-child': { borderBottom: 'none' },
                              py: 0.5,
                           }}
                        >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                <Checkbox
                                    edge="start"
                                    checked={todo.isCompleted}
                                    tabIndex={-1}
                                    disableRipple
                                    onChange={(e) => toggleTodoMutation.mutate({ id: todo.id, isCompleted: e.target.checked })}
                                    disabled={toggleTodoMutation.isPending && toggleTodoMutation.variables?.id === todo.id}
                                />
                            </ListItemIcon>
                            <ListItemText 
                                primary={todo.title} 
                                sx={{ 
                                    textDecoration: todo.isCompleted ? 'line-through' : 'none',
                                    color: todo.isCompleted ? 'text.secondary' : 'text.primary',
                                    wordBreak: 'break-word',
                                    whiteSpace: 'normal',
                                    pr: 2
                                }}
                            />
                        </ListItem>
                    ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Activity Log */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', maxHeight: 600 }}>
            <CardContent sx={{ p: 4, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box display="flex" alignItems="center" gap={1} mb={3}>
                <HistoryIcon color="action" sx={{ fontSize: 32 }} />
                <Typography variant="h5" fontWeight={600}>
                  Activity Log
                </Typography>
              </Box>

              <List disablePadding sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                  {data.activityLogs.length === 0 ? (
                      <Typography color="text.secondary" textAlign="center" py={4}>
                          No recent activity.
                      </Typography>
                  ) : (
                      data.activityLogs.map((log) => (
                          <ListItem 
                            key={log.id} 
                            disableGutters 
                            sx={{ 
                                flexDirection: 'column', 
                                alignItems: 'flex-start',
                                borderBottom: '1px solid #f3f4f6',
                                '&:last-child': { borderBottom: 'none' },
                                py: 1.5,
                                px: 1
                            }}
                          >
                              <Box width="100%" display="flex" justifyContent="space-between" mb={0.5}>
                                  <Typography variant="caption" color="text.secondary">
                                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                  </Typography>
                              </Box>
                              {renderActivityMessage(log)}
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
    <Card sx={{ height: '100%', minHeight: 160, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
      <CardContent sx={{ p: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
              {title}
            </Typography>
            <Typography variant="h3" fontWeight={800}>
              {value}
            </Typography>
          </Box>
          <Box>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );
}
