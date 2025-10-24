// src/middlewares/auth.js - FIXED VERSION WITH BOTH EXPORTS
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Main authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract token from header
      token = req.headers.authorization.split(' ')[1];
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token and attach to request
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      
      next();
    } catch (error) {
      console.error('Auth error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    // No token found
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

/**
 * Alternative name for the same middleware
 * Required by user.routes.js
 */
export const authenticateToken = protect;

/**
 * Default export for flexibility
 */
export default protect;