export function isV2PlatformPath(pathname: string): boolean {
  return pathname === "/v2" || pathname.startsWith("/v2/");
}
