import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User as FirebaseUser,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { backend } from "@/platform";

interface AuthUser {
  id: string;
  email: string | null;
  user_metadata: { display_name?: string };
}

interface AuthContextType {
  user: AuthUser | null;
  session: { user: AuthUser } | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapFirebaseUser(fbUser: FirebaseUser | null): AuthUser | null {
  if (!fbUser) return null;
  return {
    id: fbUser.uid,
    email: fbUser.email,
    user_metadata: { display_name: fbUser.displayName ?? undefined },
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync the Firebase user to public.profiles via an edge function. We can't
  // upsert directly from the client because RLS on `profiles` is keyed to
  // Profile sync against enterprise API (UID is Firebase text id)
  // so any direct write returns 403. The edge function uses the service role
  // after verifying the Firebase ID token.
  const syncProfile = (uid: string, email: string | null, displayName: string | null) => {
    backend.functions
      .invoke("sync-profile", { body: { userId: uid, email, displayName } })
      .then(() => {}, () => {}); // fire-and-forget â€” never block UI
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      const mapped = mapFirebaseUser(fbUser);
      setUser(mapped);
      setLoading(false);

      if (fbUser?.uid) {
        syncProfile(fbUser.uid, fbUser.email, fbUser.displayName);
      }
    });
    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }
      syncProfile(credential.user.uid, email, displayName ?? null);
      return { error: null };
    } catch (err: any) {
      return { error: err as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (err: any) {
      return { error: err as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      syncProfile(
        credential.user.uid,
        credential.user.email ?? null,
        credential.user.displayName ?? null,
      );
      return { error: null };
    } catch (err: any) {
      return { error: err as Error };
    }
  };


  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const session = user ? { user } : null;

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
