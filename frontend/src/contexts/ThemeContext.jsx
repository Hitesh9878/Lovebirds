import React, { createContext, useContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check if theme is stored in localStorage
    const stored = localStorage.getItem('app-theme');
    return stored || 'light';
  });

  useEffect(() => {
    // Apply theme to document root
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    
    // Store theme preference
    localStorage.setItem('app-theme', theme);
    
    console.log(`🎨 Theme changed to: ${theme}`);
  }, [theme]);

  const themes = [
    { id: 'light', label: 'Light', icon: '☀️', description: 'Clean and bright' },
    { id: 'dark', label: 'Dark', icon: '🌙', description: 'Easy on the eyes' },
    { id: 'ocean', label: 'Ocean', icon: '🌊', description: 'Cool and calm' },
    { id: 'sunset', label: 'Sunset', icon: '🌅', description: 'Warm and cozy' },
    { id: 'forest', label: 'Forest', icon: '🌲', description: 'Natural and fresh' },
    { id: 'midnight', label: 'Midnight', icon: '✨', description: 'Modern and sleek' },
  ];

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, changeTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
