import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom"; // Import useLocation
import Navbar from "../../components/layout/Navbar";
import ChatList from "../../components/chat/ChatList";
import ChatBox from "../../components/chat/ChatBox";
import { useAuth } from "../../context/AuthContext";
import { connectSocket, disconnectSocket } from "../../utils/socket";

const ChatPage = () => {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const { user } = useAuth();
  const location = useLocation(); // Hook for location
  const initialChatContext = location.state; // Get passed state

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem("token");
      connectSocket(token);
    }
    return () => {
      disconnectSocket();
    };
  }, [user]);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Navbar />
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 overflow-hidden">
        <div className="flex h-full bg-white rounded-lg shadow-xl border overflow-hidden">
          {/* Sidebar */}
          <div className="w-full md:w-80 border-r flex flex-col bg-gray-50">
            <div className="p-4 border-b bg-white">
              <h1 className="text-xl font-bold text-gray-800">Messages</h1>
            </div>
            <ChatList
              onSelectConversation={setSelectedConversation}
              activeConversationId={selectedConversation?.roomId}
              initialChatContext={initialChatContext} // Pass context
              currentUser={user} // Pass currentUser
            />
          </div>

          {/* Chat Content */}
          <div
            className={`hidden md:flex flex-1 ${selectedConversation ? "flex" : ""}`}
          >
            <ChatBox
              conversation={selectedConversation}
              currentUser={user}
              defaultMessage={initialChatContext?.initialMessage} // Pass optional default message
            />
          </div>

          {/* Mobile Overlay for active chat */}
          {selectedConversation && (
            <div className="fixed inset-0 z-50 md:hidden bg-white flex flex-col">
              <div className="p-4 border-b bg-gray-50 flex items-center">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="mr-4 text-blue-600 font-semibold"
                >
                  ← Back
                </button>
                <h2 className="font-bold">
                  {selectedConversation.participant?.name}
                </h2>
              </div>
              <ChatBox
                conversation={selectedConversation}
                currentUser={user}
                defaultMessage={initialChatContext?.initialMessage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
