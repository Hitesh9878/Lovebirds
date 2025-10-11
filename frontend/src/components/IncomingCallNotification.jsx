import React, { useContext } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { VideoCallContext } from '../contexts/VideoCallContext';

const IncomingCallNotification = () => {
  const { call, answerCall, leaveCall } = useContext(VideoCallContext);

  if (!call.isReceivingCall) return null;

  return (
    <div className="fixed top-5 right-5 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50 flex items-center space-x-4 animate-pulse">
      <img src='https://i.pravatar.cc/150' alt={call.name} className="w-12 h-12 rounded-full" />
      <div>
        <p className="font-semibold">{call.name} is calling...</p>
      </div>
      <div className="flex space-x-2">
        <button onClick={answerCall} className="p-3 bg-green-500 hover:bg-green-600 rounded-full">
          <Phone size={20} />
        </button>
         <button onClick={leaveCall} className="p-3 bg-red-500 hover:bg-red-600 rounded-full">
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
};

export default IncomingCallNotification;