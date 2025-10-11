// src/routes/chatRoutes.js
import express from 'express';
import Message from '../models/Message.js';
import { protect } from '../middleware/auth.js'; // Assuming you have auth middleware

const router = express.Router();

// GET /api/chats/:userId/messages - Get chat history between current user and another user
router.get('/:userId/messages', protect, async (req, res) => {
    try {
        const { userId } = req.params; // Other user's ID
        const currentUserId = req.user._id; // Current user's ID from auth middleware
        const { page = 1, limit = 50 } = req.query;

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Find messages between these two users
        const messages = await Message.find({
            $or: [
                { sender: currentUserId, chatId: userId },
                { sender: userId, chatId: currentUserId }
            ]
        })
        .populate('sender', 'name avatar')
        .sort({ createdAt: -1 }) // Newest first for pagination
        .limit(parseInt(limit))
        .skip(skip);

        // Reverse to show oldest first in the UI
        const reversedMessages = messages.reverse();

        // Get total count for pagination info
        const total = await Message.countDocuments({
            $or: [
                { sender: currentUserId, chatId: userId },
                { sender: userId, chatId: currentUserId }
            ]
        });

        res.json({
            success: true,
            messages: reversedMessages,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalMessages: total,
                hasMore: skip + messages.length < total
            }
        });
    } catch (error) {
        console.error('Error fetching chat messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch chat messages',
            error: error.message
        });
    }
});

// GET /api/chats - Get list of recent chats
router.get('/', protect, async (req, res) => {
    try {
        const currentUserId = req.user._id;

        // Get the latest message with each user
        const recentMessages = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { sender: currentUserId },
                        { chatId: currentUserId }
                    ]
                }
            },
            {
                $addFields: {
                    otherUserId: {
                        $cond: {
                            if: { $eq: ['$sender', currentUserId] },
                            then: '$chatId',
                            else: '$sender'
                        }
                    }
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $group: {
                    _id: '$otherUserId',
                    lastMessage: { $first: '$$ROOT' },
                    lastMessageTime: { $first: '$createdAt' }
                }
            },
            {
                $sort: { lastMessageTime: -1 }
            }
        ]);

        // Populate user information for each chat
        await Message.populate(recentMessages, [
            { path: '_id', select: 'name avatar isOnline lastSeen' },
            { path: 'lastMessage.sender', select: 'name avatar' }
        ]);

        res.json({
            success: true,
            chats: recentMessages
        });
    } catch (error) {
        console.error('Error fetching recent chats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent chats',
            error: error.message
        });
    }
});

export default router;