import React, { useState, useEffect } from "react";
import chatService from "../../api/chatService";
import socket from "../../utils/socket";

const ChatList = ({
  onSelectConversation,
  activeConversationId,
  currentUser,
  initialChatContext,
}) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    fetchConversations();
  }, []);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket.connected) return;

    // Listen for incoming messages
    socket.on("receive_message", (startMessage) => {
      handleNewMessage(startMessage);
    });

    // Also listen for my own sent messages to update the list order
    socket.on("message-sent", (sentMessage) => {
      handleNewMessage(sentMessage);
    });

    // Listen for user status updates
    socket.on("user-status", ({ userId, status }) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        if (status === "online") {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });
    });

    return () => {
      socket.off("receive_message");
      socket.off("message-sent");
      socket.off("user-status");
    };
  }, [conversations, currentUser]); // Re-bind when conversations change to ensure latest state

  const fetchConversations = async () => {
    try {
      const response = await chatService.getConversations();

      let conversationsData = [];
      if (Array.isArray(response)) {
        conversationsData = response;
      } else if (response?.data?.conversations) {
        conversationsData = response.data.conversations;
      } else if (response?.data && Array.isArray(response.data)) {
        conversationsData = response.data;
      }

      // Check for initial context (e.g. starting a new chat from Details page)
      if (initialChatContext?.owner && currentUser) {
        const ownerId = initialChatContext.owner._id;
        const existingConv = conversationsData.find(
          (c) => c.participant?._id === ownerId,
        );

        if (existingConv) {
          onSelectConversation(existingConv);
        } else {
          // Create a temporary conversation object
          const currentUserId = currentUser.id || currentUser._id;
          const ids = [currentUserId, ownerId].sort();
          const tempRoomId = `${ids[0]}_${ids[1]}`;

          const tempConv = {
            roomId: tempRoomId,
            participant: initialChatContext.owner,
            unreadCount: 0,
            lastMessage: null,
            isTemp: true, // Flag to indicate it's not from DB yet
          };

          // Add to top of list
          conversationsData.unshift(tempConv);
          onSelectConversation(tempConv);
        }
      }

      setConversations(conversationsData);

      // Fetch initial online status for these users
      if (conversationsData.length > 0) {
        const userIds = conversationsData
          .map((c) => c.participant?._id)
          .filter(Boolean);
        if (socket.connected) {
          socket.emit("get-online-status", userIds, (statusMap) => {
            const onlineSet = new Set();
            Object.entries(statusMap).forEach(([id, status]) => {
              if (status === "online") onlineSet.add(id);
            });
            setOnlineUsers(onlineSet);
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch conversations", err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewMessage = (message) => {
    setConversations((prevConversations) => {
      // Find if conversation exists
      const existingConvIndex = prevConversations.findIndex(
        (c) => c.roomId === message.roomId,
      );

      let updatedConversations = [...prevConversations];

      if (existingConvIndex !== -1) {
        // Update existing conversation
        const existingConv = updatedConversations[existingConvIndex];
        const updatedConv = {
          ...existingConv,
          lastMessage: {
            message: message.message,
            timestamp: message.createdAt,
            messageType: message.messageType,
            isFromMe:
              message.from === currentUser?.id ||
              message.from?._id === currentUser?.id,
          },
          // Increment unread if message is not from me and not active
          unreadCount:
            message.from !== currentUser?.id &&
            message.from?._id !== currentUser?.id &&
            activeConversationId !== message.roomId
              ? (existingConv.unreadCount || 0) + 1
              : existingConv.unreadCount,
        };

        // Remove from current position and add to top
        updatedConversations.splice(existingConvIndex, 1);
        updatedConversations.unshift(updatedConv);
      } else {
        // If it's a new conversation, we might need to fetch participant details
        // For now, if we don't have the participant info, we might need to fetch the list again
        // Or construct a temporary one.
        // A simple strategy: fetch conversations again to get full details or just add it if we have data
        // For simplicity/robustness, let's fetch list again if new room
        // Optimally we'd construct it, but we need participant info
        if (message.from && message.from._id) {
          // If we have full sender info (populated)
          const otherUser = isMe(message.from) ? null : message.from;
          // This logic gets tricky if we don't know who "to" is (us) vs "from"
          // But usually receive_message has populated "from".
        }
        // Fallback:
        // console.log("New conversation detected, refreshing list...");
        // fetchConversations(); // Can trigger refresh
        // But let's try to just return prev for now if we can't build it
      }

      return updatedConversations;
    });
  };

  const isMe = (user) => {
    return user === currentUser?.id || user?._id === currentUser?.id;
  };

  if (loading) return <div className="p-4">Loading conversations...</div>;

  return (
    <div className="flex-1 overflow-y-auto">
      {Array.isArray(conversations) &&
        conversations.map((conv) => (
          <div
            key={conv.roomId}
            onClick={() => onSelectConversation(conv)}
            className={`p-4 border-b cursor-pointer hover:bg-gray-100 transition-colors flex items-center gap-3 ${
              activeConversationId === conv.roomId
                ? "bg-blue-50 border-l-4 border-l-blue-500"
                : ""
            }`}
          >
            <div className="relative">
              {conv.participant?.avatar ? (
                <img
                  src={getImageUrl(conv.participant.avatar)}
                  alt={conv.participant.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 text-white flex items-center justify-center font-bold text-lg">
                  {conv.participant?.name?.[0]?.toUpperCase() || "U"}
                </div>
              )}
              {/* Online Status Indicator */}
              {onlineUsers.has(conv.participant?._id) && (
                <span className="absolute bottom-0 right-0 bg-green-500 border-2 border-white w-3.5 h-3.5 rounded-full"></span>
              )}

              {conv.unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                  {conv.unreadCount}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="font-semibold text-gray-900 truncate">
                  {conv.participant?.name || "User"}
                </h3>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                  {conv.lastMessage?.timestamp &&
                    new Date(conv.lastMessage.timestamp).toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                </span>
              </div>
              <p
                className={`text-sm truncate ${conv.unreadCount > 0 ? "font-semibold text-gray-900" : "text-gray-600"}`}
              >
                {conv.lastMessage?.isFromMe && (
                  <span className="text-gray-400 mr-1">You:</span>
                )}
                {conv.lastMessage?.messageType === "image"
                  ? "📷 Sent an image"
                  : conv.lastMessage?.messageType === "audio"
                    ? "🎤 Voice message"
                    : conv.lastMessage?.message || "No messages yet"}
              </p>
            </div>
          </div>
        ))}
      {(!Array.isArray(conversations) || conversations.length === 0) && (
        <div className="p-8 text-center text-gray-500">No active chats</div>
      )}
    </div>
  );
};

export default ChatList;
