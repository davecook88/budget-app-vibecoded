"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { initializeAppAsync } from "@/lib/init";
import type { User, Wallet, Category } from "@/lib/types";

interface AuthContextType {
  user: SupabaseUser | null;
  profile: User | null;
  wallets: Wallet[];
  categories: Category[];
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshWallets: () => Promise<void>;
  refreshCategories: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();

  const refreshProfile = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.warn("Could not load user profile:", error.message);
      return;
    }

    if (data) {
      setProfile(data as User);
    } else {
      // Profile doesn't exist - try to create it using the ensure_user_profile function
      console.log(
        "Profile not found, attempting to create via ensure_user_profile..."
      );
      try {
        const { error: rpcError } = await supabase.rpc("ensure_user_profile");
        if (rpcError) {
          console.warn("Could not create user profile:", rpcError.message);
          return;
        }

        // Fetch the newly created profile
        const { data: newProfile } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (newProfile) {
          console.log("User profile created successfully");
          setProfile(newProfile as User);
        }
      } catch (err) {
        console.error("Error creating user profile:", err);
      }
    }
  }, [user]);

  // Create default wallets for a user
  const createDefaultWallets = useCallback(async (userId: string) => {
    try {
      // First check if wallets already exist to avoid 409 conflict
      const { data: existing } = await supabase
        .from("wallets")
        .select("id")
        .eq("owner_id", userId);

      // If wallets already exist, don't create new ones
      if (existing && existing.length > 0) {
        console.log("Wallets already exist, skipping creation");
        return;
      }

      console.log(
        "No wallets found, attempting to create via ensure_user_profile..."
      );

      // Use the database function which handles profile and wallet creation atomically
      const { error: rpcError } = await supabase.rpc("ensure_user_profile");
      if (rpcError) {
        console.warn(
          "Could not create user profile/wallets via RPC:",
          rpcError.message
        );
        // Fall back to manual wallet creation
        // Ensure user profile exists first
        const { data: userProfile } = await supabase
          .from("users")
          .select("id")
          .eq("id", userId)
          .maybeSingle();

        if (!userProfile) {
          console.log(
            "User profile not found, waiting 2 seconds for trigger..."
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));

          const { data: retryProfile } = await supabase
            .from("users")
            .select("id")
            .eq("id", userId)
            .maybeSingle();

          if (!retryProfile) {
            console.error(
              "User profile still not found after retry, cannot create wallets"
            );
            return;
          }
        }

        const { data: manualData, error: manualError } = await supabase
          .from("wallets")
          .insert([
            {
              name: "Efectivo MXN",
              currency: "MXN",
              initial_balance: 0,
              owner_id: userId,
              is_shared: false,
            },
            {
              name: "Cash USD",
              currency: "USD",
              initial_balance: 0,
              owner_id: userId,
              is_shared: false,
            },
          ])
          .select();

        if (manualError) {
          console.error(
            "Error creating default wallets manually:",
            manualError
          );
        } else if (manualData) {
          console.log(
            "Successfully created default wallets manually:",
            manualData
          );
          setWallets(manualData as Wallet[]);
        }
        return;
      }

      // Refresh wallets after RPC call
      const { data } = await supabase
        .from("wallets")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        console.log(
          "Successfully created wallets via ensure_user_profile:",
          data
        );
        setWallets(data as Wallet[]);
      }
    } catch (err) {
      console.error("Exception creating default wallets:", err);
    }
  }, []);

  const refreshWallets = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from("wallets")
      .select("*")
      .order("created_at", { ascending: true });

    if (data) {
      setWallets(data as Wallet[]);

      // If no wallets exist, create default ones
      if (data.length === 0) {
        await createDefaultWallets(user.id);
      }
    }
  }, [user, createDefaultWallets]);

  const refreshCategories = useCallback(async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (data) {
      // Deduplicate categories by name and type (keep the first one)
      const seen = new Map<string, Category>();
      const uniqueCategories = (data as Category[]).filter((cat) => {
        const key = `${cat.name}-${cat.type}`;
        if (seen.has(key)) {
          return false;
        }
        seen.set(key, cat);
        return true;
      });
      setCategories(uniqueCategories);
    }
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (!session?.user) {
        setProfile(null);
        setWallets([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [isConfigured]);

  // Load profile and related data when user changes
  useEffect(() => {
    const loadData = async () => {
      if (user) {
        await refreshProfile();
        await refreshWallets();
        await refreshCategories();
        // Initialize app (refresh exchange rates, etc.)
        await initializeAppAsync();
      }
    };
    loadData();
  }, [user, refreshProfile, refreshWallets, refreshCategories]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    // Pass name in metadata so the trigger can use it
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          default_currency: "MXN",
        },
      },
    });

    if (error) return { error };

    // The database trigger will automatically create the user profile and wallets
    // No need to manually insert - just wait for the trigger to complete
    if (data.user) {
      // Give the trigger a moment to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Refresh to get the newly created profile
      await refreshProfile();
      await refreshWallets();
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setWallets([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        wallets,
        categories,
        session,
        loading,
        isConfigured,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        refreshWallets,
        refreshCategories,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
