
// FILE 1: src/models/User.js - COMPLETE USER MODEL
// ============================================================================

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const incognitoChatSchema = new mongoose.Schema({
    chatId: {
        type: String,
        required: true
    },
    enabledAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true
    }
}, { _id: false });

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email'
        ]
    },
    password: {
        type: String,
    },
    avatar: {
        type: String,
        default: ''
    },
    googleId: {
        type: String,
        sparse: true
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    status: {
  type: mongoose.Schema.Types.Mixed,
  default: 'offline',
  set: function(value) {
    if (typeof value === 'boolean') {
      return value ? 'online' : 'offline';
    }
    return value;
  },
  validate: {
    validator: function(value) {
      const allowed = ['online', 'away', 'busy', 'offline'];
      return allowed.includes(value);
    },
    message: props => `${props.value} is not a valid status`
  }
},
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    incognitoChats: [incognitoChatSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ name: 1 });
userSchema.index({ friends: 1 });
userSchema.index({ blockedUsers: 1 });
userSchema.index({ isOnline: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Method to check if user is friend
userSchema.methods.isFriendWith = function(userId) {
    return this.friends.some(friendId => friendId.toString() === userId.toString());
};

// Method to check if user is blocked
userSchema.methods.hasBlocked = function(userId) {
    return this.blockedUsers.some(blockedId => blockedId.toString() === userId.toString());
};

// Method to add friend
userSchema.methods.addFriend = async function(userId) {
    if (!this.isFriendWith(userId)) {
        this.friends.push(userId);
        await this.save();
    }
};

// Method to remove friend
userSchema.methods.removeFriend = async function(userId) {
    this.friends = this.friends.filter(friendId => friendId.toString() !== userId.toString());
    await this.save();
};

// Method to block user
userSchema.methods.blockUser = async function(userId) {
    if (!this.hasBlocked(userId)) {
        this.blockedUsers.push(userId);
        await this.removeFriend(userId);
        await this.save();
    }
};

// Method to unblock user
userSchema.methods.unblockUser = async function(userId) {
    this.blockedUsers = this.blockedUsers.filter(blockedId => blockedId.toString() !== userId.toString());
    await this.save();
};

// Method to enable incognito for a chat
userSchema.methods.enableIncognito = async function(chatId, hours = 3) {
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    
    this.incognitoChats = this.incognitoChats.filter(ic => ic.chatId !== chatId);
    
    this.incognitoChats.push({
        chatId,
        enabledAt: new Date(),
        expiresAt
    });
    
    await this.save();
    return expiresAt;
};

// Method to disable incognito for a chat
userSchema.methods.disableIncognito = async function(chatId) {
    this.incognitoChats = this.incognitoChats.filter(ic => ic.chatId !== chatId);
    await this.save();
};

// Method to check if incognito is enabled for a chat
userSchema.methods.isIncognitoEnabled = function(chatId) {
    const incognitoChat = this.incognitoChats.find(ic => ic.chatId === chatId);
    if (!incognitoChat) return false;
    
    return incognitoChat.expiresAt > new Date();
};

// Clean up expired incognito chats
userSchema.methods.cleanupExpiredIncognito = async function() {
    const now = new Date();
    const originalLength = this.incognitoChats.length;
    
    this.incognitoChats = this.incognitoChats.filter(ic => ic.expiresAt > now);
    
    if (this.incognitoChats.length !== originalLength) {
        await this.save();
    }
};

// Update lastSeen on certain operations
userSchema.pre('findOneAndUpdate', function() {
    this.set({ updatedAt: new Date() });
});

const User = mongoose.model('User', userSchema);

export default User;