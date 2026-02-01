'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, TextField, Typography, Alert, Link as MuiLink } from '@mui/material';
import Link from 'next/link';
import axios from 'axios';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await axios.post('/api/auth/login', { email, password });
            router.push('/');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed');
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
                onSubmit={handleLogin}
                sx={{ 
                    width: '100%', 
                    maxWidth: 400, 
                    p: 4, 
                    textAlign: 'center' 
                }}
            >
                <Typography variant="h4" fontWeight={700} sx={{ mb: 4, letterSpacing: -1 }}>
                    Integron
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                <TextField
                    label="Email"
                    fullWidth
                    variant="standard"
                    margin="normal"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <TextField
                    label="Password"
                    type="password"
                    fullWidth
                    variant="standard"
                    margin="normal"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <Button 
                    type="submit" 
                    fullWidth 
                    variant="contained" 
                    disabled={loading}
                    sx={{ mt: 4, mb: 2, bgcolor: '#0f172a', py: 1.5, borderRadius: 2 }}
                >
                    {loading ? 'Logging in...' : 'Login'}
                </Button>

                <Typography variant="body2" color="text.secondary">
                    No account? <MuiLink component={Link} href="/register" underline="hover">Register here</MuiLink>
                </Typography>
            </Box>
        </Box>
    );
}
