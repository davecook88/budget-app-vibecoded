"use client";

import { useApp } from "@/contexts/AppContext";
import { Users, User } from "lucide-react";

export function ViewModeToggle() {
  const { viewMode, setViewMode } = useApp();

  return (
    <div className="flex bg-white border-2 border-[#050505] rounded-xl p-1">
      <button
        onClick={() => setViewMode("personal")}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
          ${
            viewMode === "personal"
              ? "bg-[#FFE66D] text-[#050505] border-2 border-[#050505]"
              : "text-[#050505] opacity-60 hover:opacity-100"
          }`}
      >
        <User className="w-4 h-4" />
        <span className="hidden sm:inline">Personal</span>
      </button>
      <button
        onClick={() => setViewMode("household")}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
          ${
            viewMode === "household"
              ? "bg-[#FFE66D] text-[#050505] border-2 border-[#050505]"
              : "text-[#050505] opacity-60 hover:opacity-100"
          }`}
      >
        <Users className="w-4 h-4" />
        <span className="hidden sm:inline">Household</span>
      </button>
    </div>
  );
}
