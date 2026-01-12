import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../utils/supabase.js";

const AuthContext = createContext({
  signIn: () => null,
  signUp: () => null,
  signOut: () => null,
  session: null,
  isLoading: false,
});

// Use this hook to access the user info.
export function useSession() {
  return useContext(AuthContext);
}

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const currentSession = supabase.auth.getSession();
    currentSession.then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    // Listen for auth changes (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsLoading(false);

    if (error) throw error;
    setSession(data.session);
    return data.session;
  };

  const signUp = async (email, password) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setIsLoading(false);

    if (error) {
      // Check if user already exists
      if (error.message.includes("User already registered")) {
        throw new Error(
          "This email is already registered. Please log in instead."
        );
      }
      throw error;
    }

    setSession(data.session);
    return data.session;
  };

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{ session, isLoading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}