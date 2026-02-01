'use client';

import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import PushPinIcon from '@mui/icons-material/PushPin';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { KnowledgeNote } from '../types';
import { format } from 'date-fns';
import { useState } from 'react';

interface NoteCardProps {
  note: KnowledgeNote;
  onEdit: (note: KnowledgeNote) => void;
  onDelete: (id: string) => void;
  onClick: (note: KnowledgeNote) => void;
  onTogglePin: (note: KnowledgeNote) => void;
}

export default function NoteCard({ note, onEdit, onDelete, onClick, onTogglePin }: NoteCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    handleClose();
    onEdit(note);
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    handleClose();
    onDelete(note.id);
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative',
        border: note.isPinned ? '2px solid #3b82f6' : '1px solid #e5e7eb',
        bgcolor: note.isPinned ? '#eff6ff' : 'white',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
      }}
      onClick={() => onClick(note)}
    >
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {note.isPinned && (
                <PushPinIcon sx={{ fontSize: 18, color: '#3b82f6', transform: 'rotate(45deg)' }} />
            )}
            <Typography variant="h6" component="div" sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>
                {note.title}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleMenuClick} sx={{ mt: -0.5, mr: -0.5 }}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            flexGrow: 1,
          }}
        >
          {note.content}
        </Typography>

        <Box sx={{ mt: 'auto' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
            {note.tags.map((tag) => (
              <Chip
                key={tag}
                label={`#${tag}`}
                size="small"
                sx={{ 
                    height: 20, 
                    fontSize: 11, 
                    bgcolor: note.isPinned ? 'white' : '#f1f5f9', 
                    color: '#64748b',
                    cursor: 'pointer' 
                }}
              />
            ))}
          </Box>
          <Typography variant="caption" color="text.disabled">
            Updated {format(new Date(note.updatedAt), 'MMM d, yyyy')}
          </Typography>
        </Box>
      </CardContent>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => { handleClose(); onTogglePin(note); }}>
            {note.isPinned ? 'Unpin' : 'Pin'} Note
        </MenuItem>
        <MenuItem onClick={handleEdit}>Edit</MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>Delete</MenuItem>
      </Menu>
    </Card>
  );
}
