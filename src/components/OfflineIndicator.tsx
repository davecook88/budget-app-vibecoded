"use client";

import { useApp } from "@/contexts/AppContext";
import { WifiOff, Cloud, RefreshCw } from "lucide-react";
import { useState } from "react";
import { syncPendingItems } from "@/lib/offline";

export function OfflineIndicator() {
  const { isOnline, pendingCount, refreshPendingCount } = useApp();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    await syncPendingItems();
    refreshPendingCount();
    setSyncing(false);
  };

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={`fixed bottom-32 left-4 right-4 md:left-auto md:right-4 md:w-auto z-40 
      ${
        isOnline ? "bg-[#FFE66D]" : "bg-[#FF6B6B]"
      } text-[#050505] border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-3 flex items-center justify-between gap-3`}
    >
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Cloud className="w-5 h-5" />
        ) : (
          <WifiOff className="w-5 h-5" />
        )}
        <span className="text-sm font-bold font-mono">
          {isOnline
            ? `${pendingCount} pending to sync`
            : "Offline mode - changes saved locally"}
        </span>
      </div>
      {isOnline && pendingCount > 0 && (
        <button
          onClick={handleSync}
          disabled={syncing}
          className="p-2 bg-white border-2 border-[#050505] rounded-lg hover:bg-[#4ECDC4] hover:text-white transition-colors active:translate-x-[2px] active:translate-y-[2px] cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
        </button>
      )}
    </div>
  );
}
