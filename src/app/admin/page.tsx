"use client";

import React, { useEffect } from "react";
import { WalletProvider, useWallet } from "../../context/WalletContext";
import AdminModal from "../../components/AdminModal";
import Navbar from "../../components/Navbar";

function AdminPageContent() {
  const { setIsAdminOpen } = useWallet();

  useEffect(() => {
    setIsAdminOpen(true);
  }, [setIsAdminOpen]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <AdminModal isOpen={true} onClose={() => { window.location.href = "/"; }} />
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <WalletProvider>
      <AdminPageContent />
    </WalletProvider>
  );
}
