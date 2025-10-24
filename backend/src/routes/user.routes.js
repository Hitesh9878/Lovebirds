// src/routes/user.routes.js - FIXED VERSION WITH CORRECT ROUTE ORDER
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory:', uploadsDir);
}

// Configure multer for avatar upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `avatar-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const multerErrorHandler = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ 
                message: 'File too large. Maximum size is 5MB.' 
            });
        }
    }
    if (err) {
        return res.status(400).json({ 
            message: err.message || 'File upload error' 
        });
    }
    next();
};

// ==================== CRITICAL: SPECIFIC ROUTES MUST COME BEFORE DYNAMIC ROUTES ====================

// Get user's friends list (MUST BE BEFORE /:id)
router.get('/friends/list', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('friends', 'name email avatar isOnline lastSeen status');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user.friends || []);
    } catch (error) {
        console.error('Error fetching friends:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Search for users - MAIN ENDPOINT (MUST BE BEFORE /:id)
router.get('/search/users', authenticateToken, async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.trim().length === 0) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        console.log('🔍 Searching users for query:', q);
        console.log('👤 Current user:', currentUser.name, currentUser._id);
        console.log('👥 Current friends:', currentUser.friends?.length || 0);
        console.log('🚫 Blocked users:', currentUser.blockedUsers?.length || 0);

        // Convert friends array to strings for comparison
        const friendIds = (currentUser.friends || []).map(id => id.toString());
        const blockedIds = (currentUser.blockedUsers || []).map(id => id.toString());

        console.log('👥 Friend IDs:', friendIds);
        console.log('🚫 Blocked IDs:', blockedIds);

        // Build search query - ONLY exclude self, blocked, and blockers
        // DO NOT exclude friends here - let frontend handle that
        const searchQuery = {
            $and: [
                {
                    $or: [
                        { name: { $regex: q, $options: 'i' } },
                        { email: { $regex: q, $options: 'i' } }
                    ]
                },
                { _id: { $ne: req.user.id } }, // Exclude self
                { _id: { $nin: currentUser.blockedUsers || [] } }, // Exclude blocked
                { blockedUsers: { $nin: [req.user.id] } } // Exclude users who blocked me
            ]
        };

        const users = await User.find(searchQuery)
            .select('name email avatar isOnline lastSeen')
            .limit(20);

        console.log('✅ Found users (before friend filter):', users.length);

        // Add friendship status to each user
        const usersWithStatus = users.map(user => ({
            _id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen,
            isFriend: friendIds.includes(user._id.toString())
        }));

        console.log('✅ Users with status:');
        usersWithStatus.forEach(user => {
            console.log(`   - ${user.name} (${user.email}) - Friend: ${user.isFriend}`);
        });

        res.json(usersWithStatus);
    } catch (error) {
        console.error('❌ Error searching users:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// Alternative search endpoint - FALLBACK (MUST BE BEFORE /:id)
router.get('/search', authenticateToken, async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.trim().length === 0) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        console.log('🔍 Simple search for:', q);

        // Convert friends array to strings for comparison
        const friendIds = (currentUser.friends || []).map(id => id.toString());
        const blockedIds = (currentUser.blockedUsers || []).map(id => id.toString());

        // Search - only exclude self and blocked users
        const users = await User.find({
            $and: [
                {
                    $or: [
                        { name: { $regex: q, $options: 'i' } },
                        { email: { $regex: q, $options: 'i' } }
                    ]
                },
                { _id: { $ne: req.user.id } }, // Only exclude self
                { _id: { $nin: currentUser.blockedUsers || [] } }, // Exclude blocked
                { blockedUsers: { $nin: [req.user.id] } } // Exclude users who blocked me
            ]
        })
        .select('name email avatar isOnline lastSeen')
        .limit(20);

        // Add friendship status
        const usersWithStatus = users.map(user => ({
            _id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen,
            isFriend: friendIds.includes(user._id.toString())
        }));

        console.log('🔍 Simple search found:', usersWithStatus.length, 'users');
        res.json(usersWithStatus);
    } catch (error) {
        console.error('❌ Error in simple search:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// Get blocked users (MUST BE BEFORE /:id)
router.get('/blocked/list', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('blockedUsers', 'name email avatar');
        
        res.json(user.blockedUsers || []);
    } catch (error) {
        console.error('Error fetching blocked users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user status (MUST BE BEFORE /:id)
router.patch('/status/update', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['online', 'away', 'busy', 'offline'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { status },
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user profile (MUST BE BEFORE /:id)
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Update profile route (MUST BE BEFORE /:id)
router.patch('/profile', authenticateToken, upload.single('avatar'), multerErrorHandler, async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user.id;

        console.log('📤 Profile update request:');
        console.log('📤 User ID:', userId);
        console.log('📤 Name:', name);
        console.log('📤 File:', req.file ? req.file.filename : 'None');

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Name is required' });
        }

        const updateData = { name: name.trim() };

        if (req.file) {
            const avatarUrl = `/uploads/${req.file.filename}`;
            updateData.avatar = avatarUrl;
            console.log('📤 Avatar URL:', avatarUrl);
        }

        const user = await User.findByIdAndUpdate(userId, updateData, { new: true });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        console.log('✅ Profile updated:', {
            name: user.name,
            avatar: user.avatar
        });

        res.json(user);
    } catch (error) {
        console.error('❌ Profile update error:', error);
        res.status(500).json({ message: error.message });
    }
});

// ==================== DYNAMIC ROUTES (MUST BE LAST) ====================

// Get all users (AFTER all specific routes)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.user.id } }).select('name avatar email isOnline lastSeen');
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get user by ID (MUST BE LAST - it matches any string after /api/users/)
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('name avatar email isOnline lastSeen');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: error.message });
    }
});

export default router;