"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

import { auth } from "@/lib/firebase";
import {
  ensureUserProfile,
  subscribeUserProfile,
  syncPainelIndexForUser,
} from "@/lib/firestore";
import type { UserProfile } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = undefined;
      }

      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      unsubscribeProfile = subscribeUserProfile(nextUser.uid, (nextProfile) => {
        setProfile(nextProfile);
      });

      void ensureUserProfile(nextUser).catch((error) => {
        // eslint-disable-next-line no-console
        console.error("Falha ao garantir perfil do usuario no Firestore.", error);
      });

      void syncPainelIndexForUser(nextUser).catch((error) => {
        // eslint-disable-next-line no-console
        console.error("Falha ao sincronizar painel do usuario.", error);
      });

      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile?.();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      logout: async () => signOut(auth),
    }),
    [loading, profile, user],
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthContext.Provider value={value}>
        {children}
        <Toaster richColors position="top-center" />
      </AuthContext.Provider>
    </ThemeProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AppProviders.");
  }

  return context;
}
