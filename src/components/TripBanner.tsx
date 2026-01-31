"use client";

import { useApp } from "@/contexts/AppContext";
import { MapPin, X, Calendar } from "lucide-react";
import type { Trip } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

interface TripBannerProps {
  trip: Trip;
}

export function TripBanner({ trip }: TripBannerProps) {
  const { setActiveTrip } = useApp();

  const formatDateRange = () => {
    const start = new Date(trip.start_date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    if (trip.end_date) {
      const end = new Date(trip.end_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return `${start} - ${end}`;
    }
    return `From ${start}`;
  };

  return (
    <div className="bg-linear-to-r from-purple-600 to-pink-600 rounded-xl p-4 mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <MapPin className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-white">{trip.name}</p>
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <Calendar className="w-3 h-3" />
            <span>{formatDateRange()}</span>
            {trip.budget_amount && (
              <>
                <span>•</span>
                <span>
                  {formatCurrency(trip.budget_amount, trip.currency || "MXN")}{" "}
                  budget
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={() => setActiveTrip(null)}
        className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
      >
        <X className="w-4 h-4 text-white" />
      </button>
    </div>
  );
}
