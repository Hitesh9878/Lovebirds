// server.js - DEPLOYMENT READY VERSION (All Features Retained)
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

// ---------------------
// ✅ CORS Configuration
// ---------------------
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

// ---------------------
// ✅ Body Parsers
// ---------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---------------------
// ✅ Static Files Setup
// ---------------------
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

console.log('📁 Serving static files from:', path.join(__dirname, 'public'));
console.log('📁 Uploads directory:', path.join(__dirname, 'public/uploads'));

// ---------------------
// ✅ Force HTTPS in Production
// ---------------------
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
  });
}

// ---------------------
// ✅ Health Check Endpoint
// ---------------------
app.get('/api/health', (req, res) => {
  res.status(200).json({
    message: 'Chat API is running...',
    timestamp: new Date(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: [
      'Chat Requests',
      'Block Users',
      'Incognito Mode (3-hour auto-delete)',
      'Real-time Messaging',
      'File Sharing',
      'Video Calls',
    ],
  });
});

// ---------------------
// ✅ API Routes
// ---------------------
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);

// ---------------------
// ✅ Root Endpoint
// ---------------------
app.get('/', (req, res) => {
  res.send('🚀 Chat API Server is Running Successfully.');
});

// ---------------------
// ✅ Error Handlers
// ---------------------
app.use(notFound);
app.use(errorHandler);

// ---------------------
// ✅ Create HTTP Server
// ---------------------
const server = http.createServer(app);

// ---------------------
// ✅ Socket.IO Setup
// ---------------------
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

initializeSocket(io);

// ---------------------
// ✅ Error & Exit Handling
// ---------------------
server.on('error', (err) => {
  console.error('❌ Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please use a different port.`);
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

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

// ---------------------
// ✅ Start Server
// ---------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔗 Frontend URL: ${allowedOrigin}`);
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
