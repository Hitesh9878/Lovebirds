// src/components/Sidebar.jsx - COMPLETE WITH HAMBURGER MENU
import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SocketContext } from '../contexts/SocketContext';
import { Search, Plus, LogOut, Settings, Bell, Moon, Sun, Users, UserPlus, Shield, Menu, X } from 'lucide-react';
import ProfileModal from './ProfileModal';
import UserSearchModal from './UserSearchModal';
import ChatRequestModal from './ChatRequestModal';
import BlockedUsersModal from './BlockedUsersModal';
import './Sidebar.css';


const Sidebar = ({ users, selectedUser, onSelectUser, messagesMap = {}, lastMessageUpdate }) => {
  const { user, logout } = useAuth();
  const socket = useContext(SocketContext);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('chat-theme') || 'light');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showChatRequests, setShowChatRequests] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [chatRequests, setChatRequests] = useState({ received: [], sent: [] });
  const [unreadRequestCount, setUnreadRequestCount] = useState(0);
  
  // NEW: Hamburger menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const unreadCountsRef = useRef({});
  const [localUnreadCounts, setLocalUnreadCounts] = useState({});
  const currentChatUserIdRef = useRef(null);


  // ==================== NEW: Close mobile menu when user is selected ====================
  useEffect(() => {
    if (selectedUser && window.innerWidth <= 768) {
      setIsMobileMenuOpen(false);
    }
  }, [selectedUser]);


  // ==================== NEW: Close menu on window resize ====================
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  // ==================== NEW: Prevent body scroll when mobile menu is open ====================
  useEffect(() => {
    if (isMobileMenuOpen && window.innerWidth <= 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);


  // ==================== EXISTING UNREAD LOGIC (PRESERVED) ====================


  // Load saved unread counts on mount
  useEffect(() => {
    if (user?._id) {
      const saved = localStorage.getItem(`unreadCounts_${user._id}`);
      if (saved) {
        try {
          unreadCountsRef.current = JSON.parse(saved);
          setLocalUnreadCounts({ ...unreadCountsRef.current });
          console.log('💾 [SIDEBAR] Loaded unread counts from storage:', unreadCountsRef.current);
        } catch (e) {
          console.error('❌ [SIDEBAR] Failed to parse saved unread counts');
          unreadCountsRef.current = {};
        }
      }
    }
  }, [user]);


  // Save unread counts to localStorage whenever they change
  useEffect(() => {
    if (user?._id) {
      localStorage.setItem(`unreadCounts_${user._id}`, JSON.stringify(unreadCountsRef.current));
      console.log('💾 [SIDEBAR] Saved unread counts to storage:', unreadCountsRef.current);
    }
  }, [localUnreadCounts, user]);


  // Track currently selected chat and clear its unread count
  useEffect(() => {
    if (selectedUser) {
      currentChatUserIdRef.current = selectedUser._id;
      console.log(`📌 [SIDEBAR] Selected user: ${selectedUser.name} (${selectedUser._id})`);
      
      // Clear unread count for this user immediately
      if (unreadCountsRef.current[selectedUser._id]) {
        console.log(`🗑️ [SIDEBAR] Clearing unreads for: ${selectedUser._id}`);
        delete unreadCountsRef.current[selectedUser._id];
        setLocalUnreadCounts({ ...unreadCountsRef.current });
      }
    } else {
      currentChatUserIdRef.current = null;
    }
  }, [selectedUser]);


  // CRITICAL: Handle message updates from parent (App.jsx)
  useEffect(() => {
    if (!lastMessageUpdate || !user) {
      console.log('⚠️ [SIDEBAR] No lastMessageUpdate or user');
      return;
    }


    console.log('🔔 [SIDEBAR] ========================================');
    console.log('🔔 [SIDEBAR] Message update received:', lastMessageUpdate);


    const { userId, message, isReceived } = lastMessageUpdate;


    if (!userId) {
      console.log('⚠️ [SIDEBAR] No userId in lastMessageUpdate');
      return;
    }


    // Check if user is currently viewing this chat
    const isViewingThisChat = currentChatUserIdRef.current === userId;
    console.log(`👀 [SIDEBAR] Currently viewing chat with ${userId}? ${isViewingThisChat}`);
    console.log(`👀 [SIDEBAR] Current chat user: ${currentChatUserIdRef.current}`);


    if (isViewingThisChat) {
      console.log('✅ [SIDEBAR] User IS viewing this chat - NOT incrementing unread');
      // Make sure unread count is cleared (defensive)
      if (unreadCountsRef.current[userId]) {
        delete unreadCountsRef.current[userId];
        const newCounts = { ...unreadCountsRef.current };
        setLocalUnreadCounts(newCounts);
      }
      console.log('🔔 [SIDEBAR] ========================================');
      return;
    }


    // User is NOT viewing this chat
    console.log('📭 [SIDEBAR] User NOT viewing this chat');


    // Only increment unread if this is a RECEIVED message (not sent by current user)
    if (isReceived) {
      console.log(`📬 [SIDEBAR] RECEIVED message from ${userId} - INCREMENTING unread count`);
      const currentCount = unreadCountsRef.current[userId] || 0;
      unreadCountsRef.current[userId] = currentCount + 1;
      console.log(`📊 [SIDEBAR] New unread count for ${userId}: ${unreadCountsRef.current[userId]}`);
      console.log(`📊 [SIDEBAR] All unread counts:`, unreadCountsRef.current);
      
      // CRITICAL: Create new object to force state update and re-render
      const newCounts = { ...unreadCountsRef.current };
      setLocalUnreadCounts(newCounts);
      console.log('✅ [SIDEBAR] State updated with new counts');
    } else {
      console.log(`📤 [SIDEBAR] SENT message to ${userId} - updating last message preview`);
      // Force re-render to update last message preview
      const newCounts = { ...unreadCountsRef.current };
      setLocalUnreadCounts(newCounts);
      console.log('✅ [SIDEBAR] State updated for sent message');
    }


    console.log('🔔 [SIDEBAR] ========================================');
  }, [lastMessageUpdate, user]);


  // ==================== UPDATED: CHAT REQUEST SOCKET LISTENERS ====================


  useEffect(() => {
    if (!socket) {
      console.log('⚠️ [SIDEBAR] No socket available for chat requests');
      return;
    }


    console.log('🎧 [SIDEBAR] Setting up chat request listeners');


    // Request chat requests when socket is available
    const loadChatRequests = () => {
      console.log('📬 [SIDEBAR] Requesting chat requests from server');
      // The server should automatically send chatRequestsLoaded on connection
      // If not, we can emit an event to request them
    };


    const handleChatRequestsLoaded = (data) => {
      console.log('📬 [SIDEBAR] Chat requests loaded:', {
        received: data.received?.length || 0,
        sent: data.sent?.length || 0,
        count: data.count || 0
      });
      
      setChatRequests({
        received: data.received || [],
        sent: data.sent || []
      });
      setUnreadRequestCount(data.count || 0);
    };


    const handleNewChatRequest = (request) => {
      console.log('📨 [SIDEBAR] New chat request received:', request);
      
      setChatRequests(prev => ({
        ...prev,
        received: [request, ...prev.received]
      }));
      
      setUnreadRequestCount(prev => prev + 1);
      
      // Show notification if permission granted
      if (Notification.permission === 'granted' && request.sender) {
        new Notification('New Chat Request', {
          body: `${request.sender.name} wants to connect with you!`,
          icon: request.sender.avatar || '/default-avatar.png'
        });
      }
    };


    const handleChatRequestSent = (request) => {
      console.log('✅ [SIDEBAR] Chat request sent:', request);
      
      setChatRequests(prev => ({
        ...prev,
        sent: [request, ...prev.sent]
      }));
    };


    const handleChatRequestAccepted = (request) => {
      console.log('✅ [SIDEBAR] Chat request accepted:', request);
      
      // Remove from both received and sent lists
      setChatRequests(prev => ({
        received: prev.received.filter(r => r._id !== request._id),
        sent: prev.sent.filter(r => r._id !== request._id)
      }));


      // Update unread count if this was a received request
      if (request.receiver?._id === user?._id) {
        setUnreadRequestCount(prev => Math.max(0, prev - 1));
      }
    };


    const handleChatRequestRejected = ({ requestId }) => {
      console.log('❌ [SIDEBAR] Chat request rejected:', requestId);
      
      setChatRequests(prev => ({
        received: prev.received.filter(r => r._id !== requestId),
        sent: prev.sent.filter(r => r._id !== requestId)
      }));


      // Update unread count if this was a received request
      const wasReceivedRequest = chatRequests.received.some(r => r._id === requestId);
      if (wasReceivedRequest) {
        setUnreadRequestCount(prev => Math.max(0, prev - 1));
      }
    };


    const handleChatRequestCancelled = ({ requestId }) => {
      console.log('🗑️ [SIDEBAR] Chat request cancelled:', requestId);
      
      setChatRequests(prev => ({
        received: prev.received.filter(r => r._id !== requestId),
        sent: prev.sent.filter(r => r._id !== requestId)
      }));
    };


    const handleChatRequestError = (error) => {
      console.error('❌ [SIDEBAR] Chat request error:', error);
      
      if (error.message === 'Chat request already exists') {
        // If request already exists, we should refresh the chat requests
        console.log('🔄 [SIDEBAR] Request already exists, should be in chat requests list');
      }
    };


    const handleUserBlocked = ({ userId }) => {
      console.log('🚫 [SIDEBAR] User blocked:', userId);
      
      // Remove any chat requests involving this user
      setChatRequests(prev => ({
        received: prev.received.filter(r => r.sender?._id !== userId),
        sent: prev.sent.filter(r => r.receiver?._id !== userId)
      }));
    };


    // Set up all event listeners
    socket.on('chatRequestsLoaded', handleChatRequestsLoaded);
    socket.on('newChatRequest', handleNewChatRequest);
    socket.on('chatRequestSent', handleChatRequestSent);
    socket.on('chatRequestAccepted', handleChatRequestAccepted);
    socket.on('chatRequestRejected', handleChatRequestRejected);
    socket.on('chatRequestCancelled', handleChatRequestCancelled);
    socket.on('chatRequestError', handleChatRequestError);
    socket.on('userBlocked', handleUserBlocked);


    // Load initial chat requests
    loadChatRequests();


    return () => {
      console.log('🧹 [SIDEBAR] Cleaning up chat request listeners');
      socket.off('chatRequestsLoaded', handleChatRequestsLoaded);
      socket.off('newChatRequest', handleNewChatRequest);
      socket.off('chatRequestSent', handleChatRequestSent);
      socket.off('chatRequestAccepted', handleChatRequestAccepted);
      socket.off('chatRequestRejected', handleChatRequestRejected);
      socket.off('chatRequestCancelled', handleChatRequestCancelled);
      socket.off('chatRequestError', handleChatRequestError);
      socket.off('userBlocked', handleUserBlocked);
    };
  }, [socket, user, chatRequests.received]);


  // ==================== EXISTING THEME LOGIC (PRESERVED) ====================


  // Update theme
  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('chat-theme', theme);
  }, [theme]);


  const handleThemeToggle = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };


  // ==================== EXISTING HELPER FUNCTIONS (PRESERVED) ====================


  const getAvatarUrl = useCallback((userObj) => {
    if (!userObj) return '';
    if (userObj.avatar) {
      return userObj.avatar.startsWith('http')
        ? userObj.avatar
        : `${window.location.origin}/uploads/${userObj.avatar}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(userObj.name)}&background=random`;
  }, []);


  const getUserMessageInfo = useCallback((otherUser) => {
    const userId = otherUser._id.toString();
    const userMessages = messagesMap[userId] || [];
    
    const sortedMessages = [...userMessages].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );


    const unreadCount = localUnreadCounts[userId] || 0;
    const lastMessage = sortedMessages[sortedMessages.length - 1];


    let lastMessageText = 'No messages yet';
    let lastMessageTime = '';
    let isLastMessageFromCurrentUser = false;
    let isLastMessageDelivered = false;
    let isLastMessageRead = false;


    if (lastMessage) {
      // Handle different message types
      let text = '';
      switch (lastMessage.messageType) {
        case 'image':
          text = '📷 Photo';
          break;
        case 'video':
          text = '🎬 Video';
          break;
        case 'voice':
          text = '🎙️ Voice message';
          break;
        case 'file':
          text = '📎 File';
          break;
        default:
          text = lastMessage.content?.text || lastMessage.content || '...';
      }
      
      isLastMessageFromCurrentUser = lastMessage.sender?._id === user?._id;
      isLastMessageDelivered = lastMessage.isDelivered;
      isLastMessageRead = lastMessage.isRead;
      
      lastMessageText = isLastMessageFromCurrentUser ? `You: ${text}` : text;
      lastMessageTime = lastMessage.createdAt
        ? new Date(lastMessage.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';
    }


    // Add delivery status indicators
    let deliveryStatus = '';
    if (isLastMessageFromCurrentUser) {
      if (isLastMessageRead) {
        deliveryStatus = ' ✓✓'; // Read (double checkmark)
      } else if (isLastMessageDelivered) {
        deliveryStatus = ' ✓'; // Delivered (single checkmark)
      }
    }


    return {
      unreadCount,
      lastMessageText: lastMessageText + deliveryStatus,
      lastMessageTime,
      hasMessages: sortedMessages.length > 0,
      isLastMessageFromCurrentUser
    };
  }, [messagesMap, localUnreadCounts, user]);


  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );


  console.log('🎨 [SIDEBAR] Rendering - Unread counts:', localUnreadCounts);
  console.log('📬 [SIDEBAR] Chat requests state:', {
    received: chatRequests.received.length,
    sent: chatRequests.sent.length,
    unreadCount: unreadRequestCount
  });


  // ==================== RENDER (UPDATED WITH HAMBURGER MENU) ====================


  return (
    <>
      {/* NEW: Hamburger Menu Button - Only visible on mobile */}
      <button 
        className="hamburger-menu-button"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* NEW: Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-menu-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* UPDATED: Sidebar with mobile menu class */}
      <div className={`sidebar-container ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-header-top">
            <h2 className="sidebar-title">Chats</h2>
            <div className="sidebar-actions">
              {/* Chat Requests Button with Label */}
              <div className="action-button-wrapper">
                <button 
                  className="action-button" 
                  title="Chat Requests"
                  onClick={() => {
                    setShowChatRequests(true);
                    setUnreadRequestCount(0);
                  }}
                  style={{ position: 'relative' }}
                >
                  <Users size={18} />
                  {unreadRequestCount > 0 && (
                    <span className="notification-badge">
                      {unreadRequestCount > 99 ? '99+' : unreadRequestCount}
                    </span>
                  )}
                </button>
                <span className="action-button-label">Request's</span>
              </div>
              
              {/* Add Friend Button with Label */}
              <div className="action-button-wrapper">
                <button 
                  className="action-button" 
                  title="Add Friend"
                  onClick={() => setShowUserSearch(true)}
                >
                  <UserPlus size={18} />
                </button>
                <span className="action-button-label">Add Friend</span>
              </div>


              {/* Blocked Users Button with Label */}
              <div className="action-button-wrapper">
                <button 
                  className="action-button" 
                  title="Blocked Users"
                  onClick={() => setShowBlockedUsers(true)}
                >
                  <Shield size={18} />
                </button>
                <span className="action-button-label">Blocked User</span>
              </div>
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
            const { 
              unreadCount, 
              lastMessageText, 
              lastMessageTime, 
              hasMessages, 
              isLastMessageFromCurrentUser 
            } = getUserMessageInfo(u);


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
                      {unreadCount > 0 && !isLastMessageFromCurrentUser ? (
                        <span className="new-message-indicator">
                          📬 New message {unreadCount > 1 ? `(${unreadCount})` : ''}
                        </span>
                      ) : (
                        <>
                          {lastMessageText.length > 35
                            ? `${lastMessageText.slice(0, 35)}...`
                            : lastMessageText}
                        </>
                      )}
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


        {/* User Search Modal */}
        <UserSearchModal
          isOpen={showUserSearch}
          onClose={() => setShowUserSearch(false)}
          currentFriends={users}
        />


        {/* Chat Request Modal */}
        <ChatRequestModal
          isOpen={showChatRequests}
          onClose={() => setShowChatRequests(false)}
          requests={chatRequests}
        />


        {/* Blocked Users Modal */}
        <BlockedUsersModal
          isOpen={showBlockedUsers}
          onClose={() => setShowBlockedUsers(false)}
        />
      </div>
    </>
  );
};


export default Sidebar;