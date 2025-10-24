// src/models/ChatRequest.js - NEW MODEL FOR CHAT REQUESTS
import mongoose from 'mongoose';

const chatRequestSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for faster queries
chatRequestSchema.index({ sender: 1, receiver: 1 });
chatRequestSchema.index({ status: 1 });

const ChatRequest = mongoose.model('ChatRequest', chatRequestSchema);
export default ChatRequest;