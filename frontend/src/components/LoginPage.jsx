import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext.jsx';
import api from '../services/api.js';
import './LoginPage.css';

const LoginPage = () => {
    const [loginData, setLoginData] = useState({ name: '', email: '', password: '' });
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState('');
    
    // Forgot Password States
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotPasswordData, setForgotPasswordData] = useState({ email: '' });
    const [otpData, setOtpData] = useState({ otp: '', newPassword: '', confirmPassword: '' });
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    
    const { login } = useAuth();

    // Email validation regex
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Password validation regex
    const validatePassword = (password) => {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    };

    // Handle Forgot Password Request
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!validateEmail(forgotPasswordData.email)) {
            setError('Please enter a valid email address');
            setLoading(false);
            return;
        }

        try {
            await api.post('/auth/forgot-password', { email: forgotPasswordData.email });
            setOtpSent(true);
            setError('');
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    // Handle OTP Verification
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (otpData.otp.length !== 4) {
            setError('OTP must be 4 digits');
            setLoading(false);
            return;
        }

        try {
            await api.post('/auth/verify-otp', {
                email: forgotPasswordData.email,
                otp: otpData.otp
            });
            setOtpVerified(true);
            setError('');
        } catch (error) {
            setError(error.response?.data?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    // Handle Password Reset
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!validatePassword(otpData.newPassword)) {
            setError('Password must be 8+ characters with uppercase, lowercase, number & special character');
            setLoading(false);
            return;
        }

        if (otpData.newPassword !== otpData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        try {
            await api.post('/auth/reset-password', {
                email: forgotPasswordData.email,
                otp: otpData.otp,
                newPassword: otpData.newPassword
            });
            
            // Reset all states and show success
            setShowForgotPassword(false);
            setOtpSent(false);
            setOtpVerified(false);
            setForgotPasswordData({ email: '' });
            setOtpData({ otp: '', newPassword: '', confirmPassword: '' });
            setError('Password reset successfully! Please login with your new password.');
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (isSignUp) {
            if (!validatePassword(loginData.password)) {
                setError("Password must be 8+ characters and include uppercase, lowercase, number, & special character.");
                setLoading(false);
                return;
            }

            if (!validateEmail(loginData.email)) {
                setError("Please enter a valid email address");
                setLoading(false);
                return;
            }
        }
        
        try {
            if (isSignUp) {
                const formData = new FormData();
                formData.append('name', loginData.name);
                formData.append('email', loginData.email);
                formData.append('password', loginData.password);
                if (avatarFile) {
                    formData.append('avatar', avatarFile);
                }

                const { data } = await api.post('/auth/signup', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                login(data.token, data.user);
            } else {
                const payload = {email: loginData.email, password: loginData.password};
                const { data } = await api.post('/auth/login', payload);
                login(data.token, data.user);
            }
        } catch (error) {
            console.error('Login error:', error);
            setError(error.response?.data?.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setLoginData({
            ...loginData,
            [e.target.name]: e.target.value
        });
    };

    const handleForgotPasswordChange = (e) => {
        setForgotPasswordData({
            ...forgotPasswordData,
            [e.target.name]: e.target.value
        });
    };

    const handleOtpChange = (e) => {
        setOtpData({
            ...otpData,
            [e.target.name]: e.target.value
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type and size
            if (!file.type.startsWith('image/')) {
                setError('Please select an image file');
                return;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError('Image size should be less than 5MB');
                return;
            }
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
            setError('');
        }
    };

    const handleCancel = () => {
        setLoginData({ name: '', email: '', password: '' });
        setAvatarFile(null);
        setAvatarPreview('');
        setError('');
        setIsSignUp(false);
        setShowForgotPassword(false);
        setOtpSent(false);
        setOtpVerified(false);
        setForgotPasswordData({ email: '' });
        setOtpData({ otp: '', newPassword: '', confirmPassword: '' });
    };

    const goBackToLogin = () => {
        setShowForgotPassword(false);
        setOtpSent(false);
        setOtpVerified(false);
        setForgotPasswordData({ email: '' });
        setOtpData({ otp: '', newPassword: '', confirmPassword: '' });
        setError('');
    };

    const LovebirdsIcon = () => (
      <svg className="logo-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.7,21.9C9,21.5,5.2,18.8,3,15.1c-1.3-2.2-1.8-4.7-1.6-7.2c0.2-2.5,1.2-4.8,2.9-6.6 C6.1,0,8.6-0.5,11.1,0.3c1.9,0.6,3.5,1.9,4.6,3.6c-0.6-0.3-1.3-0.5-2-0.6c-2.1-0.3-4.2,0.6-5.6,2.3c-1.2,1.5-1.7,3.4-1.4,5.3 c0.3,2,1.7,3.7,3.6,4.5c0.3,0.1,0.6,0.2,0.9,0.3c-0.1,0.2-0.2,0.3-0.2,0.5c-0.6,0.9-0.8,2-0.6,3.1c0.2,1,0.8,1.9,1.6,2.6 C12.3,21.8,12.5,21.8,12.7,21.9z M21.3,12.3c-0.2-2.5-1.2-4.8-2.9-6.6c-1.8-1.8-4.1-2.7-6.5-2.5c-0.6,0-1.2,0.1-1.8,0.3 c1.2-1.9,3.1-3.2,5.3-3.6c2.5-0.5,5,0.1,6.8,1.8c1.8,1.8,2.7,4.1,2.5,6.5c-0.1,1.9-0.9,3.6-2.1,5c-0.8,0.9-1.8,1.6-2.8,2.1 c0.5,0.2,1,0.2,1.5,0.1c2.1-0.3,4-1.6,5.1-3.4C22.2,16.5,22,14.2,21.3,12.3z"/>
      </svg>
    );

    // Render Forgot Password Flow
    const renderForgotPassword = () => {
        if (!otpSent && !otpVerified) {
            return (
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="login-card">
                    <h2 className="card-title">Reset Your Password</h2>
                    <p className="card-subtitle">Enter your email to receive a verification code</p>
                    
                    {error && <div className="error-message">{error}</div>}
                    
                    <form className="login-form" onSubmit={handleForgotPassword}>
                        <input 
                            type="email" 
                            name="email" 
                            value={forgotPasswordData.email} 
                            onChange={handleForgotPasswordChange} 
                            placeholder="Enter your email" 
                            className="input-field" 
                            required 
                            disabled={loading}
                        />
                        
                        <div className="button-group">
                            <button type="button" className="cancel-button" onClick={goBackToLogin} disabled={loading}>
                                Back to Login
                            </button>
                            <button type="submit" className="submit-button" disabled={loading}>
                                {loading ? 'Sending...' : 'Send OTP'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            );
        }

        if (otpSent && !otpVerified) {
            return (
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="login-card">
                    <h2 className="card-title">Verify OTP</h2>
                    <p className="card-subtitle">Enter the 4-digit code sent to {forgotPasswordData.email}</p>
                    
                    {error && <div className="error-message">{error}</div>}
                    
                    <form className="login-form" onSubmit={handleVerifyOtp}>
                        <input 
                            type="text" 
                            name="otp" 
                            value={otpData.otp} 
                            onChange={handleOtpChange} 
                            placeholder="Enter 4-digit OTP" 
                            className="input-field" 
                            maxLength="4"
                            required 
                            disabled={loading}
                        />
                        
                        <div className="button-group">
                            <button type="button" className="cancel-button" onClick={goBackToLogin} disabled={loading}>
                                Cancel
                            </button>
                            <button type="submit" className="submit-button" disabled={loading}>
                                {loading ? 'Verifying...' : 'Verify OTP'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            );
        }

        if (otpVerified) {
            return (
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="login-card">
                    <h2 className="card-title">Create New Password</h2>
                    <p className="card-subtitle">Enter your new password</p>
                    
                    {error && <div className="error-message">{error}</div>}
                    
                    <form className="login-form" onSubmit={handleResetPassword}>
                        <input 
                            type="password" 
                            name="newPassword" 
                            value={otpData.newPassword} 
                            onChange={handleOtpChange} 
                            placeholder="New Password" 
                            className="input-field" 
                            required 
                            disabled={loading}
                        />
                        <input 
                            type="password" 
                            name="confirmPassword" 
                            value={otpData.confirmPassword} 
                            onChange={handleOtpChange} 
                            placeholder="Confirm New Password" 
                            className="input-field" 
                            required 
                            disabled={loading}
                        />
                        
                        <div className="button-group">
                            <button type="button" className="cancel-button" onClick={goBackToLogin} disabled={loading}>
                                Cancel
                            </button>
                            <button type="submit" className="submit-button" disabled={loading}>
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            );
        }
    };

    // Render Main Login/Signup Form
    const renderMainForm = () => (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="login-card">
            <h2 className="card-title">{isSignUp ? 'Create an Account' : 'Login to Lovebirds'}</h2>
            {error && <div className="error-message">{error}</div>}
            
            <form className="login-form" onSubmit={handleSubmit}>
                {isSignUp && (
                   <>
                        <div className="avatar-uploader">
                            <label htmlFor="avatar-upload" className="avatar-label">
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Avatar Preview" className="avatar-preview" />
                                ) : (
                                    <div className="avatar-placeholder">
                                        <span>+</span>
                                        <p>Add Photo</p>
                                    </div>
                                )}
                            </label>
                            <input 
                                id="avatar-upload" 
                                type="file" 
                                name="avatar" 
                                accept="image/png, image/jpeg, image/jpg, image/gif" 
                                onChange={handleFileChange} 
                                className="avatar-input"
                            />
                            {avatarPreview && (
                                <button 
                                    type="button" 
                                    className="avatar-remove"
                                    onClick={() => {
                                        setAvatarFile(null);
                                        setAvatarPreview('');
                                    }}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                        <input 
                            type="text" 
                            name="name" 
                            value={loginData.name} 
                            onChange={handleInputChange} 
                            placeholder="Your Name" 
                            className="input-field" 
                            required 
                            disabled={loading}
                        />
                    </>
                )}
                <input 
                    type="email" 
                    name="email" 
                    value={loginData.email} 
                    onChange={handleInputChange} 
                    placeholder="Email" 
                    className="input-field" 
                    required 
                    disabled={loading}
                />
                <input 
                    type="password" 
                    name="password" 
                    value={loginData.password} 
                    onChange={handleInputChange} 
                    placeholder="Password" 
                    className="input-field" 
                    required 
                    disabled={loading}
                />
                
                {!isSignUp && (
                    <div className="forgot-password-link">
                        <button 
                            type="button" 
                            onClick={() => setShowForgotPassword(true)}
                            className="forgot-password-btn"
                        >
                            Forgot your password?
                        </button>
                    </div>
                )}
                
                <div className="button-group">
                    <button type="button" className="cancel-button" onClick={handleCancel} disabled={loading}>
                        Cancel
                    </button>
                    <button type="submit" className="submit-button" disabled={loading}>
                        {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Login'}
                    </button>
                </div>
            </form>

            <div className="signup-link">
                {isSignUp ? "Already have an account? " : "Don't have an account? "}
                <button onClick={() => setIsSignUp(!isSignUp)} disabled={loading}>
                    {isSignUp ? 'Log in' : 'Sign up'}
                </button>
            </div>
        </motion.div>
    );

    return (
        <div className="login-page-container">
            <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="logo-container">
                <LovebirdsIcon />
                <h1 className="logo-title">LOVEBIRDS</h1>
                <p className="logo-tagline">Connect & Share</p>
            </motion.div>

            {showForgotPassword ? renderForgotPassword() : renderMainForm()}
        </div>
    );
};

export default LoginPage;