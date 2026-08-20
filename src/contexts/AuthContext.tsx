import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const DEMO_MODE_STORAGE_KEY = "thrive_demo_mode";

const demoUser = {
  id: "thrive-demo-user",
  aud: "authenticated",
  email: "demo@thrv.media",
  app_metadata: { provider: "demo", providers: ["demo"] },
  user_metadata: { display_name: "THRV Demo" },
  created_at: "2026-01-01T00:00:00.000Z",
} as User;

function hasStoredDemoSession() {
  return typeof window !== "undefined" && window.sessionStorage.getItem(DEMO_MODE_STORAGE_KEY) === "true";
}

export type AccountStatus = "active" | "invited" | "suspended" | "disabled" | "unregistered" | "error" | null;
export type AppRole = "owner" | "editor" | "videographer" | "client" | null;

type AccessState = {
  status?: AccountStatus;
  role?: AppRole;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  accessLoading: boolean;
  accountStatus: AccountStatus;
  role: AppRole;
  demoMode: boolean;
  enterDemo: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshAccess: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [demoMode, setDemoMode] = useState(hasStoredDemoSession);
  const [user, setUser] = useState<User | null>(() => hasStoredDemoSession() ? demoUser : null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(() => !hasStoredDemoSession());
  const [accessLoading, setAccessLoading] = useState(() => !hasStoredDemoSession());
  const [accountStatus, setAccountStatus] = useState<AccountStatus>(() => hasStoredDemoSession() ? "active" : null);
  const [role, setRole] = useState<AppRole>(() => hasStoredDemoSession() ? "owner" : null);

  const loadAccessState = useCallback(async (activeSession: Session | null) => {
    if (!activeSession) {
      setAccountStatus(null);
      setRole(null);
      setAccessLoading(false);
      return;
    }

    setAccessLoading(true);
    const { data, error } = await supabase.rpc("get_current_access_state");
    if (error) {
      setAccountStatus("error");
      setRole(null);
      setAccessLoading(false);
      return;
    }

    const access = (data ?? {}) as AccessState;
    setAccountStatus(access.status ?? "unregistered");
    setRole(access.role ?? null);
    setAccessLoading(false);
  }, []);

  useEffect(() => {
    if (demoMode) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // Supabase recommends deferring additional client calls from this callback.
      window.setTimeout(() => void loadAccessState(session), 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      void loadAccessState(session);
    });

    return () => subscription.unsubscribe();
  }, [demoMode, loadAccessState]);

  const enterDemo = () => {
    window.sessionStorage.setItem(DEMO_MODE_STORAGE_KEY, "true");
    setDemoMode(true);
    setSession(null);
    setUser(demoUser);
    setAccountStatus("active");
    setRole("owner");
    setLoading(false);
    setAccessLoading(false);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    if (demoMode) {
      window.sessionStorage.removeItem(DEMO_MODE_STORAGE_KEY);
      setDemoMode(false);
      setSession(null);
      setUser(null);
      setAccountStatus(null);
      setRole(null);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setAccountStatus(null);
    setRole(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const refreshAccess = async () => {
    if (demoMode) return;
    await loadAccessState(session);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      accessLoading,
      accountStatus,
      role,
      demoMode,
      enterDemo,
      signIn,
      signOut,
      resetPassword,
      refreshAccess,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Context hooks intentionally live beside their provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
