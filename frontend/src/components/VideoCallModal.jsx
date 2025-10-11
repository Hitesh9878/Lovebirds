import React, { useContext, useState } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { VideoCallContext } from '../contexts/VideoCallContext';

const VideoCallModal = () => {
  const { myVideo, userVideo, callAccepted, callEnded, stream, leaveCall } = useContext(VideoCallContext);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  if (!callAccepted || callEnded) return null;

  const toggleMute = () => {
    stream.getAudioTracks()[0].enabled = isMuted;
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    stream.getVideoTracks()[0].enabled = isVideoOff;
    setIsVideoOff(!isVideoOff);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex flex-col items-center justify-center">
      <video playsInline ref={userVideo} autoPlay className="w-full h-full object-cover" />
      <div className="absolute top-4 right-4 w-1/4 max-w-xs border-2 border-white rounded-lg overflow-hidden">
        <video playsInline muted ref={myVideo} autoPlay className="w-full h-full object-cover" />
      </div>
      <div className="absolute bottom-10 flex items-center space-x-6">
        <button onClick={toggleMute} className={`p-4 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-600'} text-white`}>
          {isMuted ? <MicOff /> : <Mic />}
        </button>
        <button onClick={leaveCall} className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transform scale-110">
          <PhoneOff />
        </button>
        <button onClick={toggleVideo} className={`p-4 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-gray-600'} text-white`}>
          {isVideoOff ? <VideoOff /> : <Video />}
        </button>
      </div>
    </div>
  );
};

export default VideoCallModal;