"use client";
import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { supabase } from "./supabase";
import { isAdminUser, mapAuthUser } from "./auth";
import { isAdminEmail } from "./env";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setUser(mapAuthUser(session?.user));
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("Failed to retrieve auth session:", err);
        setUser(null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(mapAuthUser(session?.user));
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * The server claim (admin_users / JWT) is the source of truth. Delegate to
   * the one shared helper, `isAdminUser` in ./auth, so the client and the
   * server's RLS policy cannot disagree about who is an admin.
   *
   * The allowlist is intentionally NOT read from `NEXT_PUBLIC_ADMIN_EMAILS`:
   * `NEXT_PUBLIC_*` values are inlined into the client bundle, which published
   * the full admin list to every visitor and let an env-only operator see a
   * panel whose writes all failed. The list now lives only in `admin_users`.
   */
  const isAdmin = useMemo(() => isAdminUser(user), [user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin,
      isAuthenticated: !!user,
    }),
    [user, loading, isAdmin]
  );

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => useContext(AuthContext);
