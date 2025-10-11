// routes/user.routes.js
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middlewares/auth.js';
import { upload } from '../services/cloudinaryService.js';

const router = express.Router();

// PATCH /api/users/profile - Update user profile
router.patch('/profile', protect, upload.single('avatar'), async (req, res) => {
  try {
    const { name } = req.body;
    const updateData = {};

    if (name && name.trim() !== '') {
      updateData.name = name.trim();
    }
    
    if (req.file) {
      updateData.avatar = req.file.path;
    }

    // Validate that there's something to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No data provided for update' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Profile update error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error during profile update' });
  }
});

export default router;