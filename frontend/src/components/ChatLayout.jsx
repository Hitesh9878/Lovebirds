import React, { useState, useEffect, useContext } from 'react';
import Sidebar from "./Sidebar.jsx"
import ChatWindow from "./ChatWindow.jsx"
import { motion } from "framer-motion"
import { useAuth } from "../contexts/AuthContext.jsx"
import api from "../services/api.js"
import "./ChatLayout.css"

const LovebirdsIcon = () => (
  <svg className="logo-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.7,21.9C9,21.5,5.2,18.8,3,15.1c-1.3-2.2-1.8-4.7-1.6-7.2c0.2-2.5,1.2-4.8,2.9-6.6 C6.1,0,8.6-0.5,11.1,0.3c1.9,0.6,3.5,1.9,4.6,3.6c-0.6-0.3-1.3-0.5-2-0.6c-2.1-0.3-4.2,0.6-5.6,2.3c-1.2,1.5-1.7,3.4-1.4,5.3 c0.3,2,1.7,3.7,3.6,4.5c0.3,0.1,0.6,0.2,0.9,0.3c-0.1,0.2-0.2,0.3-0.2,0.5c-0.6,0.9-0.8,2-0.6,3.1c0.2,1,0.8,1.9,1.6,2.6 C12.3,21.8,12.5,21.8,12.7,21.9z M21.3,12.3c-0.2-2.5-1.2-4.8-2.9-6.6c-1.8-1.8-4.1-2.7-6.5-2.5c-0.6,0-1.2,0.1-1.8,0.3 c1.2-1.9,3.1-3.2,5.3-3.6c2.5-0.5,5,0.1,6.8,1.8c1.8,1.8,2.7,4.1,2.5,6.5c-0.1,1.9-0.9,3.6-2.1,5c-0.8,0.9-1.8,1.6-2.8,2.1 c0.5,0.2,1,0.2,1.5,0.1c2.1-0.3,4-1.6,5.1-3.4C22.2,16.5,22,14.2,21.3,12.3z" />
  </svg>
)

const ChatLayout = () => {
  const [selectedUser, setSelectedUser] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    const fetchUsers = async () => {
      // Only fetch users if user is authenticated
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const response = await api.get("/users")
        // Ensure we have proper user objects with required fields
        const usersWithDefaults = response.data.map((user) => ({
          ...user,
          avatar: user.avatar || null, // Ensure avatar field exists
          name: user.name || "Unknown User",
          email: user.email || "No email",
        }))
        setUsers(usersWithDefaults)
        setError(null)
      } catch (err) {
        console.error("Failed to fetch users:", err)
        setError("Could not load user data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    // Wait for auth to complete before fetching users
    if (!authLoading) {
      fetchUsers()
    }
  }, [user, authLoading])

  // Show loading state while auth is being checked
  if (authLoading) {
    return <div className="loading-state">Checking authentication...</div>
  }

  // Show login prompt if user is not authenticated
  if (!user) {
    return (
      <div className="auth-required">
        <div className="logo-container">
          <LovebirdsIcon />
          <h1 className="logo-title">LOVEBIRDS</h1>
          <p className="logo-tagline">Please log in to continue</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="loading-state">Loading chats...</div>
  }

  if (error) {
    return (
      <div className="error-state">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }

  return (
    <div className="chat-layout-container">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="logo-container"
      >
        <LovebirdsIcon />
        <h1 className="logo-title">LOVEBIRDS</h1>
        <p className="logo-tagline">Connect & Share</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="chat-card"
      >
        <Sidebar users={users} selectedUser={selectedUser} onSelectUser={setSelectedUser} />
        <ChatWindow selectedUser={selectedUser} />
      </motion.div>
    </div>
  )
}

export default ChatLayout
