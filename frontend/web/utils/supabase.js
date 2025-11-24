import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

const storage = typeof window !== "undefined" ? window.localStorage : undefined;

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_KEY,
  {
    auth: {
      storage: storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);