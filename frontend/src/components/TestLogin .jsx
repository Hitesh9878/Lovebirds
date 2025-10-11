// Test Login Component - Add this temporarily to debug login
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const TestLogin = () => {
    const [email, setEmail] = useState('hiteshbonakurthi@gmail.com'); // Pre-filled with your email
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        console.log('🔑 Attempting login with:', { email, password: '***' });

        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            console.log('📡 Login response status:', response.status);
            console.log('📡 Login response ok:', response.ok);

            const data = await response.json();
            console.log('📡 Login response data:', data);

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // Debug the exact structure we received
            console.log('🔍 Checking response structure:', {
                hasUser: !!data.user,
                hasToken: !!data.token,
                hasAccessToken: !!data.accessToken,
                dataKeys: Object.keys(data)
            });

            // Handle different possible response structures
            let user, token;
            
            if (data.user && data.token) {
                // Structure: { user: {...}, token: "..." }
                user = data.user;
                token = data.token;
            } else if (data.user && data.accessToken) {
                // Structure: { user: {...}, accessToken: "..." }
                user = data.user;
                token = data.accessToken;
            } else if (data.token && !data.user) {
                // Structure: { token: "...", name: "...", email: "..." }
                // User data is mixed with token
                token = data.token;
                user = {
                    _id: data._id || data.id,
                    name: data.name,
                    email: data.email,
                    avatar: data.avatar
                };
            } else if (typeof data === 'string') {
                // Structure: Just a token string
                token = data;
                // We'll need to decode it or make another API call
                console.error('❌ Only token returned, no user data');
                throw new Error('Invalid response format');
            } else {
                console.error('❌ Unknown response structure:', data);
                throw new Error('Invalid server response format');
            }

            console.log('✅ Parsed login data:', {
                user: user,
                token: token ? 'Present' : 'Missing'
            });

            // Call the login function from AuthContext
            login(user, token);

            console.log('✅ Login function called, user should be set now');

        } catch (err) {
            console.error('❌ Login error:', err);
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ 
            maxWidth: '400px', 
            margin: '50px auto', 
            padding: '20px',
            border: '1px solid #ccc',
            borderRadius: '8px'
        }}>
            <h2>Debug Login</h2>
            
            {error && (
                <div style={{ 
                    color: 'red', 
                    marginBottom: '15px',
                    padding: '10px',
                    border: '1px solid red',
                    borderRadius: '4px',
                    backgroundColor: '#ffebee'
                }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '15px' }}>
                    <label>Email:</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ 
                            width: '100%', 
                            padding: '8px',
                            marginTop: '5px',
                            border: '1px solid #ccc',
                            borderRadius: '4px'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label>Password:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ 
                            width: '100%', 
                            padding: '8px',
                            marginTop: '5px',
                            border: '1px solid #ccc',
                            borderRadius: '4px'
                        }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: loading ? '#ccc' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>

            <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
                <strong>Debug Info:</strong>
                <pre style={{ 
                    backgroundColor: '#f5f5f5', 
                    padding: '10px',
                    overflow: 'auto',
                    fontSize: '11px'
                }}>
                    Token: {localStorage.getItem('token') ? 'Present' : 'None'}
                    {'\n'}User: {localStorage.getItem('user') ? 'Present' : 'None'}
                </pre>
            </div>
        </div>
    );
};

export default TestLogin;