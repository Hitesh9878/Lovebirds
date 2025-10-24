// src/components/MessageInput.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Smile, Image, Camera, Video, File, Mic, Square } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useAuth } from '../contexts/AuthContext';
import './MessageInput.css';

/* ---------- Click Outside Hook ---------- */
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

/* ---------- Camera Modal ---------- */
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
                    if (videoRef.current) videoRef.current.srcObject = stream;
                })
                .catch(err => {
                    console.error("Camera access denied:", err);
                    alert("Camera access was denied. Please allow camera access in your browser settings.");
                    onClose();
                });
        } else if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
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

/* ---------- Voice Recorder ---------- */
const VoiceRecorder = ({ onRecordingComplete, onCancel }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordedTime, setRecordedTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const streamRef = useRef(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            
            streamRef.current = stream;
            
            // Check for supported MIME types
            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm';
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/ogg;codecs=opus';
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = ''; // Use default
            }

            console.log('🎤 Using MIME type:', mimeType || 'default');

            const options = mimeType ? { mimeType } : {};
            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    console.log('🎤 Audio chunk received:', event.data.size, 'bytes');
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                console.log('🎤 Recording stopped, chunks:', audioChunksRef.current.length);
                
                const finalMimeType = mediaRecorder.mimeType || mimeType || 'audio/webm';
                const audioBlob = new Blob(audioChunksRef.current, { type: finalMimeType });
                
                console.log('🎤 Created audio blob:', {
                    size: audioBlob.size,
                    type: audioBlob.type
                });
                
                const audioUrl = URL.createObjectURL(audioBlob);
                setAudioBlob(audioBlob);
                setAudioUrl(audioUrl);
                
                // Clean up the stream
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
            };

            mediaRecorder.start(100); // Collect data every 100ms for smoother recording
            setIsRecording(true);
            setRecordedTime(0);

            timerRef.current = setInterval(() => {
                setRecordedTime(prev => prev + 1);
            }, 1000);
            
            console.log('🎤 Recording started');
        } catch (error) {
            console.error('❌ Error accessing microphone:', error);
            alert('Microphone access denied. Please allow microphone access in your browser settings.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            console.log('🛑 Stopping recording...');
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const handleSend = async () => {
        if (audioBlob) {
            console.log('📤 Sending voice recording:', {
                size: audioBlob.size,
                type: audioBlob.type
            });

            try {
                // Determine file extension based on MIME type
                let extension = 'webm';
                if (audioBlob.type.includes('ogg')) {
                    extension = 'ogg';
                } else if (audioBlob.type.includes('mp3')) {
                    extension = 'mp3';
                } else if (audioBlob.type.includes('wav')) {
                    extension = 'wav';
                }

                const fileName = `voice-message-${Date.now()}.${extension}`;
                
                // Create a File object - fallback to adding properties to Blob if File constructor not available
                let file;
                try {
                    file = new File([audioBlob], fileName, { 
                        type: audioBlob.type
                    });
                } catch (e) {
                    // Fallback for browsers that don't support File constructor
                    file = audioBlob;
                    file.name = fileName;
                    file.lastModified = Date.now();
                }

                console.log('📤 Created file:', {
                    name: file.name,
                    size: file.size,
                    type: file.type
                });

                await onRecordingComplete(file);
                
                if (audioUrl) {
                    URL.revokeObjectURL(audioUrl);
                }
            } catch (error) {
                console.error('❌ Error sending voice recording:', error);
                alert('Failed to send voice message. Please try again.');
            }
        }
    };

    const handleCancel = () => {
        if (isRecording) stopRecording();
        clearInterval(timerRef.current);
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        
        onCancel();
    };

    const handleRecordAgain = () => {
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordedTime(0);
        audioChunksRef.current = [];
        startRecording();
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
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

/* ---------- MAIN MESSAGE INPUT ---------- */
const MessageInput = ({ onSendMessage, onSendFile, selectedUser, socket }) => {
    const [message, setMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

    const typingTimeoutRef = useRef(null);
    const lastTypingEmitRef = useRef(0);

    const { user } = useAuth();
    const emojiPickerRef = useRef(null);
    const inputRef = useRef(null);
    const attachmentMenuRef = useRef(null);
    const imageInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const fileInputRef = useRef(null);

    useOnClickOutside(emojiPickerRef, () => setShowEmojiPicker(false));
    useOnClickOutside(attachmentMenuRef, () => setShowAttachmentMenu(false));

    const getChatId = (userA, userB) => [userA, userB].sort().join('_');

    /* ---------- Optimized Typing Handler ---------- */
    const handleTyping = (e) => {
        const newMessage = e.target.value;
        setMessage(newMessage);

        if (!socket || !selectedUser || !user) return;

        const chatId = getChatId(user._id, selectedUser._id);
        const hasText = newMessage.trim().length > 0;
        const now = Date.now();

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        if (hasText) {
            if (now - lastTypingEmitRef.current > 1000) {
                socket.emit('typing', { chatId });
                lastTypingEmitRef.current = now;
            }

            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('stopTyping', { chatId });
                lastTypingEmitRef.current = 0;
            }, 3000);
        } else {
            socket.emit('stopTyping', { chatId });
            lastTypingEmitRef.current = 0;
        }
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        const chatId = getChatId(user._id, selectedUser._id);
        socket.emit('stopTyping', { chatId });
        lastTypingEmitRef.current = 0;

        onSendMessage(message.trim());
        setMessage('');
        setShowEmojiPicker(false);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };

    const handleEmojiClick = (emojiObject) => {
        setMessage(prev => prev + emojiObject.emoji);
        inputRef.current.focus();
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            onSendFile(file);
        }
        e.target.value = '';
        setShowAttachmentMenu(false);
    };

    const handlePhotoCapture = (imageDataUrl) => {
        fetch(imageDataUrl)
            .then(res => res.blob())
            .then(blob => {
                const fileName = `capture-${Date.now()}.jpg`;
                let file;
                try {
                    file = new File([blob], fileName, { type: 'image/jpeg' });
                } catch (e) {
                    // Fallback for browsers that don't support File constructor
                    file = blob;
                    file.name = fileName;
                    file.lastModified = Date.now();
                }
                onSendFile(file);
            });
    };

    const handleVoiceRecording = async (audioFile) => {
        try {
            console.log('🎤 Voice recording to send:', {
                name: audioFile.name,
                type: audioFile.type,
                size: audioFile.size
            });
            
            // Send the voice file directly
            await onSendFile(audioFile);
            setShowVoiceRecorder(false);
            console.log('✅ Voice message sent successfully');
        } catch (error) {
            console.error('❌ Error sending voice recording:', error);
            alert('Failed to send voice message. Please try again.');
        }
    };

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (socket && selectedUser && user) {
                const chatId = getChatId(user._id, selectedUser._id);
                socket.emit('stopTyping', { chatId });
            }
        };
    }, [socket, selectedUser, user]);

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
                <button type="button" onClick={() => setShowAttachmentMenu(p => !p)} className="message-input-button attachment-button">
                    <Paperclip size={22} />
                </button>
                <button type="button" onClick={() => setShowEmojiPicker(p => !p)} className="message-input-button emoji-button">
                    <Smile size={22} />
                </button>
                <button type="button" onClick={() => setShowVoiceRecorder(true)} className="message-input-button voice-button">
                    <Mic size={22} />
                </button>

                <div className="input-wrapper">
                    <input
                        ref={inputRef}
                        value={message}
                        onChange={handleTyping}
                        placeholder="Type your message..."
                        className="message-input-field"
                        type="text"
                    />
                </div>

                <button type="submit" className="message-input-button send-button" disabled={!message.trim()}>
                    <Send size={20} />
                </button>

                <input type="file" accept="image/*" ref={imageInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
                <input type="file" accept="video/*" ref={videoInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
            </form>
        </div>
    );
};

export default MessageInput;