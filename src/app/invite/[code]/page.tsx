"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Users, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function InvitePage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [householdName, setHouseholdName] = useState("");

  useEffect(() => {
    const acceptInvite = async () => {
      if (!user) {
        setStatus("error");
        setMessage("You must be logged in to accept an invitation");
        return;
      }

      try {
        // First, get the household name from the invitation
        const { data: inviteData } = await supabase
          .from("household_invitations")
          .select("household_id, households(name)")
          .eq("code", params.code)
          .is("used_at", null)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();

        if (inviteData?.households) {
          setHouseholdName((inviteData.households as any).name);
        }

        // Accept the invitation
        const { error } = await supabase.rpc("accept_household_invitation", {
          p_code: params.code,
        });

        if (error) {
          throw error;
        }

        // Refresh profile to get updated household_id
        await refreshProfile();

        setStatus("success");
        setMessage(`You've joined ${householdName || "the household"}!`);

        // Redirect to home after 2 seconds
        setTimeout(() => {
          router.push("/");
        }, 2000);
      } catch (error: any) {
        console.error("Error accepting invitation:", error);
        setStatus("error");

        if (error.message?.includes("already belongs to a household")) {
          setMessage("You already belong to a household. Leave your current household first.");
        } else if (error.message?.includes("Invalid or expired")) {
          setMessage("This invitation link is invalid or has expired");
        } else {
          setMessage(error.message || "Failed to accept invitation");
        }
      }
    };

    void acceptInvite();
  }, [user, params.code, refreshProfile, router, householdName]);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Not Logged In</h1>
          <p className="text-slate-400 mb-6">
            You must be logged in to accept a household invitation
          </p>
          <Link
            href="/login"
            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-500 transition"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-16 h-16 text-indigo-400 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-white mb-2">Processing Invitation</h1>
            <p className="text-slate-400">Please wait...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Welcome!</h1>
            <p className="text-slate-400 mb-6">{message}</p>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Redirecting to home...
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Unable to Join</h1>
            <p className="text-slate-400 mb-6">{message}</p>
            <div className="flex flex-col gap-3">
              <Link
                href="/settings"
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-500 transition"
              >
                Go to Settings
              </Link>
              <Link
                href="/"
                className="bg-slate-800 border border-slate-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-700 transition"
              >
                Go to Home
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
