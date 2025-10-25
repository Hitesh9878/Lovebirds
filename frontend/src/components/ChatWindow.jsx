// src/components/ChatWindow.jsx - INCOGNITO WITH DURATION DROPDOWN
import React, { useState, useEffect, useContext, useRef } from 'react';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import VideoCallModal from './VideoCallModal';
import IncomingCallNotification from './IncomingCallNotification';
import TypingIndicator from './TypingIndicator';
import { SocketContext } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext.jsx';
import { VideoCallContext } from '../contexts/VideoCallContext';
import { Video, Send, Search, MoreVertical, Phone, Trash2, UserMinus, Ban, ChevronDown } from 'lucide-react';
import './ChatWindow.css';

const getChatId = (userA, userB) => [userA, userB].sort().join('_');

const ChatWindow = ({ selectedUser, onOptimisticMessage }) => {
    const [messages, setMessages] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [typingUser, setTypingUser] = useState(null);
    const [incognitoEnabled, setIncognitoEnabled] = useState(false);
    const [incognitoExpiry, setIncognitoExpiry] = useState(null);
    const [incognitoDuration, setIncognitoDuration] = useState(3); // Default 3 hours
    const [showDurationMenu, setShowDurationMenu] = useState(false);
    const typingTimeoutRef = useRef(null);
    const durationMenuRef = useRef(null);

    const socket = useContext(SocketContext);
    const { user } = useAuth();
    const { callUser } = useContext(VideoCallContext);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isTyping]);

    // Close duration menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (durationMenuRef.current && !durationMenuRef.current.contains(event.target)) {
                setShowDurationMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!socket || !selectedUser || !user) return;

        const chatId = getChatId(user._id, selectedUser._id);

        const handleReceiveMessage = (newMessage) => {
            if (!newMessage || !newMessage.sender?._id) return;
            if (newMessage.chatId !== chatId) return;

            setMessages(prev => {
                const filteredMessages = prev.filter(msg => msg.tempId !== newMessage.tempId);
                return [...filteredMessages, newMessage];
            });

            if (newMessage.sender._id !== user._id) {
                socket.emit('markMessageAsRead', {
                    messageId: newMessage._id,
                    senderId: newMessage.sender._id
                });
            }
        };

        const handleMessagesLoaded = (data) => {
            if (data.chatId === chatId) {
                setMessages(data.messages);
                setLoading(false);

                const unreadMessages = data.messages.filter(msg =>
                    msg.sender._id !== user._id && !msg.isRead
                );

                if (unreadMessages.length > 0) {
                    socket.emit('markChatAsRead', { otherUserId: selectedUser._id });
                }
            }
        };

        const handleMessagesLoadError = (error) => {
            setLoading(false);
            if (error.requiresFriendship) {
                alert('You must be friends with this user to view messages. Send a chat request first!');
            } else if (error.isBlocked) {
                alert('You cannot view messages from this user.');
            }
        };

        const handleChatCleared = (data) => {
            if (data.chatId === chatId) {
                setMessages([]);
                setShowMenu(false);
            }
        };

        const handleMessageDeleted = (data) => {
            if (data.chatId === chatId) {
                setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
            }
        };

        const handleMessageDelivered = (data) => {
            const { messageId, deliveredAt } = data;
            setMessages(prev => prev.map(msg => {
                if (msg._id === messageId || msg.tempId === data.tempId) {
                    return { ...msg, isDelivered: true, deliveredAt: deliveredAt };
                }
                return msg;
            }));
        };

        const handleMessageRead = (data) => {
            const { messageId, readAt } = data;
            setMessages(prev => prev.map(msg => {
                if (msg._id === messageId) {
                    return { ...msg, isRead: true, readAt: readAt };
                }
                return msg;
            }));
        };

        const handleChatRead = (data) => {
            const { readAt, readBy } = data;
            if (readBy !== user._id) {
                setMessages(prev => prev.map(msg => {
                    if (msg.sender._id === user._id && !msg.isRead) {
                        return { ...msg, isRead: true, readAt: readAt };
                    }
                    return msg;
                }));
            }
        };

        const handleTyping = (data) => {
            if (data?.userId === user._id) return;
            if (data?.userId !== selectedUser._id) return;
            if (data?.chatId !== chatId) return;
            
            setTypingUser(selectedUser.name);
            setIsTyping(true);
            
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            
            typingTimeoutRef.current = setTimeout(() => {
                setIsTyping(false);
                setTypingUser(null);
            }, 6000);
        };
        
        const handleStopTyping = (data) => {
            if (data?.userId === user._id) return;
            if (data?.userId !== selectedUser._id) return;
            if (data?.chatId !== chatId) return;
            
            setIsTyping(false);
            setTypingUser(null);
            
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };

        const handleIncognitoEnabled = (data) => {
            if (data.chatId === chatId) {
                setIncognitoEnabled(true);
                setIncognitoExpiry(new Date(data.expiresAt));
                console.log('🕵️ Incognito mode enabled:', data);
            }
        };

        const handleIncognitoDisabled = (data) => {
            if (data.chatId === chatId) {
                setIncognitoEnabled(false);
                setIncognitoExpiry(null);
                console.log('👁️ Incognito mode disabled:', data);
            }
        };

        const handleIncognitoStatus = (data) => {
            if (data.chatId === chatId) {
                setIncognitoEnabled(data.enabled);
                if (data.enabled && data.expiresAt) {
                    setIncognitoExpiry(new Date(data.expiresAt));
                } else {
                    setIncognitoExpiry(null);
                }
                console.log('🕵️ Incognito status loaded:', data);
            }
        };

        socket.on('receiveMessage', handleReceiveMessage);
        socket.on('messagesLoaded', handleMessagesLoaded);
        socket.on('messagesLoadError', handleMessagesLoadError);
        socket.on('chatCleared', handleChatCleared);
        socket.on('messageDeleted', handleMessageDeleted);
        socket.on('messageDelivered', handleMessageDelivered);
        socket.on('messageRead', handleMessageRead);
        socket.on('chatRead', handleChatRead);
        socket.on('typing', handleTyping);
        socket.on('stopTyping', handleStopTyping);
        socket.on('incognitoEnabled', handleIncognitoEnabled);
        socket.on('incognitoDisabled', handleIncognitoDisabled);
        socket.on('incognitoStatus', handleIncognitoStatus);

        socket.on('messageSent', (confirmation) => {
            if (confirmation?.success && confirmation.tempId) {
                setMessages(prev => prev.map(msg => {
                    if (msg.tempId === confirmation.tempId) {
                        return {
                            ...msg,
                            _id: confirmation.messageId,
                            isOptimistic: false,
                            confirmed: true,
                            isDelivered: confirmation.isDelivered || false,
                            deliveredAt: confirmation.deliveredAt || null
                        };
                    }
                    return msg;
                }));
            }
        });

        socket.on('sendMessageError', (error) => {
            if (error.requiresFriendship) {
                alert('You must be friends to send messages. Send a chat request first!');
            } else if (error.isBlocked) {
                alert('You cannot send messages to this user.');
            }
            
            if (error.tempId) {
                setMessages(prev => prev.map(msg => {
                    if (msg.tempId === error.tempId) {
                        return {
                            ...msg,
                            isOptimistic: false,
                            failed: true,
                            errorMessage: error.message
                        };
                    }
                    return msg;
                }));
            }
        });

        socket.emit('getIncognitoStatus', { otherUserId: selectedUser._id });

        return () => {
            socket.off('receiveMessage', handleReceiveMessage);
            socket.off('messagesLoaded', handleMessagesLoaded);
            socket.off('messagesLoadError', handleMessagesLoadError);
            socket.off('chatCleared', handleChatCleared);
            socket.off('messageDeleted', handleMessageDeleted);
            socket.off('messageDelivered', handleMessageDelivered);
            socket.off('messageRead', handleMessageRead);
            socket.off('chatRead', handleChatRead);
            socket.off('typing', handleTyping);
            socket.off('stopTyping', handleStopTyping);
            socket.off('incognitoEnabled', handleIncognitoEnabled);
            socket.off('incognitoDisabled', handleIncognitoDisabled);
            socket.off('incognitoStatus', handleIncognitoStatus);
            socket.off('messageSent');
            socket.off('sendMessageError');
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [socket, selectedUser, user]);

    const handleToggleIncognito = (hours = null) => {
        if (!socket || !selectedUser) return;
        
        const newState = !incognitoEnabled;
        const duration = hours || incognitoDuration;
        
        console.log('🔄 Toggling incognito mode:', newState, 'Duration:', duration, 'hours');
        
        socket.emit('toggleIncognito', {
            otherUserId: selectedUser._id,
            enabled: newState,
            durationHours: duration
        });

        setShowDurationMenu(false);
    };

    const handleDurationSelect = (hours) => {
        setIncognitoDuration(hours);
        if (incognitoEnabled) {
            // If already enabled, restart with new duration
            handleToggleIncognito(hours);
        } else {
            // If not enabled, just save the selection
            setShowDurationMenu(false);
        }
    };

    const handleSendMessage = async (content) => {
        if (!content.trim() || !selectedUser || !socket) return;
        const tempId = Date.now().toString();
        const chatId = getChatId(user._id, selectedUser._id);

        socket.emit('sendMessage', {
            receiverId: selectedUser._id,
            messageType: 'text',
            content: { text: content },
            tempId: tempId
        });

        socket.emit('userActivity');

        const optimisticMessage = {
            _id: tempId,
            tempId,
            chatId,
            receiverId: selectedUser._id,
            sender: { _id: user._id, name: user.name, avatar: user.avatar },
            content: { text: content },
            messageType: 'text',
            createdAt: new Date().toISOString(),
            isOptimistic: true,
            isDelivered: false,
            isRead: false,
            deliveredAt: null,
            readAt: null
        };

        setMessages(prev => [...prev, optimisticMessage]);

        if (onOptimisticMessage) onOptimisticMessage(optimisticMessage, selectedUser._id);

        if (!selectedUser.isOnline) {
            try {
                await fetch('https://lovebirds-mwyz.onrender.com/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipientEmail: selectedUser.email,
                        senderName: user.name
                    })
                });
            } catch (error) {
                console.error('Failed to send offline email:', error);
            }
        }
    };

    const handleSendFile = async (file) => {
        if (!file || !selectedUser || !socket) return;
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch('https://lovebirds-mwyz.onrender.com/api/upload', {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'File upload failed');
            }
            
            const data = await response.json();
            const { fileUrl, fileName, mimeType } = data;
            
            let messageType = 'file';
            if (mimeType.startsWith('image/')) {
                messageType = 'image';
            } else if (mimeType.startsWith('video/')) {
                messageType = 'video';
            } else if (mimeType.startsWith('audio/')) {
                messageType = 'voice';
            }
            
            const tempId = Date.now().toString();
            const chatId = getChatId(user._id, selectedUser._id);

            socket.emit('sendMessage', {
                receiverId: selectedUser._id,
                messageType,
                content: { 
                    fileUrl, 
                    fileName: messageType === 'voice' ? `voice-message-${Date.now()}.webm` : fileName 
                },
                tempId: tempId
            });

            const optimisticMessage = {
                _id: tempId,
                tempId,
                chatId,
                receiverId: selectedUser._id,
                sender: { _id: user._id, name: user.name, avatar: user.avatar },
                content: { 
                    fileUrl, 
                    fileName: messageType === 'voice' ? `voice-message-${Date.now()}.webm` : fileName 
                },
                messageType,
                createdAt: new Date().toISOString(),
                isOptimistic: true,
                isDelivered: false,
                isRead: false,
                deliveredAt: null,
                readAt: null
            };

            setMessages(prev => [...prev, optimisticMessage]);
            
        } catch (error) {
            console.error('❌ Error uploading and sending file:', error);
            alert(`File upload failed: ${error.message}`);
        }
    };

    const handleClearChat = () => {
        if (window.confirm('Are you sure you want to clear this chat? This action cannot be undone.')) {
            socket.emit('clearChat', { otherUserId: selectedUser._id });
        }
        setShowMenu(false);
    };

    const handleRemoveFriend = () => {
        if (window.confirm(`Are you sure you want to remove ${selectedUser.name} from your friends? You will need to send a new chat request to message them again.`)) {
            if (socket) {
                console.log('🔄 Removing friend:', selectedUser._id);
                socket.emit('removeFriend', { friendId: selectedUser._id });
                alert(`${selectedUser.name} has been removed from your friends list.`);
                setShowMenu(false);
            }
        } else {
            setShowMenu(false);
        }
    };

    const handleBlockUser = () => {
        if (window.confirm(`Are you sure you want to block ${selectedUser.name}? They will be removed from your friends and won't be able to send you messages or chat requests.`)) {
            if (socket) {
                console.log('🚫 Blocking user:', selectedUser._id);
                socket.emit('blockUser', { userIdToBlock: selectedUser._id });
                alert(`${selectedUser.name} has been blocked successfully.`);
                setShowMenu(false);
            }
        } else {
            setShowMenu(false);
        }
    };

    useEffect(() => {
        if (!selectedUser) {
            setMessages([]);
            setIsTyping(false);
            setIncognitoEnabled(false);
            setIncognitoExpiry(null);
            return;
        }
        setMessages([]);
        setSearchTerm('');
        setShowSearch(false);
        setShowMenu(false);
        setLoading(true);
        setIsTyping(false);

        if (socket) {
            const roomId = getChatId(user._id, selectedUser._id);
            socket.emit('joinChat', roomId);
            socket.emit('loadMessages', { otherUserId: selectedUser._id });
        }
    }, [selectedUser, socket, user]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && selectedUser && socket) {
                socket.emit('markChatAsRead', { otherUserId: selectedUser._id });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleVisibilityChange);
        };
    }, [selectedUser, socket]);

    if (!selectedUser) {
        return (
            <div className="chat-placeholder">
                <div className="placeholder-content">
                    <Send size={64} className="placeholder-icon" />
                    <h2>Welcome to Chat</h2>
                    <p>Select a friend from the sidebar to start a conversation</p>
                </div>
            </div>
        );
    }

    const getAvatarUrl = (userObj) => {
        if (userObj?.avatar) {
            if (userObj.avatar.startsWith('http')) return userObj.avatar;
            return `${window.location.origin}/uploads/${userObj.avatar}`;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(userObj?.name || 'User')}&background=random`;
    };

    const isSenderMessage = (message) => message?.sender?._id === user._id;

    const filteredMessages = searchTerm
        ? messages.filter(msg => msg.content?.text?.toLowerCase().includes(searchTerm.toLowerCase()))
        : messages;

    const getRemainingTime = () => {
        if (!incognitoExpiry) return '';
        const now = new Date();
        const diff = incognitoExpiry - now;
        if (diff <= 0) return 'Expired';
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m remaining`;
        }
        return `${minutes}m remaining`;
    };

    return (
        <div className="chat-window-container">
            <IncomingCallNotification />
            <VideoCallModal />
            
            {isTyping && <TypingIndicator userName={typingUser || selectedUser.name} />}
            
            <div className="chat-header">
                <div className="user-info">
                    <img
                        src={getAvatarUrl(selectedUser)}
                        alt={selectedUser.name}
                        className="header-avatar"
                        onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name)}&background=random`;
                        }}
                    />
                    <div className="user-details">
                        <h3 className="header-name">{selectedUser.name}</h3>
                        <p className="header-status">
                            <span className={`status-indicator ${selectedUser.isOnline ? 'online' : 'offline'}`}></span>
                            {isTyping ? `${selectedUser.name} is typing...` : selectedUser.isOnline ? 'Active now' : 'Offline'}
                        </p>
                        {incognitoEnabled && incognitoExpiry && (
                            <p className="incognito-status">
                                🕵️ Incognito mode • {getRemainingTime()}
                            </p>
                        )}
                    </div>
                </div>
                <div className="header-actions">
                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        className={`header-btn ${showSearch ? 'active' : ''}`}
                        title="Search messages"
                    >
                        <Search size={20} />
                    </button>
                    
                    {/* ✅ UPDATED: Incognito Toggle with Duration Dropdown */}
                    <div className="incognito-toggle-container" ref={durationMenuRef}>
                        <label className="incognito-toggle">
                            <input
                                type="checkbox"
                                checked={incognitoEnabled}
                                onChange={() => handleToggleIncognito()}
                            />
                            <span className="incognito-slider"></span>
                        </label>
                        <div className="incognito-controls">
                            <span className="incognito-label">Incognito</span>
                            <button
                                className="incognito-duration-btn"
                                onClick={() => setShowDurationMenu(!showDurationMenu)}
                                title="Select duration"
                            >
                                {incognitoDuration}h <ChevronDown size={14} />
                            </button>
                        </div>
                        
                        {showDurationMenu && (
                            <div className="incognito-duration-menu">
                                <button
                                    className={`duration-option ${incognitoDuration === 1 ? 'active' : ''}`}
                                    onClick={() => handleDurationSelect(1)}
                                >
                                    <span className="duration-icon">⏱️</span>
                                    <span className="duration-text">1 Hour</span>
                                    {incognitoDuration === 1 && <span className="check-icon">✓</span>}
                                </button>
                                <button
                                    className={`duration-option ${incognitoDuration === 2 ? 'active' : ''}`}
                                    onClick={() => handleDurationSelect(2)}
                                >
                                    <span className="duration-icon">⏱️</span>
                                    <span className="duration-text">2 Hours</span>
                                    {incognitoDuration === 2 && <span className="check-icon">✓</span>}
                                </button>
                                <button
                                    className={`duration-option ${incognitoDuration === 3 ? 'active' : ''}`}
                                    onClick={() => handleDurationSelect(3)}
                                >
                                    <span className="duration-icon">⏱️</span>
                                    <span className="duration-text">3 Hours</span>
                                    {incognitoDuration === 3 && <span className="check-icon">✓</span>}
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <button onClick={() => callUser(selectedUser._id)} className="header-btn" title="Video call">
                        <Video size={20} />
                    </button>
                    <button className="header-btn" title="Voice call">
                        <Phone size={20} />
                    </button>
                    <div className="menu-container">
                        <button
                            className="header-btn"
                            title="More options"
                            onClick={() => setShowMenu(!showMenu)}
                        >
                            <MoreVertical size={20} />
                        </button>
                        {showMenu && (
                            <div className="dropdown-menu">
                                <button className="dropdown-item warning" onClick={handleRemoveFriend}>
                                    <UserMinus size={16} /> Remove Friend
                                </button>
                                
                                <button className="dropdown-item danger" onClick={handleBlockUser}>
                                    <Ban size={16} /> Block User
                                </button>
                                
                                <div className="dropdown-divider"></div>
                                
                                <button className="dropdown-item danger" onClick={handleClearChat}>
                                    <Trash2 size={16} /> Clear Chat
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {showSearch && (
                <div className="search-container-chat">
                    <div className="search-input-wrapper">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search in conversation..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input-chat"
                            autoFocus
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="clear-search">×</button>
                        )}
                    </div>
                </div>
            )}
            <div className="messages-area" onClick={() => setShowMenu(false)}>
                <div className="messages-list">
                    {loading ? (
                        <div className="loading-messages"><p>Loading messages...</p></div>
                    ) : filteredMessages.length === 0 ? (
                        <div className="no-messages">
                            {searchTerm ? (
                                <div className="no-search-results">
                                    <Search size={48} />
                                    <p>No messages found for "{searchTerm}"</p>
                                </div>
                            ) : (
                                <div className="chat-start">
                                    <div className="start-avatar">
                                        <img src={getAvatarUrl(selectedUser)} alt={selectedUser.name} />
                                    </div>
                                    <h3>Start chatting with {selectedUser.name}</h3>
                                    <p>Send a message to begin your conversation</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        filteredMessages.map((msg, index) => (
                            <MessageBubble
                                key={msg._id || msg.tempId || index}
                                message={msg}
                                isSender={isSenderMessage(msg)}
                            />
                        ))
                    )}
                    
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <MessageInput
                onSendMessage={handleSendMessage}
                onSendFile={handleSendFile}
                socket={socket}
                selectedUser={selectedUser}
            />
        </div>
    );
};

export default ChatWindow;
