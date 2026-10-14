"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { disablePushOnThisDevice } from "@/lib/push-client";

const AuthContext = createContext({
  user: null,
  loading: true,
  setUser: () => {},
  refresh: async () => null,
  logout: async () => {},
});

/**
 * وضعیت ورود کاربر رو یک‌بار از /api/auth/me می‌گیره و به کل سایت (هدر، منوی پایین، ...) می‌ده.
 * layout رو dynamic نمی‌کنه؛ صفحه‌ها همچنان می‌تونن static بمونن.
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true });

  const refresh = useCallback(async () => {
    try {
      const data = await api("GET", "/api/auth/me");
      setState({ user: data.user ?? null, loading: false });
      return data.user ?? null;
    } catch {
      setState((s) => ({ ...s, loading: false }));
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setUser = useCallback((user) => setState({ user, loading: false }), []);

  /**
   * خروج از حساب. فقط وقتی سرور کوکی نشست رو پاک کرد وضعیت «خارج‌شده» نشون داده می‌شه؛
   * اگه درخواست شکست خورد (مثلاً اینترنت قطع بود) خطا پرتاب می‌شه تا کاربر سرِ یک سیستم مشترک فکر نکنه خارج شده در حالی که کوکی هنوز معتبره.
   */
  const logout = useCallback(async () => {
    await disablePushOnThisDevice(); // دستگاه بعد از خروج اعلان کاربر قبلی را نگیرد (خطاهاش بلعیده می‌شه)
    await api("POST", "/api/auth/logout", {});
    setState({ user: null, loading: false });
  }, []);

  const value = useMemo(
    () => ({ ...state, setUser, refresh, logout }),
    [state, setUser, refresh, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
