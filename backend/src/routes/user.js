// --- FILENAME: backend/src/routes/user.js ---

import express from 'express';
import { getAllUsers } from '../controllers/user.controller.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// This route will be protected, so only logged-in users can see other users
router.get('/', protect, getAllUsers);

export default router;