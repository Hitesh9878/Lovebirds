// src/contexts/SocketContext.jsx - FIXED VERSION (Non-interfering)
import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';

export const SocketContext = createContext(null);

const isValidJWT = (token) => {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  return parts.length === 3;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [recentChats, setRecentChats] = useState([]);
  const { user, logout } = useAuth();

  useEffect(() => {
    if (user) {
      console.log('🔌 [SOCKET CONTEXT] Connecting socket for user:', user.name, user._id);

      const token = localStorage.getItem('token');

      if (!isValidJWT(token)) {
        console.error('❌ [SOCKET CONTEXT] Invalid JWT token found, logging out...');
        logout();
        return;
      }

      const newSocket = io('https://lovebirds-mwyz.onrender.com', {
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      });

      newSocket.on('connect', () => {
        console.log('✅ [SOCKET CONTEXT] Socket connected:', newSocket.id);
        setTimeout(() => newSocket.emit('loadRecentChats'), 100);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ [SOCKET CONTEXT] Socket disconnected:', reason);
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ [SOCKET CONTEXT] Socket connection error:', error);
        if (error.message?.includes('Authentication') || error.message?.includes('jwt')) {
          console.error('❌ [SOCKET CONTEXT] JWT authentication failed, logging out...');
          logout();
        }
      });

      newSocket.on('recentChatsLoaded', (chats) => {
        console.log('📚 [SOCKET CONTEXT] Recent chats loaded:', chats);
        if (Array.isArray(chats)) setRecentChats(chats);
      });

      // CRITICAL: DO NOT handle newMessageForSidebar here
      // Let App.jsx and Sidebar.jsx handle it directly
      // Just log it for debugging
      newSocket.on('newMessageForSidebar', (data) => {
        console.log('📡 [SOCKET CONTEXT] newMessageForSidebar event received (passing through):', {
          messageId: data._id,
          sender: data.sender?.name,
          isForSender: data.isForSender,
          isForReceiver: data.isForReceiver,
          chatId: data.chatId
        });
        // DO NOT process it here - let App.jsx handle it via receiveMessage
      });

      // Log all events for debugging (excluding noisy ones)
      newSocket.onAny((eventName, ...args) => {
        if (!['ping', 'pong'].includes(eventName)) {
          console.log(`📡 [SOCKET CONTEXT] Event: ${eventName}`, args[0]);
        }
      });

      setSocket(newSocket);

      return () => {
        console.log('🔌 [SOCKET CONTEXT] Closing socket connection');
        newSocket.close();
      };
    } else if (socket) {
      console.log('🔌 [SOCKET CONTEXT] User logged out, closing socket');
      socket.close();
      setSocket(null);
      setRecentChats([]);
    }
  }, [user, logout]);

  useEffect(() => {
    console.log('🔍 [SOCKET CONTEXT] Socket state changed:', {
      exists: !!socket,
      connected: socket?.connected,
      id: socket?.id
    });
  }, [socket]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
