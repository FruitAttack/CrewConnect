import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";

let storage;

const hasBrowserLocalStorage =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  typeof localStorage !== "undefined" &&
  typeof localStorage.getItem === "function" &&
  typeof localStorage.setItem === "function" &&
  typeof localStorage.removeItem === "function";

if (hasBrowserLocalStorage) {
  // Use browser localStorage on web when available
  storage = {
    getItem: (key) => Promise.resolve(localStorage.getItem(key)),
    setItem: (key, value) => Promise.resolve(localStorage.setItem(key, value)),
    removeItem: (key) => Promise.resolve(localStorage.removeItem(key)),
  };
} else if (Platform.OS !== "web") {
  // Use AsyncStorage on native platforms
  const AsyncStorage = require("@react-native-async-storage/async-storage").default;
  storage = AsyncStorage;
} else {
  // Fallback for environments with no window or localStorage (e.g. SSR or test)
  storage = {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  };
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_KEY,
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
