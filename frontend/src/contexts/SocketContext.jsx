import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';

export const SocketContext = createContext(null);

// Helper function to validate JWT format
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
      console.log('🔌 Connecting socket for user:', user.name, user._id);
      
      const token = localStorage.getItem('token');
      
      // Validate token before using it
      if (!isValidJWT(token)) {
        console.error('❌ Invalid JWT token found, logging out...');
        logout();
        return;
      }
      
      const newSocket = io('http://localhost:5000', {
        auth: {
          token: token,
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      });

      // Connection event listeners
      newSocket.on('connect', () => {
        console.log('✅ Socket connected:', newSocket.id);
        
        // Load recent chats on connection
        setTimeout(() => {
          newSocket.emit('loadRecentChats');
        }, 100);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        
        if (error.message?.includes('Authentication') || error.message?.includes('jwt')) {
          console.error('❌ JWT authentication failed, clearing token...');
          logout();
        }
      });

      // Handle recent chats loaded
      newSocket.on('recentChatsLoaded', (chats) => {
        console.log('📚 Recent chats loaded:', chats);
        try {
          if (Array.isArray(chats)) {
            setRecentChats(chats);
          }
        } catch (error) {
          console.error('Error setting recent chats:', error);
        }
      });

      // Handle sidebar message updates
      newSocket.on('newMessageForSidebar', (message) => {
        console.log('📨 New message for sidebar:', message);
        
        try {
          if (message && message.chatId) {
            setRecentChats(prev => {
              const chatId = message.chatId;
              const existingChatIndex = prev.findIndex(chat => chat._id === chatId);
              
              if (existingChatIndex !== -1) {
                // Update existing chat
                const updatedChats = [...prev];
                updatedChats[existingChatIndex] = {
                  ...updatedChats[existingChatIndex],
                  lastMessage: message,
                  messageCount: (updatedChats[existingChatIndex].messageCount || 0) + 1
                };
                
                // Move to top
                const [updatedChat] = updatedChats.splice(existingChatIndex, 1);
                return [updatedChat, ...updatedChats];
              } else {
                // Add new chat
                return [{
                  _id: chatId,
                  lastMessage: message,
                  messageCount: 1
                }, ...prev];
              }
            });
          }
        } catch (error) {
          console.error('Error updating sidebar messages:', error);
        }
      });

      // Handle user status updates
      newSocket.on('userStatus', (data) => {
        console.log('👤 User status update:', data);
      });

      // Handle message delivery confirmation
      newSocket.on('messageDelivered', (data) => {
        console.log('✅ Message delivered:', data);
      });

      // Handle message read confirmation
      newSocket.on('messageRead', (data) => {
        console.log('👁️ Message read:', data);
      });

      // Handle typing indicators
      newSocket.on('userTyping', (data) => {
        console.log('⌨️ User typing:', data);
      });

      newSocket.on('stopTyping', (data) => {
        console.log('✋ User stopped typing:', data);
      });

      // Debug: Listen to all socket events
      newSocket.onAny((eventName, ...args) => {
        if (eventName !== 'ping' && eventName !== 'pong') {
          console.log(`📡 Socket event: ${eventName}`, args);
        }
      });

      setSocket(newSocket);
      
      return () => {
        console.log('🔌 Closing socket connection');
        newSocket.close();
      };
    } else if (socket) {
      console.log('🔌 User logged out, closing socket');
      socket.close();
      setSocket(null);
      setRecentChats([]);
    }
  }, [user, logout]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};