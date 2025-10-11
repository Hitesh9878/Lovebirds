import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Handles user login via Google OAuth.
 * Verifies the token, finds or creates a user, and returns a JWT.
 */
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
      // Check if a user with this email already exists from a non-Google sign-up
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: "An account with this email already exists. Please log in with your password." });
      }
      
      // If no user exists, create one
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

/**
 * Handles new user registration with email, password, and profile picture.
 * Hashes the password and saves the new user to the database.
 */
export const signUp = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User with this email already exists." });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ 
                message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character." 
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            // If a file was uploaded by multer/cloudinary, its path will be in req.file.path
            avatar: req.file ? req.file.path : null
        });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        const userToReturn = { 
            _id: user._id, 
            name: user.name, 
            email: user.email, 
            avatar: user.avatar 
        };

        res.status(201).json({ token, user: userToReturn });

    } catch (error) {
        console.error('DATABASE SIGNUP ERROR:', error);
        res.status(500).json({ message: "Server error during sign up." });
    }
};

/**
 * Handles login for existing users with email and password.
 * Compares the provided password with the stored hash.
 */
export const directLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || !user.password) {
            return res.status(401).json({ message: "Invalid credentials or user signed up with Google." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const userToReturn = { _id: user._id, name: user.name, email: user.email, avatar: user.avatar, googleId: user.googleId };
        res.status(200).json({ token, user: userToReturn });

    } catch (error) {
        console.error('DATABASE LOGIN ERROR:', error);
        res.status(500).json({ message: "Server error during login." });
    }
};

/**
 * A protected route to fetch the profile of the currently authenticated user.
 */
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