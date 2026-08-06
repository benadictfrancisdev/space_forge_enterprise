import { backend } from "@/platform";
import { auth } from "@/lib/firebase";

/**
 * Invoke a named backend capability with Firebase ID token authentication.
 */
export async function invokeEdgeFunction<T = Record<string, unknown>>(
  functionName: string,
  body: Record<string, unknown>,
  options?: { headers?: Record<string, string> }
): Promise<{ data: T | null; error: Error | null }> {
  const headers: Record<string, string> = { ...options?.headers };

  // Get Firebase ID token if user is logged in
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const idToken = await currentUser.getIdToken();
      headers["Authorization"] = `Bearer ${idToken}`;
    } catch (err) {
      console.warn("[EdgeFn] Failed to get Firebase ID token:", err);
    }
  }

  const { data, error } = await backend.functions.invoke(functionName, {
    body,
    headers,
  });

  return { data: data as T | null, error };
}
