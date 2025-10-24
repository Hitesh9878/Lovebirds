// src/components/ChatRequestModal.jsx - UPDATED
import React, { useState, useEffect, useContext } from 'react';
import { X, Check, XCircle, Clock, User, Ban } from 'lucide-react';
import { SocketContext } from '../contexts/SocketContext';
import './ChatRequestModal.css';

const ChatRequestModal = ({ isOpen, onClose, requests = [] }) => {
  const [activeTab, setActiveTab] = useState('received');
  const socket = useContext(SocketContext);

  const receivedRequests = requests.received || [];
  const sentRequests = requests.sent || [];

  const handleAccept = (requestId) => {
    if (socket) {
      socket.emit('acceptChatRequest', { requestId });
    }
  };

  const handleReject = (requestId) => {
    if (socket) {
      socket.emit('rejectChatRequest', { requestId });
    }
  };

  const handleCancel = (requestId) => {
    if (socket) {
      socket.emit('cancelChatRequest', { requestId });
    }
  };

  const handleBlock = (userId) => {
    if (socket) {
      socket.emit('blockUser', { userIdToBlock: userId });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="chat-request-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Chat Requests</h2>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab ${activeTab === 'received' ? 'active' : ''}`}
            onClick={() => setActiveTab('received')}
          >
            Received ({receivedRequests.length})
          </button>
          <button
            className={`tab ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            Sent ({sentRequests.length})
          </button>
        </div>

        <div className="modal-content">
          {activeTab === 'received' ? (
            receivedRequests.length === 0 ? (
              <div className="no-requests">
                <Clock size={48} />
                <p>No pending chat requests</p>
              </div>
            ) : (
              <div className="requests-list">
                {receivedRequests.map((request) => (
                  <div key={request._id} className="request-item">
                    <div className="request-user-info">
                      <img
                        src={request.sender?.avatar || `https://ui-avatars.com/api/?name=${request.sender?.name}&background=random`}
                        alt={request.sender?.name}
                        className="request-avatar"
                      />
                      <div className="request-details">
                        <h3>{request.sender?.name}</h3>
                        <p>{request.sender?.email}</p>
                        <small>
                          {new Date(request.createdAt).toLocaleDateString()}
                        </small>
                      </div>
                    </div>

                    <div className="request-actions">
                      <button
                        onClick={() => handleAccept(request._id)}
                        className="btn btn-accept"
                        title="Accept request"
                      >
                        <Check size={18} />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => handleReject(request._id)}
                        className="btn btn-reject"
                        title="Reject request"
                      >
                        <XCircle size={18} />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleBlock(request.sender?._id)}
                        className="btn btn-block"
                        title="Block user"
                      >
                        <Ban size={18} />
                        <span>Block</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            sentRequests.length === 0 ? (
              <div className="no-requests">
                <User size={48} />
                <p>No sent chat requests</p>
              </div>
            ) : (
              <div className="requests-list">
                {sentRequests.map((request) => (
                  <div key={request._id} className="request-item">
                    <div className="request-user-info">
                      <img
                        src={request.receiver?.avatar || `https://ui-avatars.com/api/?name=${request.receiver?.name}&background=random`}
                        alt={request.receiver?.name}
                        className="request-avatar"
                      />
                      <div className="request-details">
                        <h3>{request.receiver?.name}</h3>
                        <p>{request.receiver?.email}</p>
                        <small>
                          Sent {new Date(request.createdAt).toLocaleDateString()}
                        </small>
                      </div>
                    </div>

                    <div className="request-actions">
                      <button
                        onClick={() => handleCancel(request._id)}
                        className="btn btn-cancel"
                        title="Cancel request"
                      >
                        <XCircle size={18} />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatRequestModal;