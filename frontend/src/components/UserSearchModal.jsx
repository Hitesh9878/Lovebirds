// src/components/UserSearchModal.jsx - FIXED VERSION
import React, { useState, useEffect, useContext } from 'react';
import { X, Search, UserPlus, Loader, Ban, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { SocketContext } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import './UserSearchModal.css';

const UserSearchModal = ({ isOpen, onClose, currentFriends = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sendingRequests, setSendingRequests] = useState({});
  const [successMessages, setSuccessMessages] = useState({});
  const [sentRequests, setSentRequests] = useState(new Set()); // Track sent requests
  
  const socket = useContext(SocketContext);
  const { user } = useAuth();

  // Clear state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setError('');
      setSendingRequests({});
      setSuccessMessages({});
      setSentRequests(new Set());
    }
  }, [isOpen]);

  // Socket event listeners for chat requests
  useEffect(() => {
    if (!socket) return;

    const handleChatRequestSent = (request) => {
      console.log('✅ Chat request sent:', request);
      const receiverId = request.receiver._id || request.receiver;
      
      // Add to sent requests set
      setSentRequests(prev => new Set([...prev, receiverId]));
      
      // Clear sending state
      setSendingRequests(prev => {
        const newState = { ...prev };
        delete newState[receiverId];
        return newState;
      });
      
      // Show success message
      setSuccessMessages(prev => ({
        ...prev,
        [receiverId]: 'Request sent successfully!'
      }));

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessages(prev => {
          const newState = { ...prev };
          delete newState[receiverId];
          return newState;
        });
      }, 3000);
    };

    const handleChatRequestError = (error) => {
      console.error('❌ Chat request error:', error);
      alert(error.message || 'Failed to send chat request');
      
      // Clear all sending states on error
      setSendingRequests({});
    };

    const handleChatRequestCancelled = ({ requestId }) => {
      console.log('🗑️ Chat request cancelled:', requestId);
      // Note: We'd need to track requestId to userId mapping to update UI
      // For now, we'll just clear the UI state
    };

    socket.on('chatRequestSent', handleChatRequestSent);
    socket.on('chatRequestError', handleChatRequestError);
    socket.on('chatRequestCancelled', handleChatRequestCancelled);

    return () => {
      socket.off('chatRequestSent', handleChatRequestSent);
      socket.off('chatRequestError', handleChatRequestError);
      socket.off('chatRequestCancelled', handleChatRequestCancelled);
    };
  }, [socket]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError('');
    setSearchResults([]);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      console.log('🔍 Searching for:', searchQuery);
      
      // Try the main endpoint first
      let response = await fetch(
        `http://localhost:5000/api/users/search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Search failed' }));
        throw new Error(errorData.message || `Search failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Search results:', data);
      
      // Filter out current user from results (defensive check)
      const filteredResults = data.filter(u => u._id !== user._id);
      
      setSearchResults(filteredResults);

      if (filteredResults.length === 0) {
        setError('No users found matching your search');
      }
    } catch (err) {
      console.error('❌ Search error:', err);
      setError(err.message || 'Failed to search users. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = (userId) => {
    if (!socket) {
      alert('Connection error. Please refresh the page.');
      return;
    }

    if (!userId) {
      alert('Invalid user ID');
      return;
    }

    console.log('📨 Sending chat request to:', userId);
    
    // Set sending state for this user
    setSendingRequests(prev => ({ ...prev, [userId]: true }));
    
    // Clear any previous success message
    setSuccessMessages(prev => {
      const newState = { ...prev };
      delete newState[userId];
      return newState;
    });

    // Emit socket event
    socket.emit('sendChatRequest', { receiverId: userId });
  };

  const handleBlockUser = (userId) => {
    if (!socket) {
      alert('Connection error. Please refresh the page.');
      return;
    }

    if (window.confirm('Are you sure you want to block this user?')) {
      socket.emit('blockUser', { userIdToBlock: userId });
      
      // Remove from search results
      setSearchResults(prev => prev.filter(user => user._id !== userId));
      
      alert('User blocked successfully');
    }
  };

  const isAlreadyFriend = (userId) => {
    // Check if userId exists in currentFriends array
    return currentFriends.some(friend => 
      friend._id === userId || friend === userId
    );
  };

  const hasRequestPending = (userId) => {
    // Check if we've sent a request to this user in this session
    return sentRequests.has(userId) || 
           sendingRequests[userId] || 
           successMessages[userId];
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="user-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Find Friends</h2>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="search-section">
          <div className="search-input-container">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="search-input-field"
              autoFocus
            />
            <button
              onClick={handleSearch}
              className="search-button"
              disabled={loading || !searchQuery.trim()}
            >
              {loading ? <Loader size={18} className="spinner" /> : 'Search'}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={16} />
            <p>{error}</p>
          </div>
        )}

        <div className="search-results">
          {loading ? (
            <div className="loading-state">
              <Loader size={32} className="spinner" />
              <p>Searching users...</p>
            </div>
          ) : searchResults.length === 0 && !error ? (
            <div className="empty-state">
              <Search size={48} />
              <p>Search for users to send chat requests</p>
              <small>Enter a name or email address above to start searching</small>
            </div>
          ) : (
            <div className="results-list">
              {searchResults.map((searchUser) => {
                const isFriend = isAlreadyFriend(searchUser._id);
                const requestPending = hasRequestPending(searchUser._id);
                const isSending = sendingRequests[searchUser._id];
                const successMsg = successMessages[searchUser._id];

                return (
                  <div key={searchUser._id} className="user-result-item">
                    <div className="user-info">
                      <img
                        src={
                          searchUser.avatar ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(searchUser.name)}&background=random`
                        }
                        alt={searchUser.name}
                        className="user-avatar"
                      />
                      <div className="user-details">
                        <h3>{searchUser.name}</h3>
                        <p>{searchUser.email}</p>
                        <div className="user-status">
                          <span className={`status-dot ${searchUser.isOnline ? 'online' : 'offline'}`}></span>
                          {searchUser.isOnline ? 'Online' : 'Offline'}
                        </div>
                      </div>
                    </div>

                    <div className="user-actions">
                      {successMsg ? (
                        <div className="success-message">
                          <CheckCircle size={16} />
                          <span>Request Sent!</span>
                        </div>
                      ) : isFriend ? (
                        <button className="btn btn-already-friend" disabled>
                          Already Friends
                        </button>
                      ) : requestPending ? (
                        <button className="btn btn-request-pending" disabled>
                          <Clock size={16} />
                          <span>Request Pending</span>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSendRequest(searchUser._id)}
                            className="btn btn-send-request"
                            disabled={isSending}
                          >
                            {isSending ? (
                              <>
                                <Loader size={16} className="spinner" />
                                <span>Sending...</span>
                              </>
                            ) : (
                              <>
                                <UserPlus size={16} />
                                <span>Send Request</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleBlockUser(searchUser._id)}
                            className="btn btn-block-user"
                            title="Block user"
                            disabled={isSending}
                          >
                            <Ban size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSearchModal;