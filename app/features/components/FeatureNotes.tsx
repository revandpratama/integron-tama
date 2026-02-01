'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Popover,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material';
import NoteAltIcon from '@mui/icons-material/NoteAlt'; // Or "See Notes" button
import SaveIcon from '@mui/icons-material/Save';
import CheckIcon from '@mui/icons-material/Check';

interface FeatureNotesProps {
  initialNotes: string;
  onSave: (notes: string) => void;
}

export default function FeatureNotes({ initialNotes, onSave }: FeatureNotesProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [notes, setNotes] = useState(initialNotes);
  const [isSaved, setIsSaved] = useState(true);
  
  // Timer ref for debounce
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setNotes(initialNotes); // Reset to current prop value on open
    setIsSaved(true);
  };

  const handleClose = () => {
    // Save on close if dirty (verified by notes !== initialNotes? 
    // Actually we should save whatever is in 'notes' state if it differs or just always trigger save if checking diff is hard.
    // Given the debounce might have run, let's just force save if not currently 'saved' state, 
    // OR we can rely on the upstream to dedup updates. 
    // Simple logic: If we have a pending debounce, clear it and save immediately.
    
    if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
        triggerSave(notes);
    } else if (notes !== initialNotes) {
        // Case: User typed, debounce fired (saved), then closed. -> No action needed as it's saved.
        // Case: User typed, debounce WAITING -> handled above.
        // Case: User opened, didn't type -> no save.
        // Case: User typed, debounce fired, user typed more instantly and closed -> Timer exists.
        
        // Actually, triggerSave updates the parent. The parent might re-render FeatureNotes with new initialNotes.
        // But the popover is open.
        // Let's implement robust save logic.
    }
    
    setAnchorEl(null);
  };

  const triggerSave = (text: string) => {
      onSave(text);
      setIsSaved(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setNotes(text);
    setIsSaved(false);

    // Debounce 5 seconds
    if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
        triggerSave(text);
        debounceTimer.current = null;
    }, 5000);
  };

  const handleManualSave = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      triggerSave(notes);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Button
        size="small"
        startIcon={<NoteAltIcon sx={{ fontSize: 16 }} />}
        onClick={handleClick}
        variant="text"
        sx={{ 
            textTransform: 'none', 
            fontSize: 12, 
            color: notes ? '#3b82f6' : '#9ca3af', 
            py: 0.5,
            bgcolor: notes ? alpha('#3b82f6', 0.1) : 'transparent',
            '&:hover': { bgcolor: notes ? alpha('#3b82f6', 0.2) : alpha('#9ca3af', 0.1) }
        }}
      >
        {notes ? 'Edit Notes' : 'Add Notes'}
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
        }}
        PaperProps={{
            sx: { width: 720, p: 2, borderRadius: 2, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
                Feature Notes
            </Typography>
            <Box>
                {isSaved ? (
                     <Tooltip title="Saved">
                         <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
                     </Tooltip>
                ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Saving...
                    </Typography>
                )}
            </Box>
        </Box>
        
        <TextField
            fullWidth
            multiline
            rows={20}
            value={notes}
            onChange={handleChange}
            placeholder="Write technical notes or implementation details here..."
            variant="outlined"
            size="small"
            sx={{ 
                bgcolor: '#f8fafc',
                '& .MuiOutlinedInput-root': { fontSize: 13 }
            }}
        />
        
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="small" onClick={handleManualSave} disabled={isSaved}>
                Save Now
            </Button>
        </Box>
      </Popover>
    </>
  );
}
