"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import sound from "../lib/sound";
import styles from "./toast.module.css";

interface ToastMessage {
  id: string;
  icon: string;
  title: string;
  text: string;
  isBonus?: boolean;
}

const CASINO_EVENTS = [
  { icon: "🚀", title: "Crash Victory", text: "@xX_Kaiser_Xx cashed out at 5.80x (+5,800 $)" },
  { icon: "🎡", title: "Roulette Gold Hit", text: "@TrenchSentry14 hit Gold 14x (+4,200 $)" },
  { icon: "🟢", title: "Plinko High Risk", text: "@GeneralFrench scored 42x bucket (+2,100 $)" },
  { icon: "🃏", title: "Blackjack 21", text: "@VerdunVeteran beat the dealer with Natural 21!" },
  { icon: "🎰", title: "Slots Deluxe Jackpot", text: "@DiggerBoy1916 hit 3 Kaiser Helms on 5-Reel!" }
];

export const LiveToastAlerts: React.FC = () => {
  const { user, setIsAuthOpen } = useWallet();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    // Initial welcome toast if guest
    const initialTimer = setTimeout(() => {
      if (!user) {
        setToasts((prev) => [
          ...prev,
          {
            id: "bonus_1",
            icon: "🎁",
            title: "Welcome Bonus",
            text: "Create a free account to claim 1,000 $ starting War Bonds!",
            isBonus: true
          }
        ]);
      }
    }, 2500);

    // Periodic live casino events
    const interval = setInterval(() => {
      const randomEvent = CASINO_EVENTS[Math.floor(Math.random() * CASINO_EVENTS.length)];
      const newToast: ToastMessage = {
        id: "toast_" + Math.random().toString(36).substring(2, 9),
        icon: randomEvent.icon,
        title: randomEvent.title,
        text: randomEvent.text
      };

      setToasts((prev) => [...prev.slice(-2), newToast]);

      // Auto dismiss after 5 seconds
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== newToast.id));
      }, 5000);
    }, 14000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [user]);

  const handleToastClick = (toast: ToastMessage) => {
    if (toast.isBonus && !user) {
      setIsAuthOpen(true);
      sound.playClick();
    }
  };

  return (
    <div className={styles.toastContainer}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${styles.toastItem} ${t.isBonus ? styles.toastGuestBonus : ""}`}
          onClick={() => handleToastClick(t)}
        >
          <span className={styles.toastIcon}>{t.icon}</span>
          <div className={styles.toastContent}>
            <span className={styles.toastTitle}>{t.title}</span>
            <span className={styles.toastText}>{t.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LiveToastAlerts;
