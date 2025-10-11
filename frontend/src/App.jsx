import React, { useContext } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'; // 👈 Import AuthProvider and useAuth
import { SocketProvider } from './contexts/SocketContext.jsx';
import { VideoCallProvider } from './contexts/VideoCallContext.jsx';
import LoginPage from './components/LoginPage';
import ChatLayout from './components/ChatLayout';

// This is the new inner component that will safely access the context.
const AppContent = () => {
    const { user, loading } = useAuth(); // 👈 CORRECTED: Use the custom hook

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                <p className="text-xl">Loading Application...</p>
            </div>
        );
    }

    return user ? <ChatLayout /> : <LoginPage />;
};


// This is the main App component. Its only job is to provide the context.
function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <VideoCallProvider>
          <div className="dark"> {/* App defaults to dark mode */}
            <AppContent />
          </div>
        </VideoCallProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;