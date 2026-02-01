'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, TextField, Typography, Alert, Link as MuiLink } from '@mui/material';
import Link from 'next/link';
import axios from 'axios';

export default function RegisterPage() {
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const res = await axios.post('/api/auth/register', formData);
            setSuccess(res.data.message);
            // Optional: Redirect after delay?
        } catch (err: any) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box 
            sx={{ 
                minHeight: '100vh', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                bgcolor: 'background.default'
            }}
        >
            <Box 
                component="form" 
                onSubmit={handleRegister}
                sx={{ 
                    width: '100%', 
                    maxWidth: 400, 
                    p: 4, 
                    textAlign: 'center' 
                }}
            >
                <Typography variant="h4" fontWeight={700} sx={{ mb: 1, letterSpacing: -1 }}>
                    Register
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                    Create your account to access Integron.
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

                <TextField
                    label="Name"
                    fullWidth
                    variant="standard"
                    margin="normal"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                />
                <TextField
                    label="Email"
                    fullWidth
                    variant="standard"
                    margin="normal"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                />
                <TextField
                    label="Password"
                    type="password"
                    fullWidth
                    variant="standard"
                    margin="normal"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                />

                <Button 
                    type="submit" 
                    fullWidth 
                    variant="contained" 
                    disabled={loading}
                    sx={{ mt: 4, mb: 2, bgcolor: '#0f172a', py: 1.5, borderRadius: 2 }}
                >
                    {loading ? 'Creating Account...' : 'Register'}
                </Button>

                <Typography variant="body2" color="text.secondary">
                    Already have an account? <MuiLink component={Link} href="/login" underline="hover">Login</MuiLink>
                </Typography>
            </Box>
        </Box>
    );
}
