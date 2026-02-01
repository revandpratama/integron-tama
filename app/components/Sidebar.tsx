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
} from '@mui/material';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import CategoryIcon from '@mui/icons-material/Category';
import ContactsOutlinedIcon from '@mui/icons-material/ContactsOutlined';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import LogoutIcon from '@mui/icons-material/Logout';
import axios from 'axios';
import { useRouter } from 'next/navigation';

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

  const handleLogout = async () => {
      try {
          await axios.post('/api/auth/logout');
          router.push('/login');
          router.refresh();
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
          bgcolor: 'white',
          borderRight: '1px solid #e5e7eb',
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
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#1f2937' }}>
              Integron
            </Typography>
          </Box>
        )}
        <IconButton onClick={onToggle} size="small" sx={{ color: '#9ca3af' }}>
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
                bgcolor: isActive ? '#eff6ff' : 'transparent',
                color: isActive ? '#3b82f6' : '#6b7280',
                '&:hover': {
                  bgcolor: isActive ? '#eff6ff' : '#f9fafb',
                  color: isActive ? '#3b82f6' : '#1f2937',
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

      {/* Footer / Settings */}
      <Box sx={{ p: 2 }}>
        <Divider sx={{ mb: 2 }} />
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            px: 2,
            justifyContent: collapsed ? 'center' : 'flex-start',
            color: '#ef4444',
            mt: 0.5,
            '&:hover': {
               bgcolor: '#fef2f2',
               color: '#dc2626',
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
