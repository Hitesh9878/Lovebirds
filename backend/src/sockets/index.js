import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import { sendNewMessageEmail } from '../services/emailService.js';

const userSockets = new Map();
const userActivity = new Map();
const typingUsers = new Map(); // Track typing status

const getChatId = (userA, userB) => [userA, userB].sort().join('_');

const isUserInChat = (chatId, userId) => {
  const users = chatId.split('_');
  return users.includes(userId);
};

export const initializeSocket = (io) => {
  console.log("🚀 Socket server starting...");

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('No token provided'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      console.error('Auth error:', err.message);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    const userName = socket.user.name;

    console.log(`✅ User connected: ${userName} (${userId})`);
    userSockets.set(userId, socket.id);
    
    userActivity.set(userId, {
      sessionStart: new Date(),
      lastActivity: new Date()
    });

    console.log("👥 Active sockets map:", Array.from(userSockets.entries()));

    try {
      await User.findByIdAndUpdate(userId, { isOnline: true });
      io.emit('userStatus', { userId, isOnline: true });

      const undeliveredMessages = await Message.find({
        $or: [
          { chatId: { $regex: `_${userId}$` } },
          { chatId: { $regex: `^${userId}_` } }
        ],
        sender: { $ne: userId },
        isDelivered: false 
      });

      for (const msg of undeliveredMessages) {
        if (isUserInChat(msg.chatId, userId)) {
          msg.isDelivered = true;
          msg.deliveredAt = new Date();
          await msg.save();

          const senderSocketId = userSockets.get(msg.sender.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit('messageDelivered', {
              messageId: msg._id,
              deliveredAt: msg.deliveredAt,
              chatId: msg.chatId
            });
          }
        }
      }

      const readMessages = await Message.find({
        $or: [
          { chatId: { $regex: `_${userId}$` } },
          { chatId: { $regex: `^${userId}_` } }
        ],
        sender: { $ne: userId },
        isRead: true
      }).populate('sender', '_id');

      readMessages.forEach(msg => {
        if (isUserInChat(msg.chatId, userId)) {
          const senderSocketId = userSockets.get(msg.sender._id.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit('messageRead', {
              messageId: msg._id,
              readAt: msg.readAt,
              chatId: msg.chatId
            });
          }
        }
      });

    } catch (error) {
      console.error('Error updating user status:', error);
    }

    socket.on('joinChat', (chatId) => {
      console.log(`📌 User ${userName} joined chat room ${chatId}`);
      socket.join(chatId);
    });

    socket.on('loadMessages', async (data) => {
      try {
        const { otherUserId } = data;
        const chatId = getChatId(userId, otherUserId);
        
        console.log(`📚 Loading messages for chat: ${chatId}`);
        
        const messages = await Message.find({ chatId })
          .populate('sender', 'name avatar')
          .sort({ createdAt: 1 })
          .limit(50);

        const messagesWithStatus = messages.map(msg => ({
          _id: msg._id,
          sender: msg.sender,
          chatId: msg.chatId,
          messageType: msg.messageType,
          content: msg.content,
          createdAt: msg.createdAt,
          isDelivered: msg.isDelivered || false,
          isRead: msg.isRead || false,
          deliveredAt: msg.deliveredAt,
          readAt: msg.readAt
        }));

        socket.emit('messagesLoaded', {
          chatId,
          messages: messagesWithStatus
        });

        console.log(`📚 Sent ${messagesWithStatus.length} messages for chat ${chatId}`);
      } catch (error) {
        console.error('Error loading messages:', error);
        socket.emit('messagesLoadError', { message: 'Failed to load messages' });
      }
    });

    socket.on('loadRecentChats', async () => {
      try {
        console.log(`📚 Loading recent chats for user: ${userId}`);
        
        const recentMessages = await Message.aggregate([
          {
            $match: {
              $or: [
                { sender: socket.user._id },
                { chatId: { $regex: userId } }
              ]
            }
          },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: '$chatId',
              lastMessage: { $first: '$$ROOT' },
              messageCount: { $sum: 1 }
            }
          },
          { $sort: { 'lastMessage.createdAt': -1 } }
        ]);

        await Message.populate(recentMessages, {
          path: 'lastMessage.sender',
          select: 'name avatar'
        });

        socket.emit('recentChatsLoaded', recentMessages);
        console.log(`📚 Sent ${recentMessages.length} recent chats`);
        
      } catch (error) {
        console.error('Error loading recent chats:', error);
      }
    });

    socket.on('clearChat', async (data) => {
      try {
        const { otherUserId } = data;
        const chatId = getChatId(userId, otherUserId);
        
        console.log(`🗑️ Clearing chat: ${chatId}`);
        
        await Message.deleteMany({ chatId });
        
        io.to(chatId).emit('chatCleared', { chatId });
        
        socket.emit('chatClearSuccess', { chatId });
        console.log(`🗑️ Chat cleared: ${chatId}`);
        
      } catch (error) {
        console.error('Error clearing chat:', error);
        socket.emit('chatClearError', { message: 'Failed to clear chat' });
      }
    });

    socket.on('sendMessage', async (data) => {
      console.log(`📨 Message from ${userName}:`, data);

      if (userActivity.has(userId)) {
        userActivity.get(userId).lastActivity = new Date();
      }

      try {
        const { receiverId, content, tempId, messageType = 'text' } = data;
        if (!receiverId || !content) {
          socket.emit('sendMessageError', { message: 'Invalid message data', tempId });
          return;
        }

        const chatId = getChatId(userId, receiverId);
        
        const receiverSocketId = userSockets.get(receiverId);
        const isRecipientOnline = !!receiverSocketId;

        // ✅ Use messageType directly - 'voice' is now supported in Message model
        console.log(`📨 Message type received: ${messageType}`);
        
        if (messageType === 'voice') {
          console.log(`🎙️ Voice message from ${userName} to ${receiverId}`);
        } else if (messageType === 'image') {
          console.log(`🖼️ Image message from ${userName}`);
        } else if (messageType === 'video') {
          console.log(`🎬 Video message from ${userName}`);
        }

        const message = await Message.create({
          sender: userId,
          chatId,
          messageType: messageType, // Use original messageType
          content: content,
          isDelivered: isRecipientOnline,
          isRead: false,
          deliveredAt: isRecipientOnline ? new Date() : null,
          readAt: null
        });

        await message.populate('sender', 'name avatar');

        // Message object for frontend
        const messageObj = {
          _id: message._id,
          sender: message.sender,
          chatId: chatId,
          messageType: message.messageType,
          content: message.content,
          createdAt: message.createdAt,
          tempId,
          isDelivered: message.isDelivered,
          isRead: message.isRead,
          deliveredAt: message.deliveredAt,
          readAt: message.readAt
        };

        console.log(`📤 Broadcasting message to room: ${chatId}, recipient online: ${isRecipientOnline}`);
        
        // Broadcast to chat room
        io.to(chatId).emit('receiveMessage', messageObj);

        // Update sidebar for recipient
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('newMessageForSidebar', {
            ...messageObj,
            fromUserId: userId,
            forSidebar: true
          });
        }

        // Confirm message sent to sender
        socket.emit('messageSent', {
          messageId: message._id,
          tempId,
          success: true,
          isDelivered: message.isDelivered,
          deliveredAt: message.deliveredAt
        });

        // If recipient is online, mark as delivered immediately
        if (isRecipientOnline) {
          socket.emit('messageDelivered', {
            messageId: message._id,
            deliveredAt: message.deliveredAt,
            chatId: chatId
          });
        } else {
          // Send email notification if recipient is offline
          try {
            const recipient = await User.findById(receiverId);
            if (recipient && recipient.email) {
              await sendNewMessageEmail(recipient.email, userName);
              console.log(`📧 Email notification sent to ${recipient.email}`);
            }
          } catch (emailError) {
            console.error('Email notification failed:', emailError);
          }
        }

      } catch (error) {
        console.error('❌ Send message error:', error);
        console.error('❌ Error details:', error.message);
        
        // Enhanced error logging for voice messages
        if (data.messageType === 'voice') {
          console.error('❌ Voice message failed - Check Message model enum includes "voice"');
        }
        
        socket.emit('sendMessageError', {
          message: 'Failed to send message: ' + error.message,
          tempId: data.tempId
        });
      }
    });

    // ✅ IMPROVED TYPING INDICATOR: User starts typing
    socket.on('userTyping', (data) => {
      const { recipientId } = data;
      if (!recipientId) {
        console.log('⚠️ userTyping: No recipientId provided');
        return;
      }

      const recipientSocketId = userSockets.get(recipientId);
      if (recipientSocketId) {
        console.log(`⌨️ ${userName} is typing to user ${recipientId}`);
        io.to(recipientSocketId).emit('userTyping', { 
          senderId: userId,
          senderName: userName
        });
        
        // Set timeout to auto-stop typing after 3 seconds
        const typingTimeout = setTimeout(() => {
          console.log(`⏰ Auto-stop typing for ${userName}`);
          io.to(recipientSocketId).emit('stopTyping', { 
            senderId: userId
          });
        }, 3000);
        
        // Store timeout reference
        if (socket.typingTimeout) {
          clearTimeout(socket.typingTimeout);
        }
        socket.typingTimeout = typingTimeout;
      } else {
        console.log(`⚠️ Recipient ${recipientId} is not online`);
      }
    });

    // ✅ IMPROVED TYPING INDICATOR: User stops typing
    socket.on('stopTyping', (data) => {
      const { recipientId } = data;
      if (!recipientId) {
        console.log('⚠️ stopTyping: No recipientId provided');
        return;
      }

      const recipientSocketId = userSockets.get(recipientId);
      if (recipientSocketId) {
        console.log(`✋ ${userName} stopped typing to user ${recipientId}`);
        io.to(recipientSocketId).emit('stopTyping', { 
          senderId: userId
        });
        
        // Clear any existing typing timeout
        if (socket.typingTimeout) {
          clearTimeout(socket.typingTimeout);
          socket.typingTimeout = null;
        }
      }
    });

    socket.on('markMessageAsRead', async (data) => {
      try {
        const { messageId, senderId } = data;
        
        const message = await Message.findById(messageId);
        if (!message) {
          console.error('Message not found:', messageId);
          return;
        }

        if (!isUserInChat(message.chatId, userId)) {
          console.error('User not authorized to mark this message as read');
          return;
        }

        const updatedMessage = await Message.findByIdAndUpdate(
          messageId,
          { 
            isRead: true, 
            readAt: new Date() 
          },
          { new: true }
        );

        if (updatedMessage) {
          console.log(`✅ Message ${messageId} marked as read by ${userName}`);
          
          io.to(message.chatId).emit('messageRead', {
            messageId,
            readAt: updatedMessage.readAt,
            chatId: message.chatId,
            readBy: userId
          });
        }
      } catch (error) {
        console.error('❌ Error marking message as read:', error);
      }
    });

    socket.on('markChatAsRead', async (data) => {
      try {
        const { otherUserId } = data;
        const chatId = getChatId(userId, otherUserId);
        
        const result = await Message.updateMany(
          { 
            chatId, 
            sender: otherUserId,
            isRead: false 
          },
          { 
            isRead: true, 
            readAt: new Date() 
          }
        );

        console.log(`✅ Marked ${result.modifiedCount} messages as read in chat ${chatId} by ${userName}`);
        
        if (result.modifiedCount > 0) {
          io.to(chatId).emit('chatRead', {
            chatId,
            readAt: new Date(),
            readCount: result.modifiedCount,
            readBy: userId
          });

          const updatedMessages = await Message.find({
            chatId,
            sender: otherUserId,
            isRead: true,
            readAt: { $gte: new Date(Date.now() - 1000) }
          });

          updatedMessages.forEach(msg => {
            io.to(chatId).emit('messageRead', {
              messageId: msg._id,
              readAt: msg.readAt,
              chatId: chatId,
              readBy: userId
            });
          });
        }
      } catch (error) {
        console.error('❌ Error marking chat as read:', error);
      }
    });

    socket.on('userActivity', () => {
      if (userActivity.has(userId)) {
        userActivity.get(userId).lastActivity = new Date();
      }
    });

    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${userName}`);
      
      const activity = userActivity.get(userId);
      let sessionDuration = 0;
      
      if (activity) {
        sessionDuration = Math.round((new Date() - activity.sessionStart) / 1000);
        userActivity.delete(userId);
      }

      userSockets.delete(userId);
      typingUsers.delete(userId);

      // Clear typing timeout
      if (socket.typingTimeout) {
        clearTimeout(socket.typingTimeout);
      }

      try {
        const user = await User.findById(userId);
        if (user) {
          user.isOnline = false;
          user.lastSeen = new Date();
          user.lastSessionDuration = sessionDuration;
          user.totalSessionTime = (user.totalSessionTime || 0) + sessionDuration;
          await user.save();
        }
        
        io.emit('userStatus', { 
          userId, 
          isOnline: false,
          lastSeen: new Date(),
          sessionDuration
        });
        
        console.log(`📊 User ${userName} session duration: ${sessionDuration} seconds`);
      } catch (error) {
        console.error('Error on disconnect:', error);
      }
    });
  });
};