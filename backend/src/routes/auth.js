import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { googleLogin, getMe, signUp, directLogin } from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.js';
import { upload } from '../services/cloudinaryService.js'; // ✅ Use Cloudinary upload
import { sendPasswordResetEmail } from '../services/emailService.js';

const router = express.Router();

// -------------------- OTP Store --------------------
const otpStore = new Map();
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// -------------------- Auth Routes --------------------
router.post('/google', googleLogin);

// ✅ Now avatar upload will go directly to Cloudinary
router.post('/signup', upload.single('avatar'), signUp);

router.post('/login', directLogin);
router.get('/me', protect, getMe);

// -------------------- Forgot Password --------------------
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(200).json({
                message: 'If the email exists, a verification code has been sent'
            });
        }

        const otp = generateOTP();
        otpStore.set(email, { otp, expiry: Date.now() + 10 * 60 * 1000 }); // 10 minutes

        const emailSent = await sendPasswordResetEmail(email, user.name, otp);
        if (!emailSent) {
            return res.status(500).json({ message: 'Failed to send verification email' });
        }

        res.status(200).json({
            message: 'Verification code sent to your email',
            ...(process.env.NODE_ENV === 'development' && { otp })
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// -------------------- Verify OTP --------------------
router.post('/verify-otp', (req, res) => {
    try {
        const { email, otp } = req.body;
        const storedOtp = otpStore.get(email);

        if (!storedOtp) return res.status(400).json({ message: 'OTP not found or expired' });
        if (Date.now() > storedOtp.expiry) {
            otpStore.delete(email);
            return res.status(400).json({ message: 'OTP has expired' });
        }
        if (storedOtp.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });

        res.status(200).json({ message: 'OTP verified successfully' });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// -------------------- Reset Password --------------------
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const storedOtp = otpStore.get(email);

        if (!storedOtp || storedOtp.otp !== otp || Date.now() > storedOtp.expiry) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        otpStore.delete(email);

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});



export default router;
