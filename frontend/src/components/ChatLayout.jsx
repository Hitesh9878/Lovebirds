// src/components/ChatLayout.jsx - MERGED & CORRECTED VERSION
import React, { useState, useEffect, useContext } from 'react';
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext.jsx";
import { SocketContext } from "../contexts/SocketContext.jsx";
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import "./ChatLayout.css";

const LovebirdsIcon = () => (
  <svg className="logo-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.7,21.9C9,21.5,5.2,18.8,3,15.1c-1.3-2.2-1.8-4.7-1.6-7.2c0.2-2.5,1.2-4.8,2.9-6.6 C6.1,0,8.6-0.5,11.1,0.3c1.9,0.6,3.5,1.9,4.6,3.6c-0.6-0.3-1.3-0.5-2-0.6c-2.1-0.3-4.2,0.6-5.6,2.3c-1.2,1.5-1.7,3.4-1.4,5.3 c0.3,2,1.7,3.7,3.6,4.5c0.3,0.1,0.6,0.2,0.9,0.3c-0.1,0.2-0.2,0.3-0.2,0.5c-0.6,0.9-0.8,2-0.6,3.1c0.2,1,0.8,1.9,1.6,2.6 C12.3,21.8,12.5,21.8,12.7,21.9z M21.3,12.3c-0.2-2.5-1.2-4.8-2.9-6.6c-1.8-1.8-4.1-2.7-6.5-2.5c-0.6,0-1.2,0.1-1.8,0.3 c1.2-1.9,3.1-3.2,5.3-3.6c2.5-0.5,5,0.1,6.8,1.8c1.8,1.8,2.7,4.1,2.5,6.5c-0.1,1.9-0.9,3.6-2.1,5c-0.8,0.9-1.8,1.6-2.8,2.1 c0.5,0.2,1,0.2,1.5,0.1c2.1-0.3,4-1.6,5.1-3.4C22.2,16.5,22,14.2,21.3,12.3z" />
  </svg>
);

