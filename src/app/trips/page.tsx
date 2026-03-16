"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { BottomNav } from "@/components/BottomNav";
import {
  ArrowLeft,
  Plus,
  Plane,
  MapPin,
  Calendar,
  Play,
  Square,
} from "lucide-react";
import Link from "next/link";
import type { Trip } from "@/lib/types";

export default function TripsPage() {
  const { user } = useAuth();
  const { activeTrip, setActiveTrip, defaultCurrency } = useApp();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    budget: "",
    budget_currency: defaultCurrency,
  });
  const [loading, setLoading] = useState(false);
  const [tripSpending, setTripSpending] = useState<Record<string, number>>({});

  const loadTrips = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from("trips")
      .select("*")
      .order("start_date", { ascending: false });

    if (data) {
      setTrips(data);

      // Load spending for each trip
      const spending: Record<string, number> = {};
      for (const trip of data) {
        const { data: transactions } = await supabase
          .from("transactions")
          .select("amount, original_currency, exchange_rate_used")
          .eq("trip_id", trip.id)
          .eq("type", "expense");

        const total = (transactions || []).reduce((sum, t) => {
          const amount =
            t.original_currency === trip.budget_currency
              ? t.amount
              : t.amount * (t.exchange_rate_used || 1);
          return sum + amount;
        }, 0);

        spending[trip.id] = total;
      }
      setTripSpending(spending);
    }
  }, [user]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const tripData = {
        name: formData.name,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        budget_currency: formData.budget_currency,
        user_id: user.id,
      };

      if (editingTrip) {
        const { error } = await supabase
          .from("trips")
          .update(tripData)
          .eq("id", editingTrip.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("trips").insert([tripData]);

        if (error) throw error;
      }

      await loadTrips();
      setShowModal(false);
      setEditingTrip(null);
      setFormData({
        name: "",
        start_date: "",
        end_date: "",
        budget: "",
        budget_currency: defaultCurrency,
      });
    } catch (error) {
      console.error("Error saving trip:", error);
      alert("Failed to save trip");
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (trip: Trip) => {
    try {
      // Deactivate all trips first
      await supabase
        .from("trips")
        .update({ is_active: false })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      // Activate selected trip
      const { error } = await supabase
        .from("trips")
        .update({ is_active: true })
        .eq("id", trip.id);

      if (error) throw error;

      setActiveTrip(trip);
      await loadTrips();
    } catch (error) {
      console.error("Error activating trip:", error);
      alert("Failed to activate trip");
    }
  };

  const handleDeactivate = async () => {
    try {
      await supabase
        .from("trips")
        .update({ is_active: false })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      setActiveTrip(null);
      await loadTrips();
    } catch (error) {
      console.error("Error deactivating trip:", error);
      alert("Failed to deactivate trip");
    }
  };

  const handleEdit = (trip: Trip) => {
    setEditingTrip(trip);
    setFormData({
      name: trip.name,
      start_date: trip.start_date,
      end_date: trip.end_date || "",
      budget: trip.budget_amount?.toString() || "",
      budget_currency: trip.currency || defaultCurrency,
    });
    setShowModal(true);
  };

  const handleDelete = async (tripId: string) => {
    if (
      !confirm(
        "Delete this trip? Transactions will not be deleted, but will no longer be associated with this trip."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.from("trips").delete().eq("id", tripId);

      if (error) throw error;
      if (activeTrip?.id === tripId) {
        setActiveTrip(null);
      }
      await loadTrips();
    } catch (error) {
      console.error("Error deleting trip:", error);
      alert("Failed to delete trip");
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="flex items-center gap-4 p-4">
          <Link href="/" className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-white flex-1">Trips</h1>
          <button
            onClick={() => {
              setEditingTrip(null);
              setFormData({
                name: "",
                start_date: new Date().toISOString().split("T")[0],
                end_date: "",
                budget: "",
                budget_currency: defaultCurrency,
              });
              setShowModal(true);
            }}
            className="p-2 text-indigo-400 hover:text-indigo-300 cursor-pointer"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {activeTrip && (
          <div className="bg-linear-to-r from-indigo-600 to-purple-600 rounded-xl p-4 border border-indigo-500">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-white" />
                <span className="text-white font-semibold">Active Trip</span>
              </div>
              <button
                onClick={handleDeactivate}
                className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition cursor-pointer"
              >
                <Square className="w-4 h-4 text-white" />
              </button>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">
              {activeTrip.name}
            </h3>
            <p className="text-indigo-100 text-sm">
              {formatDate(activeTrip.start_date)}
              {activeTrip.end_date && ` - ${formatDate(activeTrip.end_date)}`}
            </p>
            {activeTrip.budget_amount && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <div className="flex items-center justify-between">
                  <span className="text-indigo-100 text-sm">Budget</span>
                  <span className="text-white font-semibold">
                    {formatCurrency(
                      activeTrip.budget_amount,
                      activeTrip.currency || "MXN"
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-indigo-100 text-sm">Spent</span>
                  <span className="text-white font-semibold">
                    {formatCurrency(
                      tripSpending[activeTrip.id] || 0,
                      activeTrip.currency || "MXN"
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {trips.length === 0 ? (
          <div className="text-center py-12">
            <Plane className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">No trips yet</p>
            <p className="text-sm text-slate-500 mb-6">
              Create trips to track travel expenses separately
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-500 transition cursor-pointer"
            >
              Plan Your First Trip
            </button>
          </div>
        ) : (
          <>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                About Trip Mode
              </h3>
              <p className="text-sm text-slate-400">
                When a trip is active, your dashboard will only show
                transactions tagged to that trip. This helps you track travel
                spending separately from your regular expenses.
              </p>
            </div>

            <div className="space-y-3">
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className="bg-slate-800 border border-slate-700 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">
                        {trip.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {formatDate(trip.start_date)}
                          {trip.end_date && ` - ${formatDate(trip.end_date)}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleActivate(trip)}
                        className="p-2 text-indigo-400 hover:text-indigo-300 cursor-pointer"
                        title="Activate trip"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(trip)}
                        className="px-3 py-1 text-xs bg-slate-900 text-slate-300 rounded-lg hover:text-white cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(trip.id)}
                        className="px-3 py-1 text-xs bg-slate-900 text-red-400 rounded-lg hover:text-red-300 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {trip.budget_amount && (
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-400">Budget</span>
                        <span className="text-white">
                          {formatCurrency(
                            trip.budget_amount,
                            trip.currency || "MXN"
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Spent</span>
                        <span
                          className={
                            tripSpending[trip.id] > trip.budget_amount
                              ? "text-red-400"
                              : "text-white"
                          }
                        >
                          {formatCurrency(
                            tripSpending[trip.id] || 0,
                            trip.currency || "MXN"
                          )}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            tripSpending[trip.id] > trip.budget_amount
                              ? "bg-red-500"
                              : "bg-indigo-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              (tripSpending[trip.id] / trip.budget_amount) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md p-6 border border-slate-700 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-6">
              {editingTrip ? "Edit Trip" : "New Trip"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Trip Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Tokyo 2024, Beach Weekend"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Budget (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) =>
                    setFormData({ ...formData, budget: e.target.value })
                  }
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Budget Currency
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, budget_currency: "MXN" })
                    }
                    className={`py-3 rounded-xl font-semibold transition cursor-pointer ${
                      formData.budget_currency === "MXN"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-900 text-slate-400 border border-slate-700"
                    }`}
                  >
                    MXN
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, budget_currency: "USD" })
                    }
                    className={`py-3 rounded-xl font-semibold transition cursor-pointer ${
                      formData.budget_currency === "USD"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-900 text-slate-400 border border-slate-700"
                    }`}
                  >
                    USD
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTrip(null);
                  }}
                  className="flex-1 bg-slate-900 border border-slate-700 text-white py-3 rounded-xl font-semibold hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-500 transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Saving..." : editingTrip ? "Update" : "Create"}}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
