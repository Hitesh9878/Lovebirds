// src/models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  googleId: { 
    type: String, 
    unique: true, 
    sparse: true
  },
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  avatar: { 
    type: String 
  },
  password: { 
    type: String 
  },
  isOnline: { 
    type: Boolean, 
    default: false 
  },
  lastSeen: { 
    type: Date, 
    default: Date.now 
  },
  // NEW: Add this field to track the start of the current session
  sessionStartedAt: {
    type: Date
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;