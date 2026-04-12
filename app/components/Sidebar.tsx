'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Divider,
  Avatar,
  Tooltip,
  Skeleton,
  useTheme,
  alpha,
} from '@mui/material';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import CategoryIcon from '@mui/icons-material/Category';
import ContactsOutlinedIcon from '@mui/icons-material/ContactsOutlined';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import LogoutIcon from '@mui/icons-material/Logout';
import HistoryIcon from '@mui/icons-material/History';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import { useColorMode } from '../providers/ThemeProvider';

import { useState } from 'react';
import Image from 'next/image';

const DRAWER_WIDTH = 260;
const DRAWER_COLLAPSED_WIDTH = 72;

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const { mode, toggleColorMode } = useColorMode();

  const { data: meData, isLoading: meLoading } = useQuery<{ user: { id: string; name: string | null; email: string } | null }>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await axios.get('/api/auth/me');
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 min — user info rarely changes
  });

  const user = meData?.user;
  const displayName = user?.name || user?.email || 'User';
  const displayInitial = displayName.charAt(0).toUpperCase();
  const displayEmail = user?.email || '';

  const handleLogout = async () => {
      try {
          await axios.post('/api/auth/logout');
          window.location.href = '/login';
      } catch (error) {
          console.error('Logout failed:', error);
      }
  };

  const navItems = [
    { label: 'Dashboard', path: '/', icon: <DashboardOutlinedIcon /> },
    { label: 'Partner Management', path: '/partners', icon: <GroupOutlinedIcon /> },
    { label: 'Integration Board', path: '/kanban', icon: <ViewKanbanOutlinedIcon /> },
    { label: 'Integration Catalog', path: '/features', icon: <CategoryIcon /> },
    { label: 'The Rolodex', path: '/people', icon: <ContactsOutlinedIcon /> },
    { label: 'Knowledge Base', path: '/knowledge', icon: <MenuBookIcon /> },
    { label: 'Reminders', path: '/reminders', icon: <NotificationsActiveIcon /> },
    { label: 'Activity Log', path: '/activity-logs', icon: <HistoryIcon /> },
    { label: 'QRIS Pay', path: '/qris', icon: <QrCode2Icon /> },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
          transition: 'width 0.2s ease-in-out',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Brand Header */}
      <Box
        sx={{
          p: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}
      >
        {!collapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Image
              src="/logo.png"
              alt="Integron Logo"
              width={32}
              height={32}
              style={{ borderRadius: 8 }}
            />
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: 'text.primary' }}>
              Integron
            </Typography>
          </Box>
        )}
        <IconButton onClick={onToggle} size="small" sx={{ color: 'text.secondary' }}>
          {collapsed ? <KeyboardArrowRightIcon /> : <KeyboardArrowLeftIcon />}
        </IconButton>
      </Box>

      {/* Navigation */}
      <List sx={{ px: 2, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              component={Link}
              href={item.path}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                py: 1.5,
                px: 2,
                justifyContent: collapsed ? 'center' : 'flex-start',
                bgcolor: isActive ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                color: isActive ? 'primary.main' : 'text.secondary',
                '&:hover': {
                  bgcolor: isActive ? alpha(theme.palette.primary.main, 0.15) : 'action.hover',
                  color: isActive ? 'primary.main' : 'text.primary',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? 0 : 36,
                  color: 'inherit',
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 500,
                  }}
                />
              )}
            </ListItemButton>
          );
        })}
      </List>

      {/* Footer / Logout */}
      <Box sx={{ p: 2 }}>
        <Divider sx={{ mb: 2 }} />

        {/* User Profile */}
        {collapsed ? (
          <Tooltip title={displayName} placement="right">
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
              {meLoading ? (
                <Skeleton variant="circular" width={36} height={36} />
              ) : (
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    fontSize: 14,
                    fontWeight: 700,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    cursor: 'default',
                  }}
                >
                  {displayInitial}
                </Avatar>
              )}
            </Box>
          </Tooltip>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 1,
              py: 1.5,
              mb: 1,
              borderRadius: 2,
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {meLoading ? (
              <Skeleton variant="circular" width={36} height={36} />
            ) : (
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  fontSize: 14,
                  fontWeight: 700,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  flexShrink: 0,
                }}
              >
                {displayInitial}
              </Avatar>
            )}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              {meLoading ? (
                <>
                  <Skeleton width={100} height={16} sx={{ mb: 0.5 }} />
                  <Skeleton width={130} height={13} />
                </>
              ) : (
                <>
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    noWrap
                    sx={{ fontSize: 13, color: 'text.primary', lineHeight: 1.3 }}
                  >
                    {user?.name || 'Anonymous'}
                  </Typography>
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{ fontSize: 11, color: 'text.secondary', display: 'block' }}
                  >
                    {displayEmail}
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        )}

        {/* Theme Toggle */}
        <ListItemButton
          onClick={toggleColorMode}
          sx={{
            borderRadius: 2,
            px: 2,
            justifyContent: collapsed ? 'center' : 'flex-start',
            color: 'text.secondary',
            mb: 0.5,
            '&:hover': {
               bgcolor: 'action.hover',
               color: 'text.primary',
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: 'inherit', justifyContent: 'center' }}>
            {mode === 'light' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
          </ListItemIcon>
          {!collapsed && (
            <ListItemText
              primary={mode === 'light' ? 'Dark Mode' : 'Light Mode'}
              primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
            />
          )}
        </ListItemButton>

        {/* Logout Button */}
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            px: 2,
            justifyContent: collapsed ? 'center' : 'flex-start',
            color: 'error.main',
            mt: 0.5,
            '&:hover': {
               bgcolor: alpha(theme.palette.error.main, 0.1),
               color: 'error.dark',
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, color: 'inherit', justifyContent: 'center' }}>
            <LogoutIcon />
          </ListItemIcon>
          {!collapsed && (
            <ListItemText
              primary="Logout"
              primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
            />
          )}
        </ListItemButton>
      </Box>
    </Drawer>
  );
}

export { DRAWER_WIDTH, DRAWER_COLLAPSED_WIDTH };
