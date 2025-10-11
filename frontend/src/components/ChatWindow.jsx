import React, { useState, useEffect, useContext, useRef } from 'react';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import VideoCallModal from './VideoCallModal';
import IncomingCallNotification from './IncomingCallNotification';
import { SocketContext } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext.jsx';
import { VideoCallContext } from '../contexts/VideoCallContext';
import { Video, Send, Search, MoreVertical, Phone, Trash2 } from 'lucide-react';
import './ChatWindow.css';

const getChatId = (userA, userB) => [userA, userB].sort().join('_');

const ChatWindow = ({ selectedUser, onOptimisticMessage }) => {
    const [messages, setMessages] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef(null);

    const socket = useContext(SocketContext);
    const { user } = useAuth();
    const { callUser } = useContext(VideoCallContext);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

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
                    console.log(`Marking ${unreadMessages.length} messages as read`);
                    socket.emit('markChatAsRead', { otherUserId: selectedUser._id });
                }
            }
        };

        const handleMessagesLoadError = () => setLoading(false);

        const handleChatCleared = (data) => {
            if (data.chatId === chatId) {
                setMessages([]);
                setShowMenu(false);
            }
        };

        const handleChatClearSuccess = () => {
            setMessages([]);
            setShowMenu(false);
        };

        const handleChatClearError = (error) => {
            console.error('Failed to clear chat:', error);
            alert('Failed to clear chat. Please try again.');
        };

        const handleMessageDelivered = (data) => {
            const { messageId, deliveredAt } = data;
            setMessages(prev => prev.map(msg => {
                if (msg._id === messageId || msg.tempId === data.tempId) {
                    return {
                        ...msg,
                        isDelivered: true,
                        deliveredAt: deliveredAt
                    };
                }
                return msg;
            }));
        };

        const handleMessageRead = (data) => {
            const { messageId, readAt } = data;
            setMessages(prev => prev.map(msg => {
                if (msg._id === messageId) {
                    return {
                        ...msg,
                        isRead: true,
                        readAt: readAt
                    };
                }
                return msg;
            }));
        };

        const handleChatRead = (data) => {
            const { readAt, readBy } = data;
            if (readBy !== user._id) {
                setMessages(prev => prev.map(msg => {
                    if (msg.sender._id === user._id && !msg.isRead) {
                        return {
                            ...msg,
                            isRead: true,
                            readAt: readAt
                        };
                    }
                    return msg;
                }));
            }
        };

        // Handle user typing - only show for messages from the selected user
        const handleUserTyping = (data) => {
            console.log('⌨️ Typing data received:', data, 'selectedUser._id:', selectedUser._id);
            if (data?.senderId === selectedUser._id) {
                console.log('⌨️ Setting isTyping to true for user:', selectedUser.name);
                setIsTyping(true);
                if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                }
                typingTimeoutRef.current = setTimeout(() => {
                    console.log('⌨️ Typing timeout - setting isTyping to false');
                    setIsTyping(false);
                }, 3000);
            } else {
                console.log('⌨️ Ignoring typing from different user');
            }
        };

        const handleStopTyping = (data) => {
            console.log('✋ Stop typing data received:', data);
            if (data?.senderId === selectedUser._id) {
                console.log('✋ Setting isTyping to false');
                setIsTyping(false);
                if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                }
            }
        };

        socket.on('receiveMessage', handleReceiveMessage);
        socket.on('messagesLoaded', handleMessagesLoaded);
        socket.on('messagesLoadError', handleMessagesLoadError);
        socket.on('chatCleared', handleChatCleared);
        socket.on('chatClearSuccess', handleChatClearSuccess);
        socket.on('chatClearError', handleChatClearError);
        socket.on('messageDelivered', handleMessageDelivered);
        socket.on('messageRead', handleMessageRead);
        socket.on('chatRead', handleChatRead);
        socket.on('userTyping', handleUserTyping);
        socket.on('stopTyping', handleStopTyping);

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

        return () => {
            socket.off('receiveMessage', handleReceiveMessage);
            socket.off('messagesLoaded', handleMessagesLoaded);
            socket.off('messagesLoadError', handleMessagesLoadError);
            socket.off('chatCleared', handleChatCleared);
            socket.off('chatClearSuccess', handleChatClearSuccess);
            socket.off('chatClearError', handleChatClearError);
            socket.off('messageDelivered', handleMessageDelivered);
            socket.off('messageRead', handleMessageRead);
            socket.off('chatRead', handleChatRead);
            socket.off('userTyping', handleUserTyping);
            socket.off('stopTyping', handleStopTyping);
            socket.off('messageSent');
            socket.off('sendMessageError');
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [socket, selectedUser, user]);

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
                await fetch('http://localhost:5000/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipientEmail: selectedUser.email,
                        senderName: user.name
                    })
                });
                console.log(`Email sent to ${selectedUser.email}`);
            } catch (error) {
                console.error('Failed to send offline email:', error);
            }
        }
    };

    const handleSendFile = async (file) => {
        if (!file || !selectedUser || !socket) {
            console.error('❌ Missing requirements:', {
                file: !!file,
                selectedUser: !!selectedUser,
                socket: !!socket
            });
            return;
        }
        
        console.log('📤 === VOICE MESSAGE DEBUG START ===');
        console.log('📤 File details:', {
            name: file.name,
            type: file.type,
            size: file.size
        });
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            console.log('📤 Uploading to:', 'http://localhost:5000/api/upload');
            
            const response = await fetch('http://localhost:5000/api/upload', {
                method: 'POST',
                body: formData,
            });
            
            console.log('📤 Upload response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Upload failed:', errorData);
                throw new Error(errorData.message || 'File upload failed');
            }
            
            const data = await response.json();
            console.log('✅ Upload successful:', data);
            
            const { fileUrl, fileName, mimeType } = data;
            
            // ✅ CRITICAL FIX: Always use 'voice' for voice recordings
            let messageType = 'file';
            if (mimeType.startsWith('image/')) {
                messageType = 'image';
            } else if (mimeType.startsWith('video/')) {
                messageType = 'video';
            } else if (mimeType.startsWith('audio/') || file.type.startsWith('audio/')) {
                messageType = 'voice'; // ✅ Always use 'voice' for audio files
            }
            
            console.log('📤 Determined messageType:', messageType, 'MIME type:', mimeType);
            
            const tempId = Date.now().toString();
            const chatId = getChatId(user._id, selectedUser._id);

            console.log('📤 Emitting sendMessage:', {
                receiverId: selectedUser._id,
                messageType,
                content: { fileUrl, fileName },
                tempId
            });
            
            // Send via socket
            socket.emit('sendMessage', {
                receiverId: selectedUser._id,
                messageType,
                content: { 
                    fileUrl, 
                    fileName: messageType === 'voice' ? `voice-message-${Date.now()}.webm` : fileName 
                },
                tempId: tempId
            });

            // Create optimistic message
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

            console.log('✨ Adding optimistic message:', optimisticMessage);
            setMessages(prev => [...prev, optimisticMessage]);
            console.log('📤 === VOICE MESSAGE DEBUG END ===\n');
            
        } catch (error) {
            console.error('❌ Error uploading and sending file:', error);
            alert(`File upload failed: ${error.message}`);
        }
    };

    const handleClearChat = () => {
        if (window.confirm('Are you sure you want to clear this chat? This action cannot be undone.')) {
            socket.emit('clearChat', { otherUserId: selectedUser._id });
        }
    };

    useEffect(() => {
        if (!selectedUser) {
            setMessages([]);
            setIsTyping(false);
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

    return (
        <div className="chat-window-container">
            <IncomingCallNotification />
            <VideoCallModal />
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
                            {selectedUser.isOnline ? 'Active now' : isTyping ? 'Typing...' : 'Offline'}
                        </p>
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
                    
                    {/* Enhanced Typing Indicator */}
                    {isTyping && (
                        <div className="typing-indicator">
                            <div className="typing-indicator-content">
                                <img
                                    src={getAvatarUrl(selectedUser)}
                                    alt={selectedUser.name}
                                    className="typing-avatar"
                                />
                                <div className="typing-bubble">
                                    <div className="typing-dots">
                                        <div className="typing-dot"></div>
                                        <div className="typing-dot"></div>
                                        <div className="typing-dot"></div>
                                    </div>
                                    <span className="typing-text">typing...</span>
                                </div>
                            </div>
                        </div>
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