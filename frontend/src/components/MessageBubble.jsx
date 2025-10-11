import React from 'react';
import { Check, CheckCheck, Download, Mic } from 'lucide-react';
import './MessageBubble.css';

const MessageBubble = ({ message, isSender }) => {
    const timestamp = message?.createdAt ? new Date(message.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    }) : '';

    const wrapperClasses = `message-bubble-wrapper ${isSender ? 'sender' : 'receiver'}`;
    const bubbleClasses = `message-bubble ${isSender ? 'sender' : 'receiver'}`;

    // Handle file download
    const handleDownload = (fileUrl, fileName) => {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderMessageContent = () => {
        const messageType = message.messageType || 'text';
        const { content } = message;

        switch (messageType) {
            case 'image':
                return (
                    <div className="message-image-container">
                        <img 
                            src={content.fileUrl} 
                            alt={content.fileName || 'image attachment'} 
                            className="message-image" 
                        />
                        <button
                            className="download-btn"
                            onClick={() => handleDownload(content.fileUrl, content.fileName || 'image.jpg')}
                            title="Download image"
                        >
                            <Download size={16} />
                        </button>
                    </div>
                );
            case 'video':
                return (
                    <div className="message-video-container">
                        <video 
                            src={content.fileUrl} 
                            controls 
                            className="message-video"
                        />
                        <button
                            className="download-btn"
                            onClick={() => handleDownload(content.fileUrl, content.fileName || 'video.mp4')}
                            title="Download video"
                        >
                            <Download size={16} />
                        </button>
                    </div>
                );
            case 'voice':
                return (
                    <div className="message-voice-container">
                        <Mic size={20} className="voice-icon" />
                        <audio 
                            src={content.fileUrl} 
                            controls 
                            className="message-audio"
                        />
                        <button
                            className="download-btn"
                            onClick={() => handleDownload(content.fileUrl, content.fileName || 'voice.mp3')}
                            title="Download voice message"
                        >
                            <Download size={16} />
                        </button>
                    </div>
                );
            case 'file':
                return (
                    <div className="message-file-container">
                        <a 
                            href={content.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="message-file"
                        >
                            📄 <span>{content.fileName || 'View File'}</span>
                        </a>
                        <button
                            className="download-btn"
                            onClick={() => handleDownload(content.fileUrl, content.fileName || 'file')}
                            title="Download file"
                        >
                            <Download size={16} />
                        </button>
                    </div>
                );
            default: // 'text'
                return <div className="message-text">{content.text}</div>;
        }
    };

    const renderMessageStatus = () => {
        // Only show status for sender's messages
        if (!isSender) return null;

        // Handle different message states
        if (message?.isOptimistic) {
            return <span className="message-status optimistic">sending...</span>;
        }
        
        if (message?.failed) {
            return <span className="message-status failed">failed</span>;
        }

        // Message status based on delivery and read status
        const isDelivered = message?.isDelivered === true;
        const isRead = message?.isRead === true;

        if (isRead) {
            // Read: Double tick (green)
            return (
                <span className="message-status-icon read" title="Read">
                    <CheckCheck size={16} />
                </span>
            );
        } else if (isDelivered) {
            // Delivered but not read: Double tick (grey)
            return (
                <span className="message-status-icon delivered" title="Delivered">
                    <CheckCheck size={16} />
                </span>
            );
        } else {
            // Sent but not delivered: Single tick (grey)
            return (
                <span className="message-status-icon sent" title="Sent">
                    <Check size={16} />
                </span>
            );
        }
    };

    return (
        <div className={wrapperClasses}>
            <div className={bubbleClasses}>
                {renderMessageContent()}
            </div>
            <div className="message-meta">
                <span className="message-time">{timestamp}</span>
                {renderMessageStatus()}
            </div>
        </div>
    );
};

export default MessageBubble;