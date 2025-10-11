import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Search, Plus, LogOut, Settings, Bell, Moon, Sun } from 'lucide-react';
import ProfileModal from './ProfileModal';
import './Sidebar.css';

const Sidebar = ({ users, selectedUser, onSelectUser, messagesMap = {}, socket }) => {
  const { user, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('chat-theme') || 'light');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [localMessagesMap, setLocalMessagesMap] = useState(messagesMap);

  // Sync localMessagesMap with messagesMap prop
  useEffect(() => {
    setLocalMessagesMap(messagesMap);
  }, [messagesMap]);

  // ✅ Listen for real-time message updates (incoming + outgoing)
  useEffect(() => {
    if (!socket) return;

    // MODIFIED: Replaced with more explicit logic to correctly identify the conversation partner
    const handleReceiveMessage = (message) => {
      console.log('📨 Sidebar received message update:', message);
      const loggedInUserId = user?._id;

      // Ensure we have the necessary data to proceed
      if (!loggedInUserId || !message.sender?._id || !message.chatId) {
        return;
      }

      let conversationPartnerId;

      // Check if the current user is the sender of the message
      if (message.sender._id.toString() === loggedInUserId.toString()) {
        // This is a confirmation of a message WE sent.
        // The conversation partner is the RECEIVER.
        const chatUsers = message.chatId.split('_');
        conversationPartnerId = chatUsers.find(id => id.toString() !== loggedInUserId.toString());
      } else {
        // This is a new message FROM someone else.
        // The conversation partner is the SENDER.
        conversationPartnerId = message.sender._id;
      }


      if (conversationPartnerId) {
        setLocalMessagesMap(prev => {
          const existingMessages = prev[conversationPartnerId] || [];
          // Avoid duplicates by checking tempId (for optimistic messages) and _id (for confirmed messages)
          if (existingMessages.some(m => m._id === message._id || (m.tempId && m.tempId === message.tempId))) {
             // If message already exists (e.g., optimistic), replace it with the confirmed one from the server
             return {
               ...prev,
               [conversationPartnerId]: existingMessages.map(m => (m.tempId === message.tempId ? message : m)),
             };
          }
          // Otherwise, add the new message to the conversation
          return {
            ...prev,
            [conversationPartnerId]: [...existingMessages, message],
          };
        });
      }
    };

    socket.on('receiveMessage', handleReceiveMessage);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
    };
  }, [socket, user]); // MODIFIED: Dependency changed to `user` to ensure the whole object is fresh

  // ✅ Theme toggle
  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('chat-theme', theme);
  }, [theme]);

  const getAvatarUrl = (userObj) => {
    if (!userObj) return '';
    if (userObj.avatar) {
      return userObj.avatar.startsWith('http')
        ? userObj.avatar
        : `${window.location.origin}/uploads/${userObj.avatar}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(userObj.name)}&background=random`;
  };

  const handleThemeToggle = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // ✅ Compute last message, time, and unread count
  const getUserMessageInfo = (userId) => {
    const userMessages = localMessagesMap[userId] || [];

    const sortedMessages = [...userMessages].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    const unreadCount = sortedMessages.filter(
      (m) => m.sender?._id !== user?._id && !m.isRead
    ).length;

    const lastMessage = sortedMessages[sortedMessages.length - 1];

    let lastMessageText = 'No messages yet';
    let lastMessageTime = '';

    if (lastMessage) {
      const text = lastMessage.content?.text || lastMessage.content || '...';
      lastMessageText =
        lastMessage.sender?._id === user?._id ? `You: ${text}` : text;
      lastMessageTime = lastMessage.createdAt
        ? new Date(lastMessage.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';
    }

    return {
      unreadCount,
      lastMessageText,
      lastMessageTime,
      hasMessages: sortedMessages.length > 0,
    };
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="sidebar-container">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-header-top">
          <h2 className="sidebar-title">Chats</h2>
          <div className="sidebar-actions">
            <button className="action-button" title="Notifications">
              <Bell size={18} />
            </button>
            <button className="add-chat-button btn-primary" title="New Chat">
              <Plus size={18} />
            </button>
          </div>
        </div>
        <div className="search-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* User List */}
      <div className="user-list">
        {filteredUsers.map((u) => {
          const isActive = selectedUser?._id === u._id;
          const { unreadCount, lastMessageText, lastMessageTime, hasMessages } =
            getUserMessageInfo(u._id);

          return (
            <div
              key={u._id}
              onClick={() => onSelectUser(u)}
              className={`user-item ${isActive ? 'active' : ''} ${
                unreadCount > 0 ? 'has-unread' : ''
              }`}
            >
              <div className="user-avatar-wrapper">
                <img
                  src={getAvatarUrl(u)}
                  alt={u.name}
                  className="user-avatar"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      u.name
                    )}&background=random`;
                  }}
                />
                <div
                  className={`user-status-dot ${
                    u.isOnline ? 'online' : 'offline'
                  }`}
                />
                {unreadCount > 0 && (
                  <span className="user-unread-badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <div className="user-details">
                <div className="user-details-top">
                  <h3 className="user-name">{u.name}</h3>
                  {hasMessages && (
                    <span className="user-last-time">{lastMessageTime}</span>
                  )}
                </div>
                <div className="user-details-bottom">
                  <p
                    className={`user-last-message ${
                      unreadCount > 0 ? 'unread' : ''
                    }`}
                  >
                    {lastMessageText.length > 35
                      ? `${lastMessageText.slice(0, 35)}...`
                      : lastMessageText}
                  </p>
                  {unreadCount > 0 && <div className="message-indicator" />}
                </div>
              </div>
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="no-users-message">
            <p>No users found</p>
          </div>
        )}
      </div>

      {/* Sidebar Profile */}
      <div className="sidebar-profile">
        <div className="profile-main">
          <div className="profile-avatar-wrapper">
            <img
              src={getAvatarUrl(user)}
              alt="Profile"
              className="profile-avatar"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  user?.name || 'User'
                )}&background=random`;
              }}
            />
            <div
              className="profile-status-indicator online"
              title="Online"
            />
          </div>
          <div className="profile-info">
            <h4 className="profile-name">{user?.name}</h4>
            <p className="profile-status">Active now</p>
          </div>
          <div className="profile-actions">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="profile-action-button"
              title="Edit Profile"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={handleThemeToggle}
              className="profile-action-button"
              title="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button
              onClick={logout}
              className="profile-action-button logout"
              title="Log Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};

export default Sidebar;