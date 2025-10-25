// src/contexts/AuthContext.jsx - FIXED VERSION
import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔍 AuthContext: Checking stored auth data...');
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    console.log('🔍 AuthContext: Token exists:', !!token);
    console.log('🔍 AuthContext: User data exists:', !!userData);
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        console.log('✅ AuthContext: Loaded user from storage:', parsedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error('❌ AuthContext: Error parsing user data:', e);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } else {
      console.log('⚠️ AuthContext: No valid auth data found');
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    console.log('🔑 AuthContext: Login called with:', { userData: userData?.name, token: !!token });
    
    if (!userData || !token) {
      console.error('❌ AuthContext: Invalid login data provided');
      return;
    }
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    
    console.log('✅ AuthContext: User logged in successfully:', userData.name);
  };

  const logout = () => {
    console.log('🚪 AuthContext: Logging out user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('name', profileData.name);
      if (profileData.avatar) {
        formData.append('avatar', profileData.avatar);
      }

      console.log('🔄 AuthContext: Updating profile with:', {
        name: profileData.name,
        hasAvatar: !!profileData.avatar
      });

      // ✅ FIXED: Correct API endpoint URL
      const response = await fetch('https://lovebirds-mwyz.onrender.com/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData - let browser set it with boundary
        },
        body: formData,
      });

      console.log('📡 AuthContext: Profile update response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Failed to update profile';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('❌ AuthContext: Profile update error:', errorData);
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
          console.error('❌ AuthContext: Profile update error (no JSON):', e);
        }
        throw new Error(errorMessage);
      }

      const updatedUser = await response.json();
      console.log('✅ AuthContext: Profile updated successfully:', updatedUser);

      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return updatedUser;
    } catch (error) {
      console.error('❌ AuthContext: Profile update error:', error);
      throw error;
    }
  };

  const value = {
    user,
    login,
    logout,
    updateProfile,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
