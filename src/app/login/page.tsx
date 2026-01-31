"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { signIn, isConfigured } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FFFDF5]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#050505] mb-2" style={{ fontFamily: "var(--font-lexend-mega)" }}>Welcome Back</h1>
          <p className="text-[#050505] opacity-60 font-mono">Sign in to continue tracking</p>
        </div>

        {!isConfigured && (
          <div className="bg-[#FFE66D] border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#050505] shrink-0 mt-0.5" />
            <p className="text-[#050505] text-sm font-bold">
              Supabase not configured. Please add your credentials to .env.local
            </p>
          </div>
        )}

        {error && (
          <div className="bg-[#FF6B6B] border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-white shrink-0 mt-0.5" />
            <p className="text-white text-sm font-bold">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-[#050505] mb-2 uppercase tracking-wide font-mono">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#050505] opacity-40" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-white border-2 border-[#050505] rounded-xl pl-12 pr-4 py-3 
                  text-[#050505] font-mono placeholder:text-[#050505] placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#FFE66D]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#050505] mb-2 uppercase tracking-wide font-mono">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#050505] opacity-40" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white border-2 border-[#050505] rounded-xl pl-12 pr-4 py-3 
                  text-[#050505] font-mono placeholder:text-[#050505] placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#FFE66D]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isConfigured}
            className="w-full bg-[#FF6B6B] border-2 border-[#050505] shadow-[4px_4px_0px_0px_#050505] text-white py-3 rounded-xl font-bold 
              active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-50 
              transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                Sign In
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[#050505] opacity-60 font-mono mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-[#FF6B6B] font-bold hover:text-[#4ECDC4]"
          >
            Sign up
          </Link>
        </p>

        <Link
          href="/"
          className="block text-center text-[#050505] opacity-40 font-mono mt-4 hover:opacity-60"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
