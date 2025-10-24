import React, { useEffect, useState } from 'react';
import './TypingIndicator.css';

const TypingIndicator = ({ userName }) => {
  const emotes = [
    '👤', '🧑‍💻', '🙂', '🤔', '😎', '❤️', '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '🥹',
    '☺️', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝',
    '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁',
    '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶',
    '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
    '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '😵‍💫', '🤐', '🥴', '🤢', '🤮', '🤧', '😷',
    '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖',
    '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'
  ];

  const [currentEmote, setCurrentEmote] = useState(emotes[0]);

  // Cycle through emotes every 700ms
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentEmote(prev => {
        const currentIndex = emotes.indexOf(prev);
        const nextIndex = (currentIndex + 1) % emotes.length;
        return emotes[nextIndex];
      });
    }, 700);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="typing-indicator-float">
      <div className="typing-indicator-popup">
        <div className="typing-avatar-container">
          <div className="human-emote">{currentEmote}</div>
        </div>
        <div className="typing-content">
          <div className="typing-text">
            <span className="typing-name">{userName}</span> is typing
          </div>
          <div className="typing-dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
