"use client";

import React, { useState, useEffect, useRef } from "react";
import { useWallet } from "../context/WalletContext";
import sound from "../lib/sound";
import styles from "./chat.module.css";

interface ChatMessage {
  id: string;
  sender: string;
  vipTier: string;
  vipColor: string;
  text: string;
  isWin?: boolean;
  time: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: "1", sender: "xX_Kaiser_Xx", vipTier: "Platinum", vipColor: "#00f0ff", text: "DK vs IA match odds are wild tonight!", time: "12:30" },
  { id: "2", sender: "TrenchSentry14", vipTier: "Gold", vipColor: "#ffd700", text: "Just hit 14x on Gold Roulette 🎡🔥", isWin: true, time: "12:32" },
  { id: "3", sender: "GeneralFrench", vipTier: "Diamond", vipColor: "#bd00ff", text: "Plinko 10-ball drop is pure adrenaline", time: "12:34" },
  { id: "4", sender: "DiggerBoy1916", vipTier: "Silver", vipColor: "#c0c0c0", text: "Anyone trying the new Blackjack table?", time: "12:35" }
];

const RANDOM_CHAT_BOTS = [
  { sender: "SultanSlayer", vipTier: "Gold", vipColor: "#ffd700", texts: ["Cashed out Crash at 4.5x!", "GG all", "Who took DK YES?"] },
  { sender: "SniperElite99", vipTier: "Platinum", vipColor: "#00f0ff", texts: ["Daily wheel gave me 500 bonds 🔥", "That 5-reel slot just hit 35x!"] },
  { sender: "VerdunVeteran", vipTier: "Obsidian", vipColor: "#ff007a", texts: ["Rakeback vault stacked up nicely", "Trench Mines auto-pick is clutch!"] }
];

export const CommunityChat: React.FC = () => {
  const { user, vipTier } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Periodic simulated chatter
  useEffect(() => {
    const interval = setInterval(() => {
      const bot = RANDOM_CHAT_BOTS[Math.floor(Math.random() * RANDOM_CHAT_BOTS.length)];
      const text = bot.texts[Math.floor(Math.random() * bot.texts.length)];
      const newMsg: ChatMessage = {
        id: "msg_" + Math.random().toString(36).substring(2, 9),
        sender: bot.sender,
        vipTier: bot.vipTier,
        vipColor: bot.vipColor,
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev.slice(-25), newMsg]);
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const myName = user ? user.username : "Guest Player";
    const newMsg: ChatMessage = {
      id: "msg_" + Math.random().toString(36).substring(2, 9),
      sender: myName,
      vipTier: vipTier.name,
      vipColor: vipTier.color,
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    sound.playClick();
  };

  return (
    <div className={`${styles.chatDrawer} ${!isOpen ? styles.chatCollapsed : ""}`}>
      {/* Header */}
      <div className={styles.chatHeader} onClick={() => setIsOpen(!isOpen)}>
        <span className={styles.chatTitle}>
          💬 Live Trollbox
        </span>
        <span className={styles.chatOnline}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00e676" }} />
          148 Online
        </span>
      </div>

      {isOpen && (
        <>
          <div className={styles.messagesList}>
            {messages.map((m) => (
              <div key={m.id} className={`${styles.messageItem} ${m.isWin ? styles.winAnnouncement : ""}`}>
                <div className={styles.messageMeta}>
                  <span
                    className={styles.vipBadge}
                    style={{ background: `${m.vipColor}25`, color: m.vipColor, border: `1px solid ${m.vipColor}50` }}
                  >
                    {m.vipTier}
                  </span>
                  <span className={styles.senderName}>{m.sender}</span>
                  <span style={{ color: "var(--color-text-muted)", fontSize: "0.65rem", marginLeft: "auto" }}>{m.time}</span>
                </div>
                <span className={styles.messageText}>{m.text}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form className={styles.chatInputRow} onSubmit={handleSendMessage}>
            <input
              type="text"
              className={styles.chatInput}
              placeholder="Send message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              maxLength={120}
            />
            <button type="submit" className={styles.sendBtn}>
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default CommunityChat;
