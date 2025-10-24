import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { name, email, picture, sub: googleId } = ticket.getPayload();

    let user = await User.findOne({ googleId });

    if (!user) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: "An account with this email already exists. Please log in with your password." });
      }
      
      user = await User.create({
        googleId,
        name,
        email,
        avatar: picture,
      });
    }

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const userToReturn = { _id: user._id, name: user.name, email: user.email, avatar: user.avatar, googleId: user.googleId };
    res.status(200).json({ token: jwtToken, user: userToReturn });

  } catch (error) {
    console.error('DATABASE or GOOGLE LOGIN ERROR:', error);
    res.status(500).json({ message: "Server error during Google Sign-In." });
  }
};

// ✅ FIXED: Remove manual password hashing
export const signUp = async (req, res) => {
    const { name, email, password } = req.body;
    
    console.log('📝 [SIGNUP] Received signup request:', { name, email });
    
    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            console.log('❌ [SIGNUP] User already exists:', email);
            return res.status(400).json({ message: "User with this email already exists." });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            console.log('❌ [SIGNUP] Weak password');
            return res.status(400).json({ 
                message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character." 
            });
        }

        // ✅ FIX: Pass plain password - User model will hash it
        const user = await User.create({
            name,
            email,
            password: password, // Plain password
            avatar: req.file ? req.file.path : null
        });

        console.log('✅ [SIGNUP] User created successfully:', user._id);

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        const userToReturn = { 
            _id: user._id, 
            name: user.name, 
            email: user.email, 
            avatar: user.avatar 
        };

        res.status(201).json({ token, user: userToReturn });

    } catch (error) {
        console.error('❌ [SIGNUP] Database error:', error);
        res.status(500).json({ message: "Server error during sign up." });
    }
};

// ✅ FIXED: Use matchPassword method
export const directLogin = async (req, res) => {
    const { email, password } = req.body;
    
    console.log('🔐 [LOGIN] Login attempt for:', email);
    
    try {
        const user = await User.findOne({ email });
        
        if (!user) {
            console.log('❌ [LOGIN] User not found:', email);
            return res.status(401).json({ message: "Invalid credentials" });
        }

        if (!user.password) {
            console.log('❌ [LOGIN] User has no password (Google user):', email);
            return res.status(401).json({ message: "Invalid credentials or user signed up with Google." });
        }

        console.log('🔍 [LOGIN] Comparing passwords...');
        
        // ✅ Use matchPassword method from User model
        const isMatch = await user.matchPassword(password);
        
        if (!isMatch) {
            console.log('❌ [LOGIN] Password mismatch for:', email);
            return res.status(401).json({ message: "Invalid credentials" });
        }

        console.log('✅ [LOGIN] Password matched successfully');

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        const userToReturn = { 
            _id: user._id, 
            name: user.name, 
            email: user.email, 
            avatar: user.avatar, 
            googleId: user.googleId,
            isOnline: user.isOnline,
            status: user.status
        };

        console.log('✅ [LOGIN] Login successful for:', email);
        res.status(200).json({ token, user: userToReturn });

    } catch (error) {
        console.error('❌ [LOGIN] Database error:', error);
        res.status(500).json({ message: "Server error during login." });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('GETME ERROR:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
