// --- FILENAME: backend/src/controllers/user.controller.js ---

import User from '../models/User.js';

export const getAllUsers = async (req, res) => {
    try {
        // Find all users but exclude the currently logged-in user from the list
        const users = await User.find({ _id: { $ne: req.user.id } }).select('-password');
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
};