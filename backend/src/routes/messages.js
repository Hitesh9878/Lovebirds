import express from 'express';
import multer from 'multer';
import { protect } from '../middlewares/auth.js';
import { uploadAttachment } from '../controllers/message.controller.js';
import Message from '../models/Message.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 📌 Upload attachment
router.post('/upload', protect, upload.single('file'), uploadAttachment);

// 📌 Fetch all messages for a chat
router.get('/:chatId', protect, async (req, res) => {
  try {
    const { chatId } = req.params;

    const messages = await Message.find({ chatId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 }); // oldest → newest

    res.json(messages);
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({ message: 'Failed to fetch chat history' });
  }
});

// 📌 Delete all messages for a chat (3-dot menu)
router.delete('/delete/:chatId', protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    await Message.deleteMany({ chatId });
    res.json({ message: 'Chat history deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting chat history:', error);
    res.status(500).json({ message: 'Failed to delete chat history' });
  }
});

export default router;
