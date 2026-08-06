/**
 * Django JWT bridge — Track 2.2 / Track 7.
 * Firebase (or dev bridge) identity → SpaceForge access + refresh tokens.
 */

import { auth as firebaseAuth } from "@/lib/firebase";
import { httpRequest, isApiConfigured } from "./httpClient";
import type { AuthService } from "./contracts";

const TOKEN_KEY = "spaceforge.access_token";
const TOKEN_EXP_KEY = "spaceforge.access_token_exp";
const REFRESH_KEY = "spaceforge.refresh_token";

type TokenBundle = {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  user: { id: string; email: string; display_name: string; status: string };
};

function useDevBridge(): boolean {
  const mode = (import.meta.env.VITE_AUTH_BRIDGE as string | undefined)?.toLowerCase();
  if (mode === "firebase") return false;
  if (mode === "dev") return true;
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
  return /localhost|127\.0\.0\.1/.test(base);
}

function readCachedToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const exp = Number(localStorage.getItem(TOKEN_EXP_KEY) || "0");
    if (!token || !exp) return null;
    if (Date.now() >= exp - 60_000) return null;
    return token;
  } catch {
    return null;
  }
}

function cacheTokens(accessToken: string, refreshToken?: string, ttlSeconds = 3600): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + ttlSeconds * 1000));
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXP_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/** Force token refresh after 401 — Track 8.7 */
export async function forceRefreshAccessToken(): Promise<string | null> {
  clearAccessToken();
  const svc = new DjangoAuthService();
  return svc.getAccessToken();
}

export class DjangoAuthService implements AuthService {
  async getIdToken(): Promise<string | null> {
    const user = firebaseAuth.currentUser;
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch {
      return null;
    }
  }

  getUserId(): string | null {
    return firebaseAuth.currentUser?.uid ?? null;
  }

  getEmail(): string | null {
    return firebaseAuth.currentUser?.email ?? null;
  }

  async getAccessToken(): Promise<string | null> {
    if (!isApiConfigured()) return null;

    const cached = readCachedToken();
    if (cached) return cached;

    const refreshed = await this.tryRefresh();
    if (refreshed) return refreshed;

    const user = firebaseAuth.currentUser;
    if (!user) return null;

    let identityToken: string;
    if (useDevBridge()) {
      const email = user.email || `${user.uid}@users.spaceforge.local`;
      identityToken = `dev:${user.uid}:${email}`;
    } else {
      identityToken = (await this.getIdToken()) ?? "";
      if (!identityToken) return null;
    }

    const envelope = await httpRequest<TokenBundle>({
      method: "POST",
      path: "/api/v1/auth/exchange/",
      body: { token: identityToken },
      public: true,
      retries: 1,
    });

    const access = envelope.data?.access_token;
    if (!access) return null;
    cacheTokens(access, envelope.data?.refresh_token, envelope.data?.expires_in ?? 3600);
    return access;
  }

  private async tryRefresh(): Promise<string | null> {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (!refresh) return null;
    try {
      const envelope = await httpRequest<TokenBundle>({
        method: "POST",
        path: "/api/v1/auth/refresh/",
        body: { refresh_token: refresh },
        public: true,
        retries: 0,
      });
      const access = envelope.data?.access_token;
      if (!access) {
        clearAccessToken();
        return null;
      }
      cacheTokens(access, envelope.data?.refresh_token, envelope.data?.expires_in ?? 3600);
      return access;
    } catch {
      clearAccessToken();
      return null;
    }
  }

  async logout(): Promise<void> {
    const access = localStorage.getItem(TOKEN_KEY);
    try {
      if (access) {
        await httpRequest({
          method: "POST",
          path: "/api/v1/auth/logout/",
          retries: 0,
        });
      }
    } catch {
      // best-effort
    } finally {
      clearAccessToken();
    }
  }

  async logoutAll(): Promise<void> {
    try {
      await httpRequest({
        method: "POST",
        path: "/api/v1/auth/logout-all/",
        retries: 0,
      });
    } catch {
      // best-effort
    } finally {
      clearAccessToken();
    }
  }
}
