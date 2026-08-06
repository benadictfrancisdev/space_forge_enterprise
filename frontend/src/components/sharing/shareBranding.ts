const SHARE_APP_DOMAIN = "spaceforge.in";

type ShareUser = {
  email?: string | null;
  user_metadata?: {
    display_name?: string;
  };
} | null | undefined;

export function resolveShareDomain(source?: string) {
  if (!source || source.includes("localhost") || source.includes("127.0.0.1")) return SHARE_APP_DOMAIN;
  return source.replace(/^https?:\/\//, "").replace(/\/$/, "") || SHARE_APP_DOMAIN;
}

export function resolveShareUsername(user: ShareUser) {
  const candidate = user?.user_metadata?.display_name?.trim() || user?.email?.split("@")[0]?.trim() || "spaceforge";
  return candidate.slice(0, 32);
}

export function resolveShareFooterIdentity(user: ShareUser, source?: string) {
  return `${resolveShareDomain(source)} · ${resolveShareUsername(user)}`;
}

export { SHARE_APP_DOMAIN };