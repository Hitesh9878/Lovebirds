// src/App.jsx - FIXED VERSION WITH PROPER MESSAGE HANDLING
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { ThemeProvider, useTheme } from './contexts/ThemeContext.jsx';
import { SocketProvider, useSocket } from './contexts/SocketContext.jsx';
import { VideoCallProvider } from './contexts/VideoCallContext.jsx';
import LoginPage from './components/LoginPage';
import ChatLayout from './components/ChatLayout';

// AppContent safely consumes contexts AND manages message state
const AppContent = () => {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const socket = useSocket();

  // STATE MANAGEMENT FOR SIDEBAR UPDATES
  const [messagesMap, setMessagesMap] = useState({});
  const [lastMessageUpdate, setLastMessageUpdate] = useState(null);

  // Listen for new messages from socket
  useEffect(() => {
    if (!socket || !user) {
      console.log('⚠️ [APP] Socket or user not ready');
      return;
    }

    console.log('🎧 [APP] Setting up message listeners for user:', user.name);

    const handleNewMessage = (message) => {
      console.log('📨 [APP] New message received:', {
        messageId: message._id,
        sender: message.sender?.name,
        senderID: message.sender?._id,
        receiverId: message.receiverId,
        currentUserId: user._id,
        messageType: message.messageType,
        isForSender: message.isForSender,
        isForReceiver: message.isForReceiver
      });
      
      const senderId = message.sender?._id?.toString();
      const receiverId = message.receiverId?.toString();
      const currentUserId = user._id.toString();
      
      let otherUserId;
      let isReceived;
      
      if (senderId === currentUserId) {
        // I sent this message
        otherUserId = receiverId;
        isReceived = false;
        console.log('📤 [APP] I SENT this message to:', otherUserId);
      } else {
        // I received this message
        otherUserId = senderId;
        isReceived = true;
        console.log('📬 [APP] I RECEIVED this message from:', otherUserId);
      }

      // Update messagesMap
      setMessagesMap(prev => {
        const updated = { ...prev };
        if (!updated[otherUserId]) {
          updated[otherUserId] = [];
        }
        
        // Check if message already exists (avoid duplicates)
        const exists = updated[otherUserId].some(
          msg => msg._id === message._id || msg.tempId === message.tempId
        );
        
        if (!exists) {
          updated[otherUserId] = [...updated[otherUserId], message];
          console.log('✅ [APP] Added message to messagesMap for:', otherUserId);
        } else {
          console.log('⚠️ [APP] Message already exists in messagesMap, skipping');
        }
        
        return updated;
      });

      // CRITICAL: Trigger sidebar update with proper data structure
      const updateData = {
        userId: otherUserId,
        message: message,
        timestamp: Date.now(),
        isReceived: isReceived,
        isDelivered: message.isDelivered || false,
        isRead: message.isRead || false
      };

      console.log('🔔 [APP] Setting lastMessageUpdate:', updateData);
      setLastMessageUpdate({ ...updateData });
    };

    // Listen to both events
    socket.on('receiveMessage', handleNewMessage);
    socket.on('newMessageForSidebar', handleNewMessage);

    console.log('✅ [APP] Message listeners attached');

    return () => {
      console.log('🧹 [APP] Cleaning up message listeners');
      socket.off('receiveMessage', handleNewMessage);
      socket.off('newMessageForSidebar', handleNewMessage);
    };
  }, [socket, user]);

  // Handle message status updates (delivered/read)
  useEffect(() => {
    if (!socket) return;

    const handleMessageDelivered = (data) => {
      console.log('✅ [APP] Message delivered:', data);
      
      // Update messagesMap with delivery status
      setMessagesMap(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(userId => {
          updated[userId] = updated[userId].map(msg => 
            msg._id === data.messageId || msg.tempId === data.tempId
              ? { ...msg, isDelivered: true, deliveredAt: data.deliveredAt }
              : msg
          );
        });
        return updated;
      });

      // Trigger sidebar re-render
      setLastMessageUpdate(prev => prev ? { ...prev, timestamp: Date.now() } : null);
    };

    const handleMessageRead = (data) => {
      console.log('👁️ [APP] Message read:', data);
      
      // Update messagesMap with read status
      setMessagesMap(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(userId => {
          updated[userId] = updated[userId].map(msg => 
            msg._id === data.messageId
              ? { ...msg, isRead: true, readAt: data.readAt }
              : msg
          );
        });
        return updated;
      });

      // Trigger sidebar re-render
      setLastMessageUpdate(prev => prev ? { ...prev, timestamp: Date.now() } : null);
    };

    const handleChatRead = (data) => {
      console.log('👁️ [APP] Chat read:', data);
      
      // Update all messages in this chat as read
      setMessagesMap(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(userId => {
          updated[userId] = updated[userId].map(msg => 
            msg.chatId === data.chatId && msg.sender?._id !== user._id
              ? { ...msg, isRead: true, readAt: data.readAt }
              : msg
          );
        });
        return updated;
      });

      // Trigger sidebar re-render
      setLastMessageUpdate(prev => prev ? { ...prev, timestamp: Date.now() } : null);
    };

    socket.on('messageDelivered', handleMessageDelivered);
    socket.on('messageRead', handleMessageRead);
    socket.on('chatRead', handleChatRead);

    return () => {
      socket.off('messageDelivered', handleMessageDelivered);
      socket.off('messageRead', handleMessageRead);
      socket.off('chatRead', handleChatRead);
    };
  }, [socket, user]);

  // Handle optimistic message updates from ChatWindow
  const handleOptimisticMessage = (message, otherUserId) => {
    console.log('✨ [APP] Optimistic message received:', {
      messageId: message._id,
      tempId: message.tempId,
      otherUserId,
      content: message.content
    });
    useEffect(() => {
  if (!socket || !user) return;

  // ... existing socket listeners ...

  // ✅ NEW: Friend Removed Listeners
  socket.on('friendRemoved', (data) => {
    console.log('✅ [APP] Friend removed:', data.userId);
    // Refresh users list to remove from sidebar
    socket.emit('getUsers');
  });

  socket.on('friendRemovedBy', (data) => {
    console.log('👋 [APP] You were removed by:', data.userName);
    alert(`${data.userName} removed you from their friends list.`);
    // Refresh users list
    socket.emit('getUsers');
  });

  socket.on('removeFriendError', (error) => {
    console.error('❌ [APP] Remove friend error:', error.message);
    alert(error.message || 'Failed to remove friend');
  });

  return () => {
    // ... existing cleanup ...
    socket.off('friendRemoved');
    socket.off('friendRemovedBy');
    socket.off('removeFriendError');
  };
}, [socket, user]);

    // Update messagesMap
    setMessagesMap(prev => {
      const updated = { ...prev };
      if (!updated[otherUserId]) {
        updated[otherUserId] = [];
      }
      updated[otherUserId] = [...updated[otherUserId], message];
      return updated;
    });

    // Update sidebar immediately (sender's view)
    const updateData = {
      userId: otherUserId,
      message: message,
      timestamp: Date.now(),
      isReceived: false, // It's sent by current user
      isDelivered: message.isDelivered || false,
      isRead: false
    };

    console.log('🔔 [APP] Setting optimistic lastMessageUpdate:', updateData);
    setLastMessageUpdate({ ...updateData });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <p className="text-xl">Loading Application...</p>
      </div>
    );
  }

  console.log('🔌 [APP] Rendering with:', {
    socketConnected: !!socket,
    socketId: socket?.id || 'not-connected',
    userPresent: !!user,
    messagesMapSize: Object.keys(messagesMap).length,
    lastMessageUpdateTimestamp: lastMessageUpdate?.timestamp
  });

  // Render appropriate layout
  return (
    <div data-theme={theme} className="app-wrapper">
      {user ? (
        <ChatLayout 
          socket={socket} 
          messagesMap={messagesMap}
          lastMessageUpdate={lastMessageUpdate}
          onOptimisticMessage={handleOptimisticMessage}
        />
      ) : (
        <LoginPage />
      )}
    </div>
  );
};

// Root App component with all providers
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <VideoCallProvider>
            <AppContent />
          </VideoCallProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;