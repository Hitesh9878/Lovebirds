// src/components/ProfileModal.jsx - FIXED VERSION
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Camera, User } from 'lucide-react';
import './ProfileModal.css';

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    avatar: null
  });
  const [previewUrl, setPreviewUrl] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Helper function to get full avatar URL
  const getFullAvatarUrl = (avatarPath) => {
    if (!avatarPath) return '';
    if (avatarPath.startsWith('http')) return avatarPath;
    return `${window.location.origin}/uploads/${avatarPath}`;
  };

  useEffect(() => {
    // Update form data if user changes
    setFormData({
      name: user?.name || '',
      avatar: null
    });
    setPreviewUrl(getFullAvatarUrl(user?.avatar) || '');
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      setFormData(prev => ({ ...prev, avatar: file }));
      setError('');

      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate name
    if (!formData.name.trim()) {
      setError('Name is required');
      setLoading(false);
      return;
    }
    if (formData.name.trim().length < 2) {
      setError('Name must be at least 2 characters long');
      setLoading(false);
      return;
    }

    try {
      await updateProfile(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Edit Profile</h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="avatar-section">
            <div className="avatar-upload" onClick={triggerFileInput}>
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="avatar-preview" />
              ) : (
                <div className="avatar-placeholder">
                  <User size={40} />
                </div>
              )}
              <div className="avatar-overlay">
                <Camera size={20} />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="file-input"
            />
            <p className="avatar-hint">Click to upload new photo (max 5MB)</p>
          </div>

          <div className="form-group">
            <label htmlFor="name">Display Name</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter your name"
              minLength="2"
              maxLength="50"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;