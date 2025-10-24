// src/components/BlockedUsersModal.jsx - NEW COMPONENT
import React, { useState, useEffect, useContext } from 'react';
import { X, UserX, Shield } from 'lucide-react';
import { SocketContext } from '../contexts/SocketContext';
import './BlockedUsersModal.css';

const BlockedUsersModal = ({ isOpen, onClose }) => {
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const socket = useContext(SocketContext);

    useEffect(() => {
        if (isOpen && socket) {
            fetchBlockedUsers();
        }
    }, [isOpen, socket]);

    const fetchBlockedUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/users/blocked/list', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setBlockedUsers(data);
                console.log('✅ Loaded blocked users:', data.length);
            } else {
                console.error('❌ Failed to fetch blocked users');
            }
        } catch (error) {
            console.error('❌ Error fetching blocked users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUnblock = (userId, userName) => {
        if (window.confirm(`Are you sure you want to unblock ${userName}?`)) {
            if (socket) {
                console.log('🔓 Unblocking user:', userId);
                socket.emit('unblockUser', { userIdToUnblock: userId });
                
                // Remove from local list
                setBlockedUsers(prev => prev.filter(u => u._id !== userId));
                
                alert(`${userName} has been unblocked successfully.`);
            }
        }
    };

    const getAvatarUrl = (user) => {
        if (user?.avatar) {
            if (user.avatar.startsWith('http')) return user.avatar;
            return `${window.location.origin}/uploads/${user.avatar}`;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`;
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content blocked-users-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-header-title">
                        <Shield size={24} />
                        <h2>Blocked Users</h2>
                    </div>
                    <button onClick={onClose} className="modal-close-button">
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Loading blocked users...</p>
                        </div>
                    ) : blockedUsers.length === 0 ? (
                        <div className="empty-state">
                            <UserX size={48} className="empty-icon" />
                            <h3>No Blocked Users</h3>
                            <p>You haven't blocked anyone yet.</p>
                        </div>
                    ) : (
                        <div className="blocked-users-list">
                            {blockedUsers.map((user) => (
                                <div key={user._id} className="blocked-user-item">
                                    <div className="blocked-user-info">
                                        <img
                                            src={getAvatarUrl(user)}
                                            alt={user.name}
                                            className="blocked-user-avatar"
                                            onError={(e) => {
                                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
                                            }}
                                        />
                                        <div className="blocked-user-details">
                                            <h3>{user.name}</h3>
                                            <p>{user.email}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleUnblock(user._id, user.name)}
                                        className="unblock-button"
                                    >
                                        Unblock
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BlockedUsersModal;