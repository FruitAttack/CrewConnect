import { useEffect, useRef } from "react";
import NetInfo from "@react-native-community/netinfo";
import { useOfflineStore } from "../store/offlineStore";
import { useTimeStore } from "../store/timeStore";
import { apiCall } from "./api";
import { useSession } from "./ctx";

/**
 * useNetworkStatus
 *
 * Subscribes to network changes, updates the offline store,
 * and triggers a queue sync + server hydration when connectivity returns.
 *
 * Mount this once high in the tree (e.g. inside your root layout or SessionProvider).
 */
export function useNetworkStatus() {
  const { session } = useSession();
  const setIsOffline = useOfflineStore((s) => s.setIsOffline);
  const syncQueue = useOfflineStore((s) => s.syncQueue);
  const hydrateFromServer = useTimeStore((s) => s.hydrateFromServer);

  // Track whether we were offline so we only sync on transition offline→online
  const wasOffline = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const offline = !(state.isConnected && state.isInternetReachable);
      setIsOffline(offline);

      if (!offline && wasOffline.current) {
        // We just came back online
        console.log("[Network] Back online — syncing offline queue...");
        await syncQueue(session, apiCall, () => hydrateFromServer(session));
      }

      wasOffline.current = offline;
    });

    return () => unsubscribe();
  }, [session]);
}