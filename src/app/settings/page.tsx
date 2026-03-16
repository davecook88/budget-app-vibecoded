"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { BottomNav } from "@/components/BottomNav";
import { ArrowLeft, User, Globe, Database, Trash2, Users, Copy, Check } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { defaultCurrency, setDefaultCurrency, pendingCount } = useApp();
  const [name, setName] = useState(profile?.name || "");
  const [loading, setLoading] = useState(false);
  const [dataStats, setDataStats] = useState({
    transactions: 0,
    wallets: 0,
    budgets: 0,
    trips: 0,
  });
  
  // Household state
  const [householdName, setHouseholdName] = useState("");
  const [household, setHousehold] = useState<{ id: string; name: string } | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
    }
  }, [profile]);

  const loadHousehold = useCallback(async () => {
    if (!profile?.household_id) {
      setHousehold(null);
      setHouseholdMembers([]);
      return;
    }

    // Load household info
    const { data: householdData } = await supabase
      .from("households")
      .select("id, name")
      .eq("id", profile.household_id)
      .maybeSingle();

    if (householdData) {
      setHousehold(householdData);
    }

    // Load household members
    const { data: members } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("household_id", profile.household_id);

    if (members) {
      setHouseholdMembers(members);
    }
  }, [profile?.household_id]);

  useEffect(() => {
    void loadHousehold();
  }, [loadHousehold]);

  const loadDataStats = useCallback(async () => {
    if (!user) return;

    const [transactions, wallets, budgets, trips] = await Promise.all([
      supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("wallets")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id),
      supabase
        .from("budgets")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("trips")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    setDataStats({
      transactions: transactions.count || 0,
      wallets: wallets.count || 0,
      budgets: budgets.count || 0,
      trips: trips.count || 0,
    });
  }, [user]);

  useEffect(() => {
    void loadDataStats();
  }, [loadDataStats]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("users")
        .update({ name })
        .eq("id", user.id);

      if (error) throw error;
      alert("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCurrency = async (currency: "MXN" | "USD") => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("users")
        .update({ default_currency: currency })
        .eq("id", user.id);

      if (error) throw error;
      setDefaultCurrency(currency);
    } catch (error) {
      console.error("Error updating currency:", error);
      alert("Failed to update currency");
    }
  };

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdName.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("create_household", {
        p_name: householdName,
      });

      if (error) throw error;

      alert("Household created successfully!");
      setHouseholdName("");
      await refreshProfile();
      await loadHousehold();
    } catch (error: any) {
      console.error("Error creating household:", error);
      alert(error.message || "Failed to create household");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvite = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("create_household_invitation");

      if (error) throw error;

      if (data && data.length > 0) {
        const code = data[0].code;
        const link = `${window.location.origin}/invite/${code}`;
        setInviteLink(link);
      }
    } catch (error: any) {
      console.error("Error generating invite:", error);
      alert(error.message || "Failed to generate invite");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
    }
  };

  const handleLeaveHousehold = async () => {
    if (
      !confirm(
        "Are you sure you want to leave this household? You will lose access to shared budgets and transactions."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc("leave_household");

      if (error) throw error;

      alert("You have left the household");
      await refreshProfile();
      await loadHousehold();
      setInviteLink("");
    } catch (error: any) {
      console.error("Error leaving household:", error);
      alert(error.message || "Failed to leave household");
    } finally {
      setLoading(false);
    }
  };

  const handleClearLocalData = () => {
    if (
      !confirm(
        "Clear all offline data? This will remove pending transactions that haven't synced yet."
      )
    ) {
      return;
    }

    localStorage.removeItem("pendingTransactions");
    localStorage.removeItem("syncQueue");
    alert("Local data cleared");
    window.location.reload();
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      return;
    }

    const confirmation = prompt('Type "DELETE" to confirm account deletion:');
    if (confirmation !== "DELETE") {
      alert("Account deletion cancelled");
      return;
    }

    try {
      // Delete user data
      await supabase.from("transactions").delete().eq("user_id", user?.id);
      await supabase.from("budgets").delete().eq("user_id", user?.id);
      await supabase.from("trips").delete().eq("user_id", user?.id);
      await supabase.from("wallets").delete().eq("owner_id", user?.id);
      await supabase.from("users").delete().eq("id", user?.id);

      // Sign out
      await signOut();
      alert("Account deleted successfully");
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Failed to delete account");
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pb-24 bg-[#FFFDF5]">
      <header className="sticky top-0 z-40 bg-white border-b-2 border-[#050505] shadow-[0px_4px_0px_0px_#050505]">
        <div className="flex items-center gap-4 p-4">
          <Link href="/" className="text-[#050505] hover:bg-[#FFE66D] p-2 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-[#050505] flex-1" style={{ fontFamily: "var(--font-lexend-mega)" }}>Settings</h1>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Profile Section */}
        <section>
          <h2 className="text-lg font-bold text-[#050505] mb-3 flex items-center gap-2" style={{ fontFamily: "var(--font-lexend-mega)" }}>
            <User className="w-5 h-5" />
            Profile
          </h2>
          <div className="bg-white border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-4">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#050505] mb-2 uppercase tracking-wide font-mono">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border-2 border-[#050505] rounded-xl px-4 py-3 text-[#050505] font-mono focus:outline-none focus:ring-2 focus:ring-[#FFE66D]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#050505] mb-2 uppercase tracking-wide font-mono">
                  Email
                </label>
                <input
                  type="email"
                  value={user.email || ""}
                  disabled
                  className="w-full bg-[#FFFDF5] border-2 border-[#050505] rounded-xl px-4 py-3 text-[#050505] opacity-50 cursor-not-allowed font-mono"
                />
                <p className="text-xs text-[#050505] opacity-60 mt-1 font-mono">
                  Email cannot be changed
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4ECDC4] border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] text-white py-3 rounded-xl font-bold active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Updating..." : "Update Profile"}
              </button>
            </form>
          </div>
        </section>

        {/* Currency Section */}
        <section>
          <h2 className="text-lg font-bold text-[#050505] mb-3 flex items-center gap-2" style={{ fontFamily: "var(--font-lexend-mega)" }}>
            <Globe className="w-5 h-5" />
            Default Currency
          </h2>
          <div className="bg-white border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-4">
            <p className="text-sm text-[#050505] opacity-60 mb-4 font-mono">
              Choose your primary currency for budgets and reporting
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleUpdateCurrency("MXN")}
                className={`py-3 rounded-xl font-bold border-2 border-[#050505] transition-all cursor-pointer ${
                  defaultCurrency === "MXN"
                    ? "bg-[#4ECDC4] text-white shadow-[2px_2px_0px_0px_#050505]"
                    : "bg-white text-[#050505] hover:bg-[#FFFDF5]"
                }`}
              >
                MXN (Mexican Peso)
              </button>
              <button
                onClick={() => handleUpdateCurrency("USD")}
                className={`py-3 rounded-xl font-bold border-2 border-[#050505] transition-all cursor-pointer ${
                  defaultCurrency === "USD"
                    ? "bg-[#4ECDC4] text-white shadow-[2px_2px_0px_0px_#050505]"
                    : "bg-white text-[#050505] hover:bg-[#FFFDF5]"
                }`}
              >
                USD (US Dollar)
              </button>
            </div>
          </div>
        </section>

        {/* Household Section */}
        <section>
          <h2 className="text-lg font-bold text-[#050505] mb-3 flex items-center gap-2" style={{ fontFamily: "var(--font-lexend-mega)" }}>
            <Users className="w-5 h-5" />
            Household
          </h2>
          
          {!household ? (
            // No household - show create form
            <div className="bg-white border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-4">
              <p className="text-sm text-[#050505] opacity-60 mb-4 font-mono">
                Create a household to share budgets and expenses with family members
              </p>
              <form onSubmit={handleCreateHousehold} className="space-y-3">
                <input
                  type="text"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="e.g., Smith Family"
                  className="w-full bg-white border-2 border-[#050505] rounded-xl px-4 py-3 text-[#050505] font-mono focus:outline-none focus:ring-2 focus:ring-[#FFE66D]"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#4ECDC4] border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] text-white py-3 rounded-xl font-bold active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Creating..." : "Create Household"}
                </button>
              </form>
            </div>
          ) : (
            // Has household - show members and invite
            <div className="bg-white border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-4 space-y-4">
              <div>
                <h3 className="font-bold text-[#050505]" style={{ fontFamily: "var(--font-lexend-mega)" }}>{household.name}</h3>
                <p className="text-sm text-[#050505] opacity-60 font-mono">
                  {householdMembers.length} {householdMembers.length === 1 ? "member" : "members"}
                </p>
              </div>

              {/* Members List */}
              <div className="space-y-2">
                <p className="text-sm font-bold text-[#050505] uppercase tracking-wide font-mono">Members</p>
                {householdMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between bg-[#FFFDF5] border-2 border-[#050505] rounded-lg px-3 py-2"
                  >
                    <div>
                      <p className="text-[#050505] text-sm font-bold">{member.name}</p>
                      <p className="text-[#050505] opacity-60 text-xs font-mono">{member.email}</p>
                    </div>
                    {member.id === user?.id && (
                      <span className="text-xs text-white bg-[#4ECDC4] border-2 border-[#050505] px-2 py-1 rounded-lg font-bold">You</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Invite Section */}
              <div className="pt-4 border-t-2 border-[#050505]">
                <p className="text-sm font-bold text-[#050505] mb-3 uppercase tracking-wide font-mono">Invite Someone</p>
                {!inviteLink ? (
                  <button
                    onClick={handleGenerateInvite}
                    disabled={loading}
                    className="w-full bg-[#4ECDC4] border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] text-white py-3 rounded-xl font-bold active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? "Generating..." : "Generate Invite Link"}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-[#FFFDF5] border-2 border-[#050505] rounded-xl p-3 text-sm text-[#050505] font-mono break-all">
                      {inviteLink}
                    </div>
                    <button
                      onClick={handleCopyInvite}
                      className="w-full bg-white border-2 border-[#050505] shadow-[2px_2px_0px_0px_#050505] text-[#050505] py-3 rounded-xl font-bold active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Link
                        </>
                      )}
                    </button>
                    <p className="text-xs text-[#050505] opacity-60 text-center font-mono">
                      Link expires in 7 days and can only be used once
                    </p>
                  </div>
                )}
              </div>

              {/* Leave Household */}
              <div className="pt-4 border-t-2 border-[#050505]">
                <button
                  onClick={handleLeaveHousehold}
                  disabled={loading}
                  className="w-full bg-[#FF6B6B] border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] text-white py-3 rounded-xl font-bold active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 cursor-pointer"
                >
                  Leave Household
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Data & Storage Section */}
        <section>
          <h2 className="text-lg font-bold text-[#050505] mb-3 flex items-center gap-2" style={{ fontFamily: "var(--font-lexend-mega)" }}>
            <Database className="w-5 h-5" />
            Data & Storage
          </h2>
          <div className="bg-white border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#050505] font-mono">Transactions</span>
                <span className="text-[#050505] font-bold font-mono">
                  {dataStats.transactions}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#050505] font-mono">Wallets</span>
                <span className="text-[#050505] font-bold font-mono">
                  {dataStats.wallets}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#050505] font-mono">Budgets</span>
                <span className="text-[#050505] font-bold font-mono">
                  {dataStats.budgets}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#050505] font-mono">Trips</span>
                <span className="text-[#050505] font-bold font-mono">
                  {dataStats.trips}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t-2 border-[#050505]">
                <span className="text-[#050505] font-mono">Pending Sync</span>
                <span
                  className={`font-bold font-mono ${
                    pendingCount > 0 ? "text-[#FFE66D] bg-[#050505] px-2 py-1 rounded-lg" : "text-[#050505]"
                  }`}
                >
                  {pendingCount}
                </span>
              </div>
            </div>

            <button
              onClick={handleClearLocalData}
              className="w-full bg-white border-2 border-[#050505] shadow-[2px_2px_0px_0px_#050505] text-[#050505] py-3 rounded-xl font-bold active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
            >
              Clear Offline Data
            </button>
          </div>
        </section>

        {/* About Section */}
        <section>
          <div className="bg-[#FFE66D] border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-4">
            <h3 className="font-bold text-[#050505] mb-2" style={{ fontFamily: "var(--font-lexend-mega)" }}>About Presupuesto</h3>
            <p className="text-sm text-[#050505] mb-2 font-mono font-bold">Version 1.0.0</p>
            <p className="text-sm text-[#050505] font-mono">
              A personal finance PWA for couples in Mexico with multi-currency
              support, offline-first architecture, and smart budgeting features.
            </p>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h2 className="text-lg font-bold text-[#FF6B6B] mb-3 flex items-center gap-2" style={{ fontFamily: "var(--font-lexend-mega)" }}>
            <Trash2 className="w-5 h-5" />
            Danger Zone
          </h2>
          <div className="bg-[#FF6B6B] border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-xl p-4">
            <h3 className="font-bold text-white mb-2" style={{ fontFamily: "var(--font-lexend-mega)" }}>Delete Account</h3>
            <p className="text-sm text-white mb-4 font-mono">
              This will permanently delete your account and all associated data.
              This action cannot be undone.
            </p>
            <button
              onClick={handleDeleteAccount}
              className="w-full bg-[#050505] border-2 border-white text-white py-3 rounded-xl font-bold hover:bg-white hover:text-[#FF6B6B] transition-all cursor-pointer"
            >
              Delete My Account
            </button>
          </div>
        </section>

        <div className="pt-4">
          <button
            onClick={signOut}
            className="w-full bg-white border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] text-[#050505] py-3 rounded-xl font-bold active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
