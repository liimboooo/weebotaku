import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import chatService from "../../services/chatService";
import authService from "../../services/authService";
import { getSocket, disconnectSocket } from "../../services/socketManager";
import {
  Plus, Send, X, Hash, Lock, Tv, Users, ArrowLeft,
  MessageCircle, Settings, LogOut, Search, Smile,
} from "lucide-react";
import "./ChatPage.css";

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return new Date(date).toLocaleDateString();
}

const ROOM_TYPES = [
  { key: "all", label: "All" },
  { key: "public", label: "Public", icon: Hash },
  { key: "private", label: "Private", icon: Lock },
  { key: "anime_specific", label: "Anime", icon: Tv },
];

function RoomList({ rooms, activeRoom, onSelectRoom, onCreateRoom, filter, setFilter, search, setSearch }) {
  const filtered = rooms.filter(r => {
    if (filter !== "all" && r.type !== filter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="ch-sidebar">
      <div className="ch-sidebar-head">
        <h2 className="ch-sidebar-title">Chat</h2>
        <button className="ch-new-btn" onClick={onCreateRoom} title="New Room">
          <Plus size={18} />
        </button>
      </div>

      <div className="ch-search-wrap">
        <Search size={14} className="ch-search-icon" />
        <input
          className="ch-search"
          placeholder="Search rooms..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="ch-filters">
        {ROOM_TYPES.map(t => (
          <button
            key={t.key}
            className={`ch-filter ${filter === t.key ? "active" : ""}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="ch-room-list">
        {filtered.length === 0 && (
          <div className="ch-no-rooms">
            <MessageCircle size={24} />
            <p>No rooms found</p>
          </div>
        )}
        {filtered.map(room => (
          <button
            key={room._id}
            className={`ch-room-item ${activeRoom?._id === room._id ? "active" : ""}`}
            onClick={() => onSelectRoom(room)}
          >
            <div className="ch-room-icon">
              {room.type === "private" ? <Lock size={14} /> :
               room.type === "anime_specific" ? <Tv size={14} /> :
               <Hash size={14} />}
            </div>
            <div className="ch-room-info">
              <span className="ch-room-name">{room.name}</span>
              <span className="ch-room-meta">
                {room.members?.length || 0} members · {timeAgo(room.lastMessageAt)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatView({ room, messages, onSendMessage, onLeave, onBack, typingUsers, currentUserId }) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [room?._id]);

  const handleTyping = useCallback(() => {
    const socket = getSocket();
    if (!socket || !room) return;
    socket.emit("typing", room._id);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", room._id);
    }, 2000);
  }, [room]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput("");
    const socket = getSocket();
    if (socket && room) socket.emit("stop_typing", room._id);
  };

  if (!room) {
    return (
      <div className="ch-empty-view">
        <MessageCircle size={48} strokeWidth={1} />
        <h3>Select a room</h3>
        <p>Pick a chat room from the sidebar to start talking</p>
      </div>
    );
  }

  return (
    <div className="ch-chat-view">
      <div className="ch-chat-header">
        <button className="ch-back-btn" onClick={onBack}>
          <ArrowLeft size={18} />
        </button>
        <div className="ch-chat-header-info">
          <h3 className="ch-chat-room-name">
            {room.type === "private" ? <Lock size={13} /> :
             room.type === "anime_specific" ? <Tv size={13} /> :
             <Hash size={13} />}
            {room.name}
          </h3>
          <span className="ch-chat-member-count">
            {room.members?.length || 0} members
          </span>
        </div>
        <div className="ch-chat-header-actions">
          <button className="ch-header-action" onClick={onLeave} title="Leave room">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="ch-messages">
        {messages.length === 0 && (
          <div className="ch-msg-empty">
            <p>No messages yet. Say something!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.user?._id === currentUserId;
          const showAvatar = i === 0 || messages[i - 1]?.user?._id !== msg.user?._id;
          return (
            <div key={msg._id || i} className={`ch-msg ${isOwn ? "ch-msg--own" : ""} ${!showAvatar ? "ch-msg--chain" : ""}`}>
              {!isOwn && showAvatar && (
                <div className="ch-msg-avatar-wrap">
                  {msg.user?.avatar ? (
                    <img src={msg.user.avatar} alt="" className="ch-msg-avatar" />
                  ) : (
                    <div className="ch-msg-avatar ch-msg-avatar--fallback">
                      {(msg.user?.username || "?")[0].toUpperCase()}
                    </div>
                  )}
                </div>
              )}
              <div className="ch-msg-content">
                {showAvatar && !isOwn && (
                  <span className="ch-msg-username">{msg.user?.username || "Unknown"}</span>
                )}
                <div className={`ch-msg-bubble ${isOwn ? "ch-msg-bubble--own" : ""}`}>
                  {msg.body}
                </div>
                {showAvatar && (
                  <span className="ch-msg-time">{timeAgo(msg.createdAt)}</span>
                )}
              </div>
            </div>
          );
        })}
        {typingUsers.length > 0 && (
          <div className="ch-typing">
            {typingUsers.map(u => u.username).join(", ")} typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="ch-input-bar" onSubmit={handleSend}>
        <input
          ref={inputRef}
          className="ch-input"
          placeholder="Type a message..."
          value={input}
          onChange={e => { setInput(e.target.value); handleTyping(); }}
          maxLength={2000}
        />
        <button className="ch-send-btn" type="submit" disabled={!input.trim()}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

function CreateRoomModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("public");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onCreate({ name: name.trim(), description: description.trim(), type });
      onClose();
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="ch-modal-overlay" onClick={onClose}>
      <div className="ch-modal" onClick={e => e.stopPropagation()}>
        <div className="ch-modal-head">
          <h3>Create Room</h3>
          <button className="ch-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form className="ch-modal-body" onSubmit={handleSubmit}>
          <input
            className="ch-modal-input"
            placeholder="Room name"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={100}
            autoFocus
          />
          <textarea
            className="ch-modal-textarea"
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
          />
          <select
            className="ch-modal-select"
            value={type}
            onChange={e => setType(e.target.value)}
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="anime_specific">Anime Specific</option>
          </select>
          <div className="ch-modal-foot">
            <button type="button" className="ch-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="ch-btn-primary" disabled={!name.trim() || loading}>
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const socketRef = useRef(null);
  const currentUser = authService.getUser?.() || JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = currentUser?._id || currentUser?.id;

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;

    socket.on("new_message", (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on("user_joined", ({ user, roomId }) => {
      if (roomId === activeRoom?._id) {
        loadRoomData(roomId);
      }
    });

    socket.on("user_left", ({ user, roomId }) => {
      if (roomId === activeRoom?._id) {
        loadRoomData(roomId);
      }
    });

    socket.on("user_typing", ({ user }) => {
      if (user._id === currentUserId) return;
      setTypingUsers(prev => {
        if (prev.find(u => u._id === user._id)) return prev;
        return [...prev, user];
      });
    });

    socket.on("user_stop_typing", ({ user }) => {
      setTypingUsers(prev => prev.filter(u => u._id !== user._id));
    });

    socket.on("room_members", ({ roomId, members }) => {
      setActiveRoom(prev => {
        if (prev?._id === roomId) return { ...prev, members };
        return prev;
      });
    });

    return () => {
      socket.off("new_message");
      socket.off("user_joined");
      socket.off("user_left");
      socket.off("user_typing");
      socket.off("user_stop_typing");
      socket.off("room_members");
      disconnectSocket();
    };
  }, [activeRoom?._id, currentUserId]);

  const loadRooms = async () => {
    try {
      const res = await chatService.getRooms();
      setRooms(res.data || []);
    } catch (err) {
      console.error("Failed to load rooms", err);
    } finally {
      setLoading(false);
    }
  };

  const loadRoomData = async (roomId) => {
    try {
      const res = await chatService.getRoom(roomId);
      if (res.data) {
        setActiveRoom(res.data.room);
        setMessages(res.data.messages || []);
      }
    } catch (err) {
      console.error("Failed to load room", err);
    }
  };

  const handleSelectRoom = async (room) => {
    const socket = getSocket();
    if (activeRoom && socket) {
      socket.emit("leave_room", activeRoom._id);
    }

    setTypingUsers([]);
    await loadRoomData(room._id);
    setMobileShowChat(true);

    if (socket) {
      socket.emit("join_room", room._id);
    }
  };

  const handleSendMessage = (body) => {
    const socket = getSocket();
    if (socket && activeRoom) {
      socket.emit("send_message", { roomId: activeRoom._id, body });
    }
  };

  const handleCreateRoom = async (data) => {
    const res = await chatService.createRoom(data);
    if (res.data) {
      setRooms(prev => [res.data, ...prev]);
      handleSelectRoom(res.data);
    }
  };

  const handleLeave = async () => {
    if (!activeRoom) return;
    const socket = getSocket();
    if (socket) socket.emit("leave_room", activeRoom._id);
    try {
      await chatService.leaveRoom(activeRoom._id);
    } catch {}
    setActiveRoom(null);
    setMessages([]);
    setMobileShowChat(false);
    loadRooms();
  };

  const handleBack = () => {
    const socket = getSocket();
    if (socket && activeRoom) socket.emit("leave_room", activeRoom._id);
    setActiveRoom(null);
    setMessages([]);
    setMobileShowChat(false);
  };

  if (loading) {
    return (
      <div className="ch-page">
        <div className="ch-layout">
          <div className="ch-sidebar">
            <div className="ch-sidebar-head">
              <h2 className="ch-sidebar-title">Chat</h2>
            </div>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="ch-skeleton-room">
                <div className="ch-skeleton-icon" />
                <div className="ch-skeleton-lines">
                  <div className="ch-skeleton-line ch-skeleton-line--med" />
                  <div className="ch-skeleton-line ch-skeleton-line--short" />
                </div>
              </div>
            ))}
          </div>
          <div className="ch-empty-view">
            <MessageCircle size={48} strokeWidth={1} />
            <h3>Loading...</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ch-page">
      <div className={`ch-layout ${mobileShowChat ? "ch-layout--chat-open" : ""}`}>
        <RoomList
          rooms={rooms}
          activeRoom={activeRoom}
          onSelectRoom={handleSelectRoom}
          onCreateRoom={() => setShowCreate(true)}
          filter={filter}
          setFilter={setFilter}
          search={search}
          setSearch={setSearch}
        />
        <ChatView
          room={activeRoom}
          messages={messages}
          onSendMessage={handleSendMessage}
          onLeave={handleLeave}
          onBack={handleBack}
          typingUsers={typingUsers}
          currentUserId={currentUserId}
        />
      </div>

      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateRoom}
        />
      )}
    </div>
  );
}
