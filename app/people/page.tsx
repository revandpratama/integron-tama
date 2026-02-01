'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Box, 
    Typography, 
    Button, 
    TextField,
    Avatar,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Menu,
    MenuItem,
    Skeleton,
    Paper,
    alpha,
    TablePagination
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PersonIcon from '@mui/icons-material/Person';
import NoteOutlinedIcon from '@mui/icons-material/NoteOutlined';
import axios from 'axios';
import { useDebounce } from '@/app/lib/hooks/useDebounce';

interface Person {
    id: string;
    name: string;
    role: string;
    phone?: string;
    email?: string;
    notes?: string;
    partners: { id: string; name: string }[];
    features: { id: string; name: string }[];
}

interface PeopleResponse {
  data: Person[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function PeoplePage() {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 500);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Person | undefined>(undefined);
    
    // Pagination State
    const [page, setPage] = useState(0); // MUI is 0-indexed
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const queryClient = useQueryClient();

    const { data: response, isLoading } = useQuery<PeopleResponse>({
        queryKey: ['people', page, rowsPerPage, debouncedSearchQuery],
        queryFn: async () => {
             const params = new URLSearchParams({
                page: (page + 1).toString(),
                limit: rowsPerPage.toString(),
            });
            if (debouncedSearchQuery) params.append('search', debouncedSearchQuery);

            const res = await axios.get(`/api/people?${params.toString()}`);
            return res.data;
        },
         placeholderData: (previousData) => previousData,
    });

    const people = response?.data || [];
    const totalCount = response?.meta.total || 0;

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await axios.delete(`/api/people/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['people'] });
        }
    });

    const handleCreate = () => {
        setEditingPerson(undefined);
        setIsDialogOpen(true);
    };

    const handleEdit = (person: Person) => {
        setEditingPerson(person);
        setIsDialogOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this contact?')) {
            deleteMutation.mutate(id);
        }
    };

    const handlePageChange = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return (
        <Box sx={{ p: 4, width: '100%' }}>
            {isDialogOpen && (
                <PeopleDialog 
                    open={isDialogOpen} 
                    onClose={() => setIsDialogOpen(false)} 
                    onSuccess={() => queryClient.invalidateQueries({ queryKey: ['people'] })}
                    initialData={editingPerson}
                />
            )}

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
                <Box>
                    <Typography variant="h4" fontWeight={800} sx={{ color: '#111827', mb: 1, letterSpacing: '-0.02em' }}>
                        The Rolodex
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#6b7280', fontSize: 16 }}>
                        Centralized contact management for partners and internal stakeholders.
                    </Typography>
                </Box>
                <Button 
                    variant="contained" 
                    startIcon={<AddIcon />}
                    onClick={handleCreate}
                    sx={{ 
                        bgcolor: '#111827', 
                        '&:hover': { bgcolor: '#374151' },
                        textTransform: 'none',
                        borderRadius: 3,
                        px: 3,
                        py: 1.2,
                        fontSize: 14,
                        fontWeight: 600,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                >
                    Add Contact
                </Button>
            </Box>

            {/* Search */}
            <TextField
                fullWidth
                placeholder="Search by name, role, or company..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                slotProps={{
                    input: {
                        startAdornment: <SearchIcon sx={{ color: '#9ca3af', mr: 2 }} />,
                        sx: { borderRadius: 3, bgcolor: 'white', pl: 2, height: 50 }
                    }
                }}
                sx={{ 
                    mb: 4, 
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db' },
                    maxWidth: 500
                }}
            />

            {/* Content */}
            <Paper 
                elevation={0} 
                sx={{ 
                    borderRadius: 4, 
                    border: '1px solid #e5e7eb',
                    bgcolor: 'white',
                    overflow: 'hidden' 
                }}
            >
                {/* List Header */}
                <Box sx={{ 
                    display: 'flex', 
                    py: 2, 
                    px: 3, 
                    borderBottom: '1px solid #e5e7eb', 
                    bgcolor: '#f9fafb',
                    color: '#6b7280'
                }}>
                    <Typography variant="caption" fontWeight={600} sx={{ flex: 2 }}>NAME & ROLE</Typography>
                    <Typography variant="caption" fontWeight={600} sx={{ flex: 2 }}>CONTACT INFO</Typography>
                    <Typography variant="caption" fontWeight={600} sx={{ flex: 3, px: 2 }}>NOTES & CONTEXT</Typography>
                    <Box sx={{ width: 40 }} /> 
                </Box>

                {isLoading ? (
                    <Box sx={{ p: 4 }}>
                         {[1, 2, 3].map((i) => (
                             <Skeleton key={i} height={80} sx={{ mb: 1, borderRadius: 2 }} />
                         ))}
                    </Box>
                ) : people.length === 0 ? (
                     <Box sx={{ textAlign: 'center', py: 8, color: '#9ca3af' }}>
                        <PersonIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                        <Typography variant="body2">No contacts found</Typography>
                    </Box>
                ) : (
                    <Box>
                        {people.map((person) => (
                            <PersonRow 
                                key={person.id} 
                                person={person} 
                                onEdit={() => handleEdit(person)}
                                onDelete={() => handleDelete(person.id)}
                            />
                        ))}
                    </Box>
                )}

                {/* Pagination */}
                <TablePagination
                    component="div"
                    count={totalCount}
                    page={page}
                    onPageChange={handlePageChange}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleRowsPerPageChange}
                    rowsPerPageOptions={[10, 25, 50]}
                    sx={{ borderTop: '1px solid #e5e7eb' }}
                />
            </Paper>
        </Box>
    );
}

function PersonRow({ person, onEdit, onDelete }: { person: Person; onEdit: () => void; onDelete: () => void }) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    return (
        <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            p: 3, 
            borderBottom: '1px solid #f3f4f6',
            '&:last-child': { borderBottom: 'none' },
            '&:hover': { bgcolor: '#fbfbfb', '& .row-actions': { opacity: 1 } },
            transition: 'background-color 0.15s'
        }}>
            {/* Name & Role */}
            <Box sx={{ flex: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ 
                    bgcolor: generateColor(person.name), 
                    color: 'white', 
                    width: 40, 
                    height: 40,
                    fontSize: 16,
                    fontWeight: 700
                }}>
                    {person.name.charAt(0)}
                </Avatar>
                <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#111827' }}>
                        {person.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280', fontSize: 13 }}>
                        {person.role}
                    </Typography>
                </Box>
            </Box>

            {/* Contact Info */}
            <Box sx={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {person.email && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#4b5563', fontSize: 13 }}>
                        <EmailIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
                        <Typography noWrap variant="body2" sx={{ fontSize: 13 }}>{person.email}</Typography>
                    </Box>
                )}
                {person.phone && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#4b5563', fontSize: 13 }}>
                        <PhoneIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
                        <Typography variant="body2" sx={{ fontSize: 13 }}>{person.phone}</Typography>
                    </Box>
                )}
                {!person.email && !person.phone && (
                    <Typography variant="caption" sx={{ color: '#d1d5db', fontStyle: 'italic' }}>No contact info</Typography>
                )}
            </Box>

            {/* Notes */}
            <Box sx={{ flex: 3, pr: 2 }}>
                {person.notes ? (
                    <Typography variant="body2" sx={{ color: '#4b5563', fontSize: 13, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {person.notes}
                    </Typography>
                ) : (
                    <Typography variant="caption" sx={{ color: '#d1d5db', fontStyle: 'italic' }}>
                        No notes
                    </Typography>
                )}
            </Box>

            {/* Actions */}
            <Box className="row-actions" sx={{ width: 40, display: 'flex', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
                    <MoreHorizIcon sx={{ color: '#9ca3af', fontSize: 20 }} />
                </IconButton>
                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={() => setAnchorEl(null)}
                    PaperProps={{ sx: { borderRadius: 2, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' } }}
                >
                        <MenuItem onClick={() => { onEdit(); setAnchorEl(null); }} sx={{ fontSize: 13 }}>Edit</MenuItem>
                        <MenuItem onClick={() => { onDelete(); setAnchorEl(null); }} sx={{ fontSize: 13, color: 'error.main' }}>Delete</MenuItem>
                </Menu>
            </Box>
        </Box>
    );
}

function PeopleDialog({ 
    open, 
    onClose, 
    onSuccess, 
    initialData 
}: { 
    open: boolean; 
    onClose: () => void; 
    onSuccess: () => void;
    initialData?: Person;
}) {
    const isEdit = Boolean(initialData);
    const [name, setName] = useState(initialData?.name || '');
    const [role, setRole] = useState(initialData?.role || '');
    const [email, setEmail] = useState(initialData?.email || '');
    const [phone, setPhone] = useState(initialData?.phone || '');
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const payload = { name, role, email, phone, notes };
            
            if (isEdit && initialData) {
                await axios.put(`/api/people/${initialData.id}`, payload);
            } else {
                await axios.post('/api/people', payload);
            }
            
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to save person', error);
            alert('Failed to save person');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="sm" 
            fullWidth
            PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
        >
             <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>
                 {isEdit ? 'Edit Contact' : 'Add New Contact'}
             </DialogTitle>
             <DialogContent>
                 <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                     <TextField 
                        label="Full Name" 
                        fullWidth 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        InputProps={{ sx: { borderRadius: 2 } }}
                    />
                     <TextField 
                        label="Role / Title" 
                        fullWidth 
                        value={role} 
                        onChange={e => setRole(e.target.value)} 
                        placeholder="e.g. Solution Architect"
                        InputProps={{ sx: { borderRadius: 2 } }}
                    />
                     <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField 
                            label="Email Address" 
                            fullWidth 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            InputProps={{ sx: { borderRadius: 2 } }}
                        />
                        <TextField 
                            label="Phone Number" 
                            fullWidth 
                            value={phone} 
                            onChange={e => setPhone(e.target.value)} 
                            InputProps={{ sx: { borderRadius: 2 } }}
                        />
                     </Box>
                     <TextField 
                        label="Notes (Context, Availability, etc.)"
                        fullWidth 
                        multiline
                        minRows={3}
                        value={notes} 
                        onChange={e => setNotes(e.target.value)} 
                        placeholder="E.g. Only contact during business hours. Key decision maker for payments."
                        InputProps={{ sx: { borderRadius: 2 } }}
                    />
                 </Box>
             </DialogContent>
             <DialogActions sx={{ p: 3, pt: 1 }}>
                 <Button onClick={onClose} disabled={loading} sx={{ borderRadius: 2, color: '#6b7280', textTransform: 'none' }}>
                     Cancel
                 </Button>
                 <Button 
                    variant="contained" 
                    onClick={handleSubmit} 
                    disabled={loading || !name || !role} 
                    sx={{ 
                        bgcolor: 'black', 
                        borderRadius: 2, 
                        textTransform: 'none',
                        px: 4,
                        '&:hover': { bgcolor: '#374151' }
                    }}
                >
                     {loading ? 'Saving...' : (isEdit ? 'Update Contact' : 'Create Contact')}
                 </Button>
             </DialogActions>
        </Dialog>
    );
}

// Generate consistent colors from names
const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];
function generateColor(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLORS[Math.abs(hash) % COLORS.length];
}
