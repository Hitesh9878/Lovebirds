import React, { createContext, useState, useRef, useEffect, useContext } from 'react';
import Peer from 'simple-peer';
import { SocketContext } from './SocketContext';
import { useAuth } from './AuthContext.jsx'; // 👈 Import the useAuth hook

export const VideoCallContext = createContext();

export const VideoCallProvider = ({ children }) => {
  const [call, setCall] = useState({});
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [stream, setStream] = useState();
  const [name, setName] = useState('');
  
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  
  const socket = useContext(SocketContext);
  const { user } = useAuth(); // 👈 CORRECTED: Use the custom hook

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        if (myVideo.current) myVideo.current.srcObject = currentStream;
      }).catch(err => console.error("Error accessing media devices.", err));

    if (socket && user) { // Also check if the user object exists
        setName(user.name);
        socket.on('callUser', ({ from, name: callerName, signal }) => {
            setCall({ isReceivingCall: true, from, name: callerName, signal });
        });
        socket.on('callEnded', () => {
            // Ensure leaveCall logic doesn't rely on stale state
            connectionRef.current?.destroy();
            window.location.reload();
        });
    }
    return () => {
        socket?.off('callUser');
        socket?.off('callEnded');
    }
  }, [socket, user]);

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({ initiator: false, trickle: false, stream });
    peer.on('signal', (data) => socket.emit('answerCall', { signal: data, to: call.from }));
    peer.on('stream', (currentStream) => { if(userVideo.current) userVideo.current.srcObject = currentStream; });
    peer.signal(call.signal);
    connectionRef.current = peer;
  };

  const callUser = (idToCall) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on('signal', (data) => socket.emit('callUser', { userToCall: idToCall, signalData: data, from: user._id, name }));
    peer.on('stream', (currentStream) => { if(userVideo.current) userVideo.current.srcObject = currentStream; });
    socket.on('callAccepted', (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });
    connectionRef.current = peer;
    setCall({ ...call, from: user._id });
  };

  const leaveCall = () => {
    setCallEnded(true);
    setCallAccepted(false);
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
    // Notify the other user that the call has ended
    if (call.from || callAccepted) {
        const otherUserId = call.from === user._id ? /* logic to get other user's id */ null : call.from;
        if(otherUserId) socket.emit('callEnded', { to: otherUserId });
    }
    
    setCall({}); // Reset call state
    window.location.reload(); // Reload to reset state and get a new media stream
  };

  return (
    <VideoCallContext.Provider value={{ call, callAccepted, myVideo, userVideo, stream, name, callEnded, callUser, leaveCall, answerCall }}>
      {children}
    </VideoCallContext.Provider>
  );
};