// src/models/Message.js
import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chatId: {
    type: String, // ✅ FIX: Allow storing custom chatId (user1_user2)
    required: true
  },
    messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'audio', 'video', 'voice'], // ✅ Added 'voice'
    default: 'text'
  },
  // Store content directly in MongoDB instead of external storage
  content: {
    text: String,
    fileUrl: String,
    fileName: String,
    fileSize: Number,
    mimeType: String
  },
  // Keep Google Drive fields as optional for backward compatibility
  googleDriveFileId: {
    type: String,
    required: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  editedAt: {
    type: Date
  },
  // NEW: Message delivery and read status fields
  isDelivered: {
    type: Boolean,
    default: false
  },
  isRead: {
    type: Boolean,
    default: false
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  readAt: {
    type: Date,
    default: null
  },
  // Keep existing readBy array for backward compatibility and multi-user support
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for efficient querying
MessageSchema.index({ chatId: 1, createdAt: -1 });
MessageSchema.index({ sender: 1 });
// NEW: Index for delivery and read status queries
MessageSchema.index({ isDelivered: 1, isRead: 1 });

export default mongoose.model('Message', MessageSchema);