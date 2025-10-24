// server.js - COMPLETE SERVER WITH ALL FEATURES
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
import userRoutes from './src/routes/user.routes.js';
import uploadRoutes from './src/routes/uploadRoutes.js';
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
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

console.log('📁 Serving static files from:', path.join(__dirname, 'public'));
console.log('📁 Uploads directory:', path.join(__dirname, 'public/uploads'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        message: 'Chat API is running...',
        timestamp: new Date(),
        version: '2.0.0',
        features: [
            'Chat Requests',
            'Block Users',
            'Incognito Mode (3-hour auto-delete)',
            'Real-time Messaging',
            'File Sharing',
            'Video Calls'
        ]
    });
});

// API Routes - CORRECT ORDER IS CRITICAL
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes); // This now has correct route ordering inside
app.use('/api/upload', uploadRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.send('Chat API Server is Running');
});

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
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please use a different port.`);
        process.exit(1);
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nSIGINT received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`🌐 Backend URL: http://localhost:${PORT}`);
    console.log(`📁 Uploads available at: http://localhost:${PORT}/uploads/`);
    console.log('\n🎯 Features enabled:');
    console.log('   - ✉️  Chat Requests');
    console.log('   - 🚫 Block Users');
    console.log('   - 🕵️  Incognito Mode (3-hour auto-delete)');
    console.log('   - 💬 Real-time Messaging');
    console.log('   - 📎 File Sharing');
    console.log('   - 📹 Video Calls');
    console.log('\n📡 API Endpoints:');
    console.log('   - POST   /api/auth/register');
    console.log('   - POST   /api/auth/login');
    console.log('   - GET    /api/users/search?q=<query>');
    console.log('   - GET    /api/users/search/users?q=<query>');
    console.log('   - GET    /api/users/friends/list');
    console.log('   - GET    /api/users/blocked/list');
    console.log('   - PATCH  /api/users/status/update');
    console.log('='.repeat(60) + '\n');
});

export default app;