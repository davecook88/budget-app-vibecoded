"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import {
  DateRangePreset,
  formatDateRange,
  getDateRangeBounds,
  getPreviousPeriod,
  getNextPeriod,
} from "@/lib/budgetPeriod";

interface DateRangePickerProps {
  preset: DateRangePreset;
  referenceDate: Date;
  customStart?: Date;
  customEnd?: Date;
  onPresetChange: (preset: DateRangePreset) => void;
  onReferenceDateChange: (date: Date) => void;
  onCustomRangeChange?: (start: Date, end: Date) => void;
}

export function DateRangePicker({
  preset,
  referenceDate,
  customStart,
  customEnd,
  onPresetChange,
  onReferenceDateChange,
  onCustomRangeChange,
}: DateRangePickerProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [tempStart, setTempStart] = useState(
    customStart?.toISOString().split("T")[0] || ""
  );
  const [tempEnd, setTempEnd] = useState(
    customEnd?.toISOString().split("T")[0] || ""
  );

  const { start, end } = getDateRangeBounds(
    preset,
    referenceDate,
    customStart,
    customEnd
  );

  const presets: { value: DateRangePreset; label: string }[] = [
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "year", label: "Year" },
    { value: "custom", label: "Custom" },
  ];

  const handlePrevious = () => {
    if (preset !== "custom") {
      const newDate = getPreviousPeriod(preset, referenceDate);
      onReferenceDateChange(newDate);
    }
  };

  const handleNext = () => {
    if (preset !== "custom") {
      const newDate = getNextPeriod(preset, referenceDate);
      onReferenceDateChange(newDate);
    }
  };

  const handlePresetClick = (newPreset: DateRangePreset) => {
    onPresetChange(newPreset);
    if (newPreset === "custom") {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
    }
  };

  const handleApplyCustom = () => {
    if (tempStart && tempEnd && onCustomRangeChange) {
      const start = new Date(tempStart);
      const end = new Date(tempEnd);
      if (start <= end) {
        onCustomRangeChange(start, end);
        setShowCustomPicker(false);
      }
    }
  };

  const isToday =
    preset !== "custom" &&
    new Date().toDateString() === referenceDate.toDateString();

  return (
    <div className="bg-white border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-4 space-y-3">
      {/* Preset Selector */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {presets.map((p) => (
          <button
            key={p.value}
            onClick={() => handlePresetClick(p.value)}
            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition border-2 border-[#050505] ${
              preset === p.value
                ? "bg-[#FFE66D] text-[#050505]"
                : "bg-white text-[#050505] opacity-60 hover:opacity-100"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom Date Picker */}
      {showCustomPicker && preset === "custom" && (
        <div className="space-y-3 p-3 bg-[#FFFDF5] border-2 border-[#050505] rounded-lg">
          <div className="space-y-2">
            <label className="text-xs text-[#050505] font-mono font-bold uppercase">Start Date</label>
            <input
              type="date"
              value={tempStart}
              onChange={(e) => setTempStart(e.target.value)}
              className="w-full px-3 py-2 bg-white border-2 border-[#050505] rounded-lg text-[#050505] font-mono focus:outline-none focus:ring-2 focus:ring-[#FFE66D]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-[#050505] font-mono font-bold uppercase">End Date</label>
            <input
              type="date"
              value={tempEnd}
              onChange={(e) => setTempEnd(e.target.value)}
              className="w-full px-3 py-2 bg-white border-2 border-[#050505] rounded-lg text-[#050505] font-mono focus:outline-none focus:ring-2 focus:ring-[#FFE66D]"
            />
          </div>
          <button
            onClick={handleApplyCustom}
            disabled={!tempStart || !tempEnd}
            className="w-full px-4 py-2 bg-[#4ECDC4] border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] text-white rounded-lg font-bold active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Range
          </button>
        </div>
      )}

      {/* Date Range Display & Navigation */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={handlePrevious}
          disabled={preset === "custom"}
          className="p-2 rounded-lg bg-white border-2 border-[#050505] hover:bg-[#FFE66D] transition-colors text-[#050505] disabled:opacity-30 disabled:cursor-not-allowed active:translate-x-[2px] active:translate-y-[2px]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 flex-1 justify-center">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-white font-medium text-sm">
            {formatDateRange(start, end)}
          </span>
        </div>

        <button
          onClick={handleNext}
          disabled={preset === "custom" || isToday}
          className="p-2 rounded-lg hover:bg-slate-700 transition text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
