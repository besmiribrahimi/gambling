"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useWallet } from "../context/WalletContext";
import sound from "../lib/sound";
import styles from "./chat.module.css";

interface ChatMessage {
  id: string;
  userId?: string;
  sender: string;
  avatar?: string;
  role?: "admin" | "user";
  isVerified?: boolean;
  vipTier: string;
  vipColor: string;
  text: string;
  isWin?: boolean;
  createdAt: string;
}

export const CommunityChat: React.FC = () => {
  const { user, vipTier, isAdmin } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isFirstLoad = useRef(true);

  // Fetch real chat messages from MongoDB Atlas API
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/chat");
      if (res.ok) {
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      }
    } catch (e) {
      console.warn("Error fetching real chat:", e);
    }
  }, []);

  // Poll for real messages when chat is open
  useEffect(() => {
    fetchMessages();

    const interval = setInterval(() => {
      fetchMessages();
    }, 2500);

    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Auto-scroll on new messages or open
  useEffect(() => {
    if (isOpen) {
      if (isFirstLoad.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        isFirstLoad.current = false;
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages, isOpen]);

  // Send a real message to MongoDB Atlas
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText || isSending) return;

    setIsSending(true);
    setChatError(null);

    const tempId = `temp_${Date.now()}`;
    const myName = user ? user.username : (guestName.trim() || "Guest");
    const myAvatar = user?.preferences?.avatar || (user?.role === "admin" ? "👑" : "⚡");

    // Optimistic message update
    const optimisticMsg: ChatMessage = {
      id: tempId,
      userId: user?.id,
      sender: myName,
      avatar: myAvatar,
      role: user?.role || (isAdmin ? "admin" : "user"),
      isVerified: !!user?.isVerified,
      vipTier: vipTier.name,
      vipColor: vipTier.color,
      text: cleanText,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText("");
    sound.playClick();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanText,
          vipTier: vipTier.name,
          vipColor: vipTier.color,
          guestName: guestName.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to deliver message.");
      }

      // Replace optimistic message with saved DB message
      if (data.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? data.message : m))
        );
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Delivery failed.";
      setChatError(errMsg);
      // Remove failed message
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  // Admin moderation: delete single message
  const handleDeleteMessage = async (messageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch("/api/chat", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId })
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        sound.playClick();
      }
    } catch (e) {}
  };

  return (
    <div className={`${styles.chatDrawer} ${!isOpen ? styles.chatCollapsed : ""}`}>
      {/* Header */}
      <div className={styles.chatHeader} onClick={() => setIsOpen(!isOpen)}>
        <span className={styles.chatTitle}>
          💬 Live Citizen Chat
        </span>
        <span className={styles.chatOnline}>
          <span className={styles.pulseDot} />
          <span>Real-time</span>
        </span>
      </div>

      {isOpen && (
        <>
          <div className={styles.messagesList}>
            {messages.length === 0 ? (
              <div className={styles.emptyChat}>
                <span style={{ fontSize: "1.8rem" }}>💬</span>
                <span style={{ fontWeight: 700, color: "#fff" }}>No chat messages yet</span>
                <span>Be the first citizen to send a message to the community!</span>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={styles.messageItem}>
                  <div className={styles.messageMeta}>
                    <span className={styles.senderAvatar}>{m.avatar || "⚡"}</span>

                    {m.role === "admin" && (
                      <span className={styles.adminBadge}>ADMIN</span>
                    )}

                    <span
                      className={styles.vipBadge}
                      style={{
                        background: `${m.vipColor}20`,
                        color: m.vipColor,
                        border: `1px solid ${m.vipColor}40`
                      }}
                    >
                      {m.vipTier}
                    </span>

                    <span className={styles.senderName}>{m.sender}</span>

                    {m.isVerified && (
                      <span className={styles.verifiedBadge} title="Verified Discord/Roblox Citizen">
                        🛡️
                      </span>
                    )}

                    <span className={styles.messageTime}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>

                    {isAdmin && (
                      <button
                        className={styles.deleteMsgBtn}
                        onClick={(e) => handleDeleteMessage(m.id, e)}
                        title="Delete Message (Overseer Action)"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <span className={styles.messageText}>{m.text}</span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className={styles.chatInputRow} onSubmit={handleSendMessage}>
            {chatError && (
              <span style={{ fontSize: "0.68rem", color: "var(--color-danger)", fontWeight: 700 }}>
                ⚠️ {chatError}
              </span>
            )}

            {!user && (
              <input
                type="text"
                placeholder="Guest Nickname..."
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                maxLength={18}
                style={{
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "4px",
                  padding: "0.25rem 0.5rem",
                  color: "#fff",
                  fontSize: "0.72rem",
                  outline: "none",
                  marginBottom: "0.2rem"
                }}
              />
            )}

            <div className={styles.inputControls}>
              <input
                type="text"
                className={styles.chatInput}
                placeholder={user ? `Message as ${user.username}...` : "Send a message..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={240}
              />
              <button
                type="submit"
                className={styles.sendBtn}
                disabled={isSending || !inputText.trim()}
              >
                {isSending ? "..." : "Send"}
              </button>
            </div>

            <div className={styles.chatFooterStatus}>
              <span>{user ? `Logged in: ${user.username}` : "Guest Mode"}</span>
              <span>{inputText.length}/240</span>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default CommunityChat;
