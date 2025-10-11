import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, Image, Camera, Video, File, Mic, Square } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import './MessageInput.css';

// A custom hook to detect clicks outside an element
const useOnClickOutside = (ref, handler) => {
    useEffect(() => {
        const listener = (event) => {
            if (!ref.current || ref.current.contains(event.target)) return;
            handler(event);
        };
        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);
        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
};

// Camera Modal Component
const CameraModal = ({ show, onClose, onCapture }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);

    useEffect(() => {
        if (show) {
            setCapturedImage(null);
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
                .then(stream => {
                    setStream(stream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => {
                    console.error("Camera access denied:", err);
                    alert("Camera access was denied. Please allow camera access in your browser settings.");
                    onClose();
                });
        } else {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
            }
        }
    }, [show]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const imageUrl = canvas.toDataURL('image/jpeg');
            setCapturedImage(imageUrl);
        }
    };
    
    const handleUsePhoto = () => {
        onCapture(capturedImage);
        setCapturedImage(null);
        onClose();
    };

    if (!show) return null;

    return (
        <div className="camera-modal-overlay">
            <div className="camera-modal-content">
                <button onClick={onClose} className="camera-modal-close">&times;</button>
                {capturedImage ? (
                    <img src={capturedImage} alt="Captured" className="camera-preview" />
                ) : (
                    <video ref={videoRef} autoPlay playsInline className="camera-feed" />
                )}
                <div className="camera-actions">
                    {capturedImage ? (
                        <>
                            <button onClick={() => setCapturedImage(null)} className="camera-button">Retake</button>
                            <button onClick={handleUsePhoto} className="camera-button primary">Use Photo</button>
                        </>
                    ) : (
                        <button onClick={handleCapture} className="camera-button capture-button">Capture</button>
                    )}
                </div>
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
};

// Voice Recording Component
const VoiceRecorder = ({ onRecordingComplete, onCancel }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordedTime, setRecordedTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                setAudioBlob(audioBlob);
                setAudioUrl(audioUrl);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordedTime(0);

            // Timer for recording duration
            timerRef.current = setInterval(() => {
                setRecordedTime(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Microphone access denied. Please allow microphone access in your browser settings.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const handleSend = () => {
        if (audioBlob) {
            console.log('🎤 Voice recording completed, sending file...');
            const file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
            onRecordingComplete(file);
            // Clean up URL
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        }
    };

    const handleCancel = () => {
        if (isRecording) {
            stopRecording();
        }
        clearInterval(timerRef.current);
        // Clean up URL
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        onCancel();
    };

    const handleRecordAgain = () => {
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordedTime(0);
        startRecording();
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Clean up URL on unmount
    useEffect(() => {
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    return (
        <div className="voice-recorder-container">
            <div className="voice-recorder">
                <div className="recording-indicator">
                    <span className={`recording-dot ${isRecording ? 'active' : ''}`}></span>
                    <span className="recording-time">{formatTime(recordedTime)}</span>
                </div>

                {audioUrl && (
                    <div className="audio-preview">
                        <audio controls src={audioUrl} className="preview-audio" />
                        <div className="audio-duration">{formatTime(recordedTime)}</div>
                    </div>
                )}

                <div className="recorder-buttons">
                    {!audioUrl ? (
                        // Recording state
                        <>
                            {!isRecording ? (
                                <button onClick={startRecording} className="recorder-button start">
                                    <Mic size={20} /> Start Recording
                                </button>
                            ) : (
                                <button onClick={stopRecording} className="recorder-button stop">
                                    <Square size={20} /> Stop Recording
                                </button>
                            )}
                            <button onClick={handleCancel} className="recorder-button cancel">
                                Cancel
                            </button>
                        </>
                    ) : (
                        // Preview state after recording
                        <>
                            <button onClick={handleSend} className="recorder-button send">
                                <Send size={16} /> Send Voice
                            </button>
                            <button onClick={handleRecordAgain} className="recorder-button record-again">
                                <Mic size={16} /> Record Again
                            </button>
                            <button onClick={handleCancel} className="recorder-button cancel">
                                Cancel
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const MessageInput = ({ onSendMessage, onSendFile, selectedUser, socket }) => {
    const [message, setMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
    const [typingTimeout, setTypingTimeout] = useState(null);

    const emojiPickerRef = useRef(null);
    const inputRef = useRef(null);
    const attachmentMenuRef = useRef(null);
    const imageInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const fileInputRef = useRef(null);
    
    useOnClickOutside(emojiPickerRef, () => setShowEmojiPicker(false));
    useOnClickOutside(attachmentMenuRef, () => setShowAttachmentMenu(false));

    // Handle typing indicator
    const handleTyping = (e) => {
        const newMessage = e.target.value;
        setMessage(newMessage);
        
        // Emit typing only if there's content and we have a selected user
        if (socket && selectedUser) {
            if (newMessage.trim()) {
                socket.emit('userTyping', { recipientId: selectedUser._id });
            } else {
                socket.emit('stopTyping', { recipientId: selectedUser._id });
            }
        }

        // Clear existing timeout
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }

        // Set new timeout to stop typing after 2 seconds of inactivity
        const timeout = setTimeout(() => {
            if (socket && selectedUser) {
                socket.emit('stopTyping', { recipientId: selectedUser._id });
            }
        }, 2000);

        setTypingTimeout(timeout);
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (message.trim()) {
            onSendMessage(message.trim());
            setMessage('');
            setShowEmojiPicker(false);
            
            if (socket && selectedUser) {
                socket.emit('stopTyping', { recipientId: selectedUser._id });
            }

            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }
        }
    };
    
    const handleEmojiClick = (emojiObject) => {
        setMessage(prev => prev + emojiObject.emoji);
        inputRef.current.focus();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(e);
        }
    };
    
    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file && onSendFile) {
            console.log('📎 File selected:', file.name, file.type);
            onSendFile(file);
        }
        event.target.value = '';
        setShowAttachmentMenu(false);
    };
    
    const handlePhotoCapture = (imageDataUrl) => {
        console.log('📸 Photo captured, converting to file...');
        fetch(imageDataUrl)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                if (onSendFile) {
                    onSendFile(file);
                }
            })
            .catch(err => console.error('Error converting image:', err));
    };

    const handleVoiceRecording = (audioFile) => {
        if (audioFile && onSendFile) {
            console.log('🎤 Voice recording ready to send:', audioFile.name, audioFile.type);
            onSendFile(audioFile);
        }
        setShowVoiceRecorder(false);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }
        };
    }, [typingTimeout]);

    if (showVoiceRecorder) {
        return (
            <VoiceRecorder 
                onRecordingComplete={handleVoiceRecording}
                onCancel={() => setShowVoiceRecorder(false)}
            />
        );
    }

    return (
        <div className="message-input-container">
            <CameraModal show={showCamera} onClose={() => setShowCamera(false)} onCapture={handlePhotoCapture} />

            {showEmojiPicker && (
                <div ref={emojiPickerRef} className="emoji-picker-wrapper">
                    <EmojiPicker onEmojiClick={handleEmojiClick} theme="light" />
                </div>
            )}
            
            {showAttachmentMenu && (
                <div ref={attachmentMenuRef} className="attachment-menu">
                    <button onClick={() => imageInputRef.current.click()} className="attachment-menu-item">
                        <Image size={20} /> Image
                    </button>
                    <button onClick={() => setShowCamera(true)} className="attachment-menu-item">
                        <Camera size={20} /> Camera
                    </button>
                    <button onClick={() => videoInputRef.current.click()} className="attachment-menu-item">
                        <Video size={20} /> Video
                    </button>
                    <button onClick={() => fileInputRef.current.click()} className="attachment-menu-item">
                        <File size={20} /> File
                    </button>
                </div>
            )}
            
            <form onSubmit={handleSend} className="message-input-form">
                <button type="button" onClick={() => setShowAttachmentMenu(prev => !prev)} className="message-input-button attachment-button">
                    <Paperclip size={22} />
                </button>
                
                <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="message-input-button emoji-button">
                    <Smile size={22} />
                </button>

                {/* Separate Voice Message Button */}
                <button type="button" onClick={() => setShowVoiceRecorder(true)} className="message-input-button voice-button">
                    <Mic size={22} />
                </button>
                
                <div className="input-wrapper">
                    <input
                        ref={inputRef}
                        value={message}
                        onChange={handleTyping}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your message..."
                        className="message-input-field"
                        type="text"
                    />
                </div>
                
                <button type="submit" className="message-input-button send-button" disabled={!message.trim()}>
                    <Send size={20} />
                </button>
                
                <input 
                    type="file" 
                    accept="image/*" 
                    ref={imageInputRef} 
                    onChange={handleFileSelect} 
                    style={{ display: 'none' }} 
                />
                <input 
                    type="file" 
                    accept="video/*" 
                    ref={videoInputRef} 
                    onChange={handleFileSelect} 
                    style={{ display: 'none' }} 
                />
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    style={{ display: 'none' }} 
                />
            </form>
        </div>
    );
};

export default MessageInput;