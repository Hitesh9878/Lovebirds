// src/services/incognitoCleanup.js - AUTO-DELETE EXPIRED INCOGNITO MESSAGES
import User from '../models/User.js';
import Message from '../models/Message.js';

export const startIncognitoCleanup = (io) => {
  console.log('🕵️ Starting incognito message cleanup service...');

  // Run every 10 minutes
  const CLEANUP_INTERVAL = 10 * 60 * 1000;

  const cleanupExpiredMessages = async () => {
    try {
      console.log('🧹 Running incognito cleanup...');

      // Get all users with active incognito chats
      const usersWithIncognito = await User.find({
        'incognitoChats.0': { $exists: true }
      });

      let totalDeleted = 0;

      for (const user of usersWithIncognito) {
        const now = new Date();

        // Find expired incognito chats
        const expiredChats = user.incognitoChats.filter(
          ic => ic.expiresAt && ic.expiresAt < now
        );

        if (expiredChats.length > 0) {
          for (const expiredChat of expiredChats) {
            // Delete messages from this chat that were sent after incognito was enabled
            const result = await Message.deleteMany({
              chatId: expiredChat.chatId,
              createdAt: { $gte: expiredChat.enabledAt }
            });

            totalDeleted += result.deletedCount;

            // Notify users in the chat
            io.to(expiredChat.chatId).emit('incognitoExpired', {
              chatId: expiredChat.chatId,
              deletedCount: result.deletedCount,
              message: 'Incognito mode expired. Messages have been deleted.'
            });

            console.log(
              `🗑️ Deleted ${result.deletedCount} messages from incognito chat ${expiredChat.chatId}`
            );
          }

          // Remove expired incognito chats from user
          user.incognitoChats = user.incognitoChats.filter(
            ic => ic.expiresAt && ic.expiresAt >= now
          );

          await user.save();
        }
      }

      if (totalDeleted > 0) {
        console.log(`✅ Incognito cleanup complete. Deleted ${totalDeleted} messages.`);
      }
    } catch (error) {
      console.error('❌ Error in incognito cleanup:', error);
    }
  };

  // Run immediately on startup
  cleanupExpiredMessages();

  // Then run at regular intervals
  setInterval(cleanupExpiredMessages, CLEANUP_INTERVAL);

  return cleanupExpiredMessages;
};

// Export for manual triggering if needed
export const manualIncognitoCleanup = async (io) => {
  await startIncognitoCleanup(io)();
};