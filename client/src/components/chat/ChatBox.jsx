import React, { useState, useEffect, useRef } from "react";
import socket from "../../utils/socket";
import chatService from "../../api/chatService";
import {
  Send,
  Mic,
  Image as ImageIcon,
  Paperclip,
  X,
  StopCircle,
} from "lucide-react";
import { getImageUrl } from "../../utils/imageUtils";

const ChatBox = ({ conversation, currentUser, defaultMessage }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (defaultMessage && conversation?.isTemp) {
      setNewMessage(defaultMessage);
    }
  }, [defaultMessage, conversation]);

  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);

  useEffect(() => {
    if (conversation) {
      fetchHistory();

      // Check initial status
      const participantId = conversation.participant?._id;
      if (participantId && socket.connected) {
        socket.emit("get-online-status", [participantId], (statusMap) => {
          if (statusMap[participantId] === "online") {
            setIsOnline(true);
          } else {
            setIsOnline(false);
          }
        });
      }

      // Join room - use roomId
      socket.emit("join_room", conversation.roomId);

      // Debug listeners
      socket.on("connect", () => console.log("Socket connected:", socket.id));
      socket.on("disconnect", () => console.log("Socket disconnected"));
      socket.on("connect_error", (err) =>
        console.error("Socket connection error:", err),
      );

      // Listen for messages
      socket.on("receive_message", (message) => {
        if (message.roomId === conversation.roomId) {
          setMessages((prev) => [...prev, message]);
        }
      });

      // Listen for user status updates
      socket.on("user-status", ({ userId, status, lastSeen }) => {
        if (userId === conversation.participant?._id) {
          setIsOnline(status === "online");
          if (lastSeen) setLastSeen(lastSeen);
        }
      });

      // Listen for your own sent messages (confirmation)
      // Listen for your own sent messages (confirmation)
      socket.on("message-sent", (message) => {
        console.log("Message sent confirmation received:", message);
        if (message.roomId === conversation.roomId) {
          setMessages((prev) => {
            // Check if we already have this specific message ID (avoid duplicates)
            const exists = prev.some((m) => m._id === message._id);
            if (exists) return prev;

            // Check if we have a matching optimistic message (by tempId)
            let optimisticIndex = -1;

            if (message.tempId) {
              optimisticIndex = prev.findIndex((m) => m._id === message.tempId);
            } else {
              // Fallback to content matching for older messages or if tempId missing
              optimisticIndex = prev.findIndex(
                (m) => m.status === "sending" && m.message === message.message,
              );
            }

            if (optimisticIndex !== -1) {
              // Replace optimistic message with real one
              const newMessages = [...prev];
              newMessages[optimisticIndex] = message;
              return newMessages;
            }

            return [...prev, message];
          });
        }
      });

      return () => {
        socket.emit("leave_room", conversation.roomId);
        socket.off("receive_message");
        socket.off("message-sent");
        socket.off("user-status");
      };
    }
  }, [conversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await chatService.getChatHistory(conversation.roomId);
      let messagesData = [];

      if (Array.isArray(response)) {
        messagesData = response;
      } else if (
        response?.data?.messages &&
        Array.isArray(response.data.messages)
      ) {
        messagesData = response.data.messages;
      } else if (response?.data && Array.isArray(response.data)) {
        messagesData = response.data;
      }

      setMessages(messagesData);
    } catch (err) {
      console.error("Failed to fetch history", err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e && e.preventDefault();
    if (!newMessage.trim()) return;

    // DEBUG: Check socket connection
    console.log(
      "Attempting to send message. Socket connected:",
      socket.connected,
    );
    if (!socket.connected) {
      console.warn("Socket not connected! Attempting to connect...");
      socket.connect();
    }

    const tempId = Date.now().toString(); // Temporary ID for optimistic update
    const messageContent = newMessage;

    // Create optimistic message object
    const optimisticMessage = {
      _id: tempId,
      conversationId: conversation._id,
      from: currentUser.id || currentUser._id,
      to: conversation.participant?._id,
      message: messageContent,
      roomId: conversation.roomId,
      messageType: "text",
      createdAt: new Date().toISOString(),
      read: false,
      status: "sending", // Custom status for UI feedback
    };

    // Optimistically update UI
    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");

    const messageData = {
      to: conversation.participant?._id,
      message: messageContent,
      roomId: conversation.roomId,
      messageType: "text",
      tempId: tempId, // Send tempId to track confirmation if needed
    };

    try {
      // Emit via socket
      socket.emit("send-message", messageData);
    } catch (err) {
      console.error("Failed to send message", err);
      // Revert optimistic update on error
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      alert("Failed to send message. Please check your connection.");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset input immediately
    if (fileInputRef.current) fileInputRef.current.value = "";

    const tempId = Date.now().toString();
    const localUrl = URL.createObjectURL(file);
    const messageType = file.type.startsWith("image/") ? "image" : "file";
    const messageText =
      messageType === "image" ? "Sent an image" : "Sent a file";

    // Optimistic Message
    const optimisticMessage = {
      _id: tempId,
      conversationId: conversation._id,
      from: currentUser.id || currentUser._id,
      to: conversation.participant?._id,
      message: messageText,
      roomId: conversation.roomId,
      messageType: messageType,
      createdAt: new Date().toISOString(),
      read: false,
      status: "sending",
      attachment: {
        url: localUrl,
        fileName: file.name,
        mimeType: file.type,
      },
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      setUploading(true);
      const result = await chatService.uploadFile(file);
      const fileUrl = result.data ? result.data[0] : null;

      if (fileUrl) {
        socket.emit("send-message", {
          to: conversation.participant?._id,
          message: messageText,
          roomId: conversation.roomId,
          messageType: messageType,
          tempId: tempId,
          attachment: {
            url: fileUrl,
            fileName: file.name,
            mimeType: file.type,
          },
        });
      }
    } catch (err) {
      console.error("Upload failed", err);
      // Remove optimistic message
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        await sendVoiceMessage(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone", err);
      alert("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = async (audioBlob) => {
    const tempId = Date.now().toString();
    const localUrl = URL.createObjectURL(audioBlob);

    // Optimistic Message
    const optimisticMessage = {
      _id: tempId,
      conversationId: conversation._id,
      from: currentUser.id || currentUser._id,
      to: conversation.participant?._id,
      message: "Voice message",
      roomId: conversation.roomId,
      messageType: "audio",
      createdAt: new Date().toISOString(),
      read: false,
      status: "sending",
      attachment: {
        url: localUrl,
        fileName: "voice-message.webm",
        mimeType: "audio/webm",
      },
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      setUploading(true);
      const file = new File([audioBlob], "voice-message.webm", {
        type: "audio/webm",
      });
      const result = await chatService.uploadFile(file);
      const fileUrl = result.data ? result.data[0] : null;

      if (fileUrl) {
        socket.emit("send-message", {
          to: conversation.participant?._id,
          message: "Voice message",
          roomId: conversation.roomId,
          messageType: "audio",
          tempId: tempId,
          attachment: {
            url: fileUrl,
            fileName: "voice-message.webm",
            mimeType: "audio/webm",
          },
        });
      }
    } catch (err) {
      console.error("Failed to send voice message", err);
      // Remove optimistic message
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      alert("Failed to send voice message");
    } finally {
      setUploading(false);
    }
  };

  const renderMessageContent = (msg) => {
    switch (msg.messageType) {
      case "image":
        return (
          <div className="mt-1">
            <img
              src={getImageUrl(msg.attachment?.url)}
              alt="Shared sent"
              className="max-w-[200px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() =>
                window.open(getImageUrl(msg.attachment?.url), "_blank")
              }
            />
            {msg.message !== "Sent an image" && (
              <p className="mt-1">{msg.message}</p>
            )}
          </div>
        );
      case "audio":
        return (
          <div className="mt-1 min-w-[200px]">
            <audio controls className="w-full h-8">
              <source
                src={getImageUrl(msg.attachment?.url)}
                type={msg.attachment?.mimeType || "audio/webm"}
              />
              Your browser does not support the audio element.
            </audio>
          </div>
        );
      default:
        return <p className="text-sm">{msg.message}</p>;
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
          <ImageIcon className="w-10 h-10 text-gray-400" />
        </div>
        <p className="text-lg">Select a conversation to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white shadow-lg rounded-r-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-white flex items-center shadow-sm z-10">
        <div className="relative">
          {conversation.participant?.avatar ? (
            <img
              src={getImageUrl(conversation.participant.avatar)}
              alt={conversation.participant.name}
              className="w-10 h-10 rounded-full object-cover mr-3"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold mr-3 shadow-md">
              {conversation.participant?.name?.[0]?.toUpperCase() || "U"}
            </div>
          )}
          {isOnline && (
            <span className="absolute bottom-0 right-3 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
          )}
        </div>
        <div>
          <h2 className="font-bold text-gray-800 text-lg">
            {conversation.participant?.name || "User"}
          </h2>
          <p
            className={`text-xs font-medium flex items-center ${isOnline ? "text-green-600" : "text-gray-400"}`}
          >
            {isOnline ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const senderId = msg.from?._id || msg.from;
            const isMe =
              senderId === currentUser?.id || senderId === currentUser?._id;

            return (
              <div
                key={msg._id || idx}
                className={`flex ${isMe ? "justify-end" : "justify-start"} group animate-in fade-in duration-300 slide-in-from-bottom-2`}
              >
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 mr-2 flex items-center justify-center overflow-hidden">
                    {msg.from?.avatar ? (
                      <img
                        src={getImageUrl(msg.from.avatar)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-gray-600">
                        {msg.from?.name?.[0] || "?"}
                      </span>
                    )}
                  </div>
                )}

                <div
                  className={`max-w-[75%] px-4 py-3 rounded-2xl shadow-sm ${
                    isMe
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                  }`}
                >
                  {renderMessageContent(msg)}
                  <div
                    className={`flex items-center justify-end mt-1 gap-1 ${isMe ? "text-blue-100" : "text-gray-400"}`}
                  >
                    <span className="text-[10px]">
                      {new Date(msg.createdAt || Date.now()).toLocaleTimeString(
                        [],
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </span>
                    {isMe && (
                      <span className="text-[10px] ml-1">
                        {msg.read ? "✓✓" : "✓"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white">
        {uploading && (
          <div className="mb-2 text-xs text-blue-600 animate-pulse flex items-center">
            <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
            Uploading media...
          </div>
        )}
        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 bg-gray-100 p-2 rounded-full border border-gray-200 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,audio/*"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
            title="Attach file"
          >
            <ImageIcon size={20} />
          </button>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-transparent border-none focus:outline-none px-2 text-gray-700 placeholder-gray-400"
            disabled={isRecording}
          />

          {isRecording ? (
            <div className="flex items-center gap-2 pr-2">
              <span className="text-red-500 text-sm animate-pulse font-medium">
                Recording...
              </span>
              <button
                type="button"
                onClick={stopRecording}
                className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
              >
                <StopCircle size={20} />
              </button>
            </div>
          ) : (
            <>
              {newMessage.trim() ? (
                <button
                  type="submit"
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-md transform hover:scale-105"
                >
                  <Send size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  title="Record voice message"
                >
                  <Mic size={20} />
                </button>
              )}
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChatBox;
