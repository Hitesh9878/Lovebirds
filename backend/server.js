// server.js or index.js - Main server file
import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './src/config/db.js';
import authRoutes from './src/routes/auth.js';
import messageRoutes from './src/routes/messages.js';
import userRoutes from './src/routes/user.js';
import uploadRoutes from './src/routes/uploadRoutes.js'; // NEW: Import upload routes
import { errorHandler, notFound } from './src/middlewares/errorHandler.js';
import { initializeSocket } from './src/sockets/index.js';

dotenv.config();
connectDB();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
// This allows access to uploaded files via http://localhost:5000/uploads/filename
app.use(express.static(path.join(__dirname, 'public')));

console.log('📁 Serving static files from:', path.join(__dirname, 'public'));

// Health check endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Chat API is running...',
        timestamp: new Date(),
        version: '1.0.0'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes); // NEW: Register upload routes

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

// Create HTTP server
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
});

// Initialize socket handlers
initializeSocket(io);

// Server error handling
server.on('error', (err) => {
    console.error('❌ Server error:', err);
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`📁 Uploads available at: http://localhost:${PORT}/uploads/`);
});