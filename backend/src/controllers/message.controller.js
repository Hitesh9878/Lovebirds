import Message from '../models/Message.js';
import User from '../models/User.js';
import { uploadProfilePhotoToDrive } from '../services/googleDrive.js';

// Existing uploadAttachment function
export const uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const fileUrl = await uploadProfilePhotoToDrive(req.file);

    if (!fileUrl) {
      return res.status(500).json({ message: 'Failed to upload file to Google Drive.' });
    }

    res.status(201).json({
      message: 'File uploaded successfully',
      fileUrl: fileUrl,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Failed to upload file.' });
  }
};

// ------------------------------------------------------------
// NEW: Fetch chat messages for a specific chat
export const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    // Fetch all messages for this chat, sorted by creation time
    const messages = await Message.find({ chatId })
      .sort({ createdAt: 1 })
      .populate('sender', 'name avatar');

    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ message: 'Failed to fetch chat messages.' });
  }
};

// ------------------------------------------------------------
// NEW: Delete entire chat history
export const deleteChatHistory = async (req, res) => {
  try {
    const { chatId } = req.params;

    // Delete all messages in this chat
    await Message.deleteMany({ chatId });

    res.status(200).json({ message: 'Chat history deleted successfully.' });
  } catch (error) {
    console.error('Error deleting chat history:', error);
    res.status(500).json({ message: 'Failed to delete chat history.' });
  }
};
