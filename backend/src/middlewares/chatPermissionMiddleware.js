// src/middleware/chatPermissionMiddleware.js
import ChatRequest from '../models/ChatRequest.js';

/**
 * Middleware to check if two users can chat
 * Usage: router.post('/send', checkChatPermission, handler)
 */
export const checkChatPermission = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { receiverId } = req.body || req.params;

    if (!receiverId) {
      return res.status(400).json({ message: 'Receiver ID is required' });
    }

    // Users can't chat with themselves
    if (userId.toString() === receiverId) {
      return res.status(400).json({ message: 'Cannot chat with yourself' });
    }

    const chatRequest = await ChatRequest.findOne({
      $or: [
        { sender: userId, receiver: receiverId },
        { sender: receiverId, receiver: userId }
      ]
    });

    // If no request exists, they can't chat
    if (!chatRequest) {
      return res.status(403).json({ 
        message: 'Chat request not found. Send a request first.',
        code: 'NO_REQUEST'
      });
    }

    // If request is rejected, they can't chat
    if (chatRequest.status === 'rejected') {
      return res.status(403).json({ 
        message: 'This user rejected your chat request',
        code: 'REQUEST_REJECTED'
      });
    }

    // If blocked by the other user, they can't chat
    if (chatRequest.status === 'blocked' && 
        chatRequest.blockedBy.toString() === receiverId) {
      return res.status(403).json({ 
        message: 'You are blocked by this user',
        code: 'USER_BLOCKED'
      });
    }

    // Must be accepted to chat
    if (chatRequest.status !== 'accepted') {
      return res.status(403).json({ 
        message: 'Chat request not accepted yet',
        code: 'REQUEST_PENDING'
      });
    }

    // Attach chat request data to request object for use in handler
    req.chatRequest = chatRequest;
    next();
  } catch (error) {
    console.error('Error in chat permission middleware:', error);
    res.status(500).json({ message: 'Failed to check chat permission' });
  }
};

/**
 * Middleware to check if user can send messages in a specific chat
 */
export const verifyChatAccess = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { chatId } = req.params;

    if (!chatId) {
      return res.status(400).json({ message: 'Chat ID is required' });
    }

    // Extract user IDs from chat ID (format: userId1_userId2)
    const [user1, user2] = chatId.split('_');

    if (userId.toString() !== user1 && userId.toString() !== user2) {
      return res.status(403).json({ message: 'Access denied to this chat' });
    }

    const otherUserId = userId.toString() === user1 ? user2 : user1;

    const chatRequest = await ChatRequest.findOne({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    });

    if (!chatRequest || chatRequest.status !== 'accepted') {
      return res.status(403).json({ message: 'Not authorized for this chat' });
    }

    if (chatRequest.status === 'blocked' && 
        chatRequest.blockedBy.toString() === otherUserId) {
      return res.status(403).json({ message: 'You are blocked by this user' });
    }

    req.chatRequest = chatRequest;
    req.otherUserId = otherUserId;
    next();
  } catch (error) {
    console.error('Error in chat access middleware:', error);
    res.status(500).json({ message: 'Failed to verify chat access' });
  }
};

/**
 * Get chat permission status
 */
export const getChatPermissionStatus = async (userId, otherUserId) => {
  try {
    const chatRequest = await ChatRequest.findOne({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    });

    if (!chatRequest) {
      return {
        status: 'none',
        canChat: false,
        isBlocked: false,
        incognitoMode: false
      };
    }

    const isBlocked = chatRequest.status === 'blocked' && 
                      chatRequest.blockedBy.toString() === otherUserId;

    return {
      status: chatRequest.status,
      canChat: chatRequest.status === 'accepted' && !isBlocked,
      isBlocked,
      blockedBy: chatRequest.blockedBy,
      incognitoMode: chatRequest.incognitoMode,
      incognitoEnabledBy: chatRequest.incognitoEnabledBy,
      incognitoExpiresAt: chatRequest.incognitoExpiresAt
    };
  } catch (error) {
    console.error('Error getting chat permission status:', error);
    return {
      status: 'error',
      canChat: false,
      isBlocked: false
    };
  }
};