const ChatLayout = ({ messagesMap, lastMessageUpdate, onOptimisticMessage }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [mobileView, setMobileView] = useState('sidebar');
  
  const { user, loading: authLoading } = useAuth();
  const socket = useContext(SocketContext);

  // ✅ Fetch friends list
  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        console.log('👥 [CHAT LAYOUT] Fetching friends list...');
        const token = localStorage.getItem('token');
        
        if (!token) {
          throw new Error('No authentication token found');
        }

        // Try to fetch friends list first
        let response = await fetch('https://lovebirds-mwyz.onrender.com/api/users/friends/list', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        let userData = [];

        if (response.ok) {
          userData = await response.json();
          console.log('✅ [CHAT LAYOUT] Loaded friends:', userData.length);
        } else {
          // Fallback to all users if friends endpoint fails
          console.log('⚠️ [CHAT LAYOUT] Friends endpoint failed, fetching all users...');
          response = await fetch('https://lovebirds-mwyz.onrender.com/api/users', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const allUsers = await response.json();
            // Filter out current user
            userData = allUsers.filter(u => u._id !== user._id);
            console.log('✅ [CHAT LAYOUT] Loaded users (fallback):', userData.length);
          } else {
            throw new Error('Failed to fetch users');
          }
        }

        // Add default values and ensure proper formatting
        const usersWithDefaults = userData.map((u) => ({
          ...u,
          avatar: u.avatar || null,
          name: u.name || "Unknown User",
          email: u.email || "No email",
          isOnline: u.isOnline || false,
          lastSeen: u.lastSeen || new Date()
        }));
        
        setUsers(usersWithDefaults);
        setError(null);
        console.log('✅ [CHAT LAYOUT] Final users list:', usersWithDefaults.length);
        
      } catch (err) {
        console.error("❌ [CHAT LAYOUT] Failed to fetch users:", err);
        setError("Could not load user data. Please try again later.");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchUsers();
    }
  }, [user, authLoading]);

  // ✅ Listen for user status updates via socket
  useEffect(() => {
    if (!socket) {
      console.log('⚠️ [CHAT LAYOUT] No socket available');
      return;
    }

    console.log('🎧 [CHAT LAYOUT] Setting up socket listeners');

    const handleUserStatus = (data) => {
      console.log('📊 [CHAT LAYOUT] User status update:', data);
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u._id === data.userId 
            ? { ...u, isOnline: data.isOnline, lastSeen: data.lastSeen, status: data.status }
            : u
        )
      );
    };

    // Listen for new friends when chat requests are accepted
    const handleChatRequestAccepted = (request) => {
      console.log('✅ [CHAT LAYOUT] Chat request accepted:', request);
      
      // Determine who the new friend is
      const newFriend = request.sender._id === user._id ? request.receiver : request.sender;
      
      // Check if friend already exists in list
      setUsers(prev => {
        const exists = prev.some(u => u._id === newFriend._id);
        if (exists) {
          console.log('⚠️ [CHAT LAYOUT] Friend already in list');
          return prev;
        }
        
        console.log('➕ [CHAT LAYOUT] Adding new friend:', newFriend.name);
        const newFriendWithDefaults = {
          ...newFriend,
          avatar: newFriend.avatar || null,
          name: newFriend.name || "Unknown User",
          email: newFriend.email || "No email",
          isOnline: newFriend.isOnline || false,
          lastSeen: newFriend.lastSeen || new Date()
        };
        
        return [...prev, newFriendWithDefaults];
      });

      // Show success message
      alert(`You are now friends with ${newFriend.name}!`);
    };

    // Handle user blocking
    const handleUserBlocked = ({ userId }) => {
      console.log('🚫 [CHAT LAYOUT] User blocked:', userId);
      
      // Remove from users list
      setUsers(prev => prev.filter(u => u._id !== userId));
      
      // If blocked user was selected, deselect them
      if (selectedUser?._id === userId) {
        setSelectedUser(null);
      }
      
      alert('User has been blocked.');
    };

    // Handle user unblocking (refresh list to potentially show unblocked user)
    const handleUserUnblocked = ({ userId }) => {
      console.log('✅ [CHAT LAYOUT] User unblocked:', userId);
      // We might want to refresh the users list to include unblocked users
      // For now, just log the event
    };

    socket.on('userStatus', handleUserStatus);
    socket.on('chatRequestAccepted', handleChatRequestAccepted);
    socket.on('userBlocked', handleUserBlocked);
    socket.on('userUnblocked', handleUserUnblocked);

    return () => {
      console.log('🧹 [CHAT LAYOUT] Cleaning up socket listeners');
      socket.off('userStatus', handleUserStatus);
      socket.off('chatRequestAccepted', handleChatRequestAccepted);
      socket.off('userBlocked', handleUserBlocked);
      socket.off('userUnblocked', handleUserUnblocked);
    };
  }, [socket, user, selectedUser]);

  const handleSelectUser = (user) => {
    console.log('👤 [CHAT LAYOUT] User selected:', user.name, user._id);
    setSelectedUser(user);
  };

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  // Show login prompt if user is not authenticated
  if (!user) {
    return (
      <div className="auth-required">
        <div className="logo-container">
          <LovebirdsIcon />
          <h1 className="logo-title">LOVEBIRDS</h1>
          <p className="logo-tagline">Please log in to continue</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading chats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  console.log('🎨 [CHAT LAYOUT] Rendering with:', {
    usersCount: users.length,
    selectedUser: selectedUser?.name,
    hasMessagesMap: !!messagesMap,
    messagesMapSize: Object.keys(messagesMap || {}).length,
    lastMessageUpdate: lastMessageUpdate?.timestamp
  });

  return (
    <div className="chat-layout-container">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="logo-container"
      >
        <LovebirdsIcon />
        <h1 className="logo-title">LOVEBIRDS</h1>
        <p className="logo-tagline">Connect & Share</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="chat-card"
      >
        <Sidebar 
          users={users} 
          selectedUser={selectedUser} 
          onSelectUser={handleSelectUser}
          messagesMap={messagesMap}
          lastMessageUpdate={lastMessageUpdate}
        />
        
        <ChatWindow 
          selectedUser={selectedUser}
          onOptimisticMessage={onOptimisticMessage}
        />
      </motion.div>
    </div>
  );
};

export default ChatLayout;
