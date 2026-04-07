import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { offlineClockIn, offlineClockOut, offlineStartBreak, offlineEndBreak } from "../utils/api";

const OFFLINE_QUEUE_KEY = "crewconnect_offline_queue";
const CACHED_PROJECTS_KEY = "crewconnect_cached_projects";
const CACHED_EQUIPMENT_KEY = "crewconnect_cached_equipment";
const CACHED_COST_CODES_KEY = "crewconnect_cached_cost_codes"; // keyed by project_id

/**
 * Offline Queue Entry shape:
 * {
 *   id: string,           // local UUID
 *   type: 'CLOCK_IN' | 'CLOCK_OUT' | 'START_BREAK' | 'END_BREAK',
 *   payload: object,      // body sent to the API
 *   localTimestamp: number, // Date.now() when action was taken
 *   status: 'pending' | 'syncing' | 'failed',
 *   retries: number,
 * }
 */

function generateLocalId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useOfflineStore = create((set, get) => ({
  isOffline: false,
  queue: [],           // pending actions to sync
  isSyncing: false,
  lastSyncAttempt: null,
  isBootstrapped: false,


  // Cached lookup data (loaded from AsyncStorage on app start)
  cachedProjects: [],
  cachedEquipment: [],
  cachedCostCodes: {}, // { [project_id]: [...] }

  // Bootstrap State

  setBootstrapped: (value) => set({ isBootstrapped: value }),

  // ─── Network State ───────────────────────────────────────────────

  setIsOffline: (isOffline) => set({ isOffline }),

  // ─── Queue Management ────────────────────────────────────────────

  /**
   * Add an action to the offline queue and persist it.
   * Returns the local entry so callers can optimistically update UI.
   */
  enqueue: async (type, payload) => {
    const entry = {
      id: generateLocalId(),
      type,
      payload,
      localTimestamp: Date.now(),
      status: "pending",
      retries: 0,
    };

    const nextQueue = [...get().queue, entry];
    set({ queue: nextQueue });
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(nextQueue));
    console.log(`[Offline] Queued ${type}:`, entry.id);
    return entry;
  },

  /**
   * Load the persisted queue from AsyncStorage (call on app start).
   */
  loadQueue: async () => {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (stored) {
        const queue = JSON.parse(stored);
        // Reset any 'syncing' entries back to 'pending' (app was killed mid-sync)
        const reset = queue.map((e) =>
          e.status === "syncing" ? { ...e, status: "pending" } : e
        );
        set({ queue: reset });
      }
    } catch (err) {
      console.warn("[Offline] Failed to load queue:", err);
    }
  },

  /**
   * Remove a successfully synced entry from the queue.
   */
  dequeue: async (id) => {
    const nextQueue = get().queue.filter((e) => e.id !== id);
    set({ queue: nextQueue });
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(nextQueue));
  },

  /**
   * Mark an entry as failed.
   */
  markFailed: async (id) => {
    const nextQueue = get().queue.map((e) =>
      e.id === id ? { ...e, status: "failed", retries: e.retries + 1 } : e
    );
    set({ queue: nextQueue });
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(nextQueue));
  },

  /**
   * How many pending (unsynced) entries exist.
   */
  pendingCount: () => get().queue.filter((e) => e.status !== "failed").length,

  /**
   * Returns true if there is an offline CLOCK_IN pending (no CLOCK_OUT after it).
   */
  hasOfflineClockIn: () => {
    const q = get().queue;
    // Walk forward: last CLOCK_IN without a subsequent CLOCK_OUT = clocked in offline
    let clockedIn = false;
    for (const entry of q) {
      if (entry.type === "CLOCK_IN") clockedIn = true;
      if (entry.type === "CLOCK_OUT") clockedIn = false;
    }
    return clockedIn;
  },

  /**
   * Get the pending CLOCK_IN payload (for showing what job the user clocked into offline).
   */
  getOfflineClockInEntry: () => {
    const q = [...get().queue].reverse();
    return q.find((e) => e.type === "CLOCK_IN") || null;
  },

  // ─── Sync ────────────────────────────────────────────────────────

  /**
   * Process the queue in order, calling apiCall for each entry.
   * Pass in the apiCall function and session to avoid circular imports.
   */
    syncQueue: async (session, onSyncComplete) => {
    const state = get();
    if (state.isSyncing) return;
    if (!session?.access_token) return;

    const pending = state.queue.filter((e) => e.status === "pending");
    if (pending.length === 0) return;

    set({ isSyncing: true, lastSyncAttempt: Date.now() });

    for (const entry of pending) {
      set((s) => ({
        queue: s.queue.map((e) =>
          e.id === entry.id ? { ...e, status: "syncing" } : e
        ),
      }));

      try {
        const payload = {
          ...entry.payload,
          client_action_id: entry.id,
        };

        let response;

        switch (entry.type) {
          case "CLOCK_IN":
            response = await offlineClockIn(session.access_token, payload);
            break;
          case "CLOCK_OUT":
            response = await offlineClockOut(session.access_token, payload);
            break;
          case "START_BREAK":
            response = await offlineStartBreak(session.access_token, payload);
            break;
          case "END_BREAK":
            response = await offlineEndBreak(session.access_token, payload);
            break;
          default:
            await get().dequeue(entry.id);
            continue;
        }

        if (response.success) {
          await get().dequeue(entry.id);
        } else {
          const msg = response.message?.toLowerCase() || "";

          if (
            msg.includes("already clocked in") ||
            msg.includes("already clocked out") ||
            msg.includes("no open time entry") ||
            msg.includes("already on break") ||
            msg.includes("no active break")
          ) {
            await get().dequeue(entry.id);
          } else {
            await get().markFailed(entry.id);
          }
        }
      } catch {
        await get().markFailed(entry.id);
      }
    }

    set({ isSyncing: false });

    if (onSyncComplete) {
      await onSyncComplete();
    }
  },

  // ─── Cache Lookups ───────────────────────────────────────────────

  /**
   * Save fetched projects to the local cache.
   */
  cacheProjects: async (projects) => {
    set({ cachedProjects: projects });
    try {
      await AsyncStorage.setItem(CACHED_PROJECTS_KEY, JSON.stringify(projects));
    } catch {}
  },

  /**
   * Save fetched equipment to the local cache.
   */
  cacheEquipment: async (equipment) => {
    set({ cachedEquipment: equipment });
    try {
      await AsyncStorage.setItem(CACHED_EQUIPMENT_KEY, JSON.stringify(equipment));
    } catch {}
  },

  /**
   * Save fetched cost codes for a specific project.
   */
  cacheCostCodes: async (projectId, costCodes) => {
    const next = { ...get().cachedCostCodes, [projectId]: costCodes };
    set({ cachedCostCodes: next });
    try {
      await AsyncStorage.setItem(CACHED_COST_CODES_KEY, JSON.stringify(next));
    } catch {}
  },

  /**
   * Load all cached lookup data from AsyncStorage (call on app start).
   */
  loadCaches: async () => {
    try {
      const [projectsRaw, equipmentRaw, costCodesRaw] = await Promise.all([
        AsyncStorage.getItem(CACHED_PROJECTS_KEY),
        AsyncStorage.getItem(CACHED_EQUIPMENT_KEY),
        AsyncStorage.getItem(CACHED_COST_CODES_KEY),
      ]);
      set({
        cachedProjects: projectsRaw ? JSON.parse(projectsRaw) : [],
        cachedEquipment: equipmentRaw ? JSON.parse(equipmentRaw) : [],
        cachedCostCodes: costCodesRaw ? JSON.parse(costCodesRaw) : {},
      });
    } catch (err) {
      console.warn("[Offline] Failed to load caches:", err);
    }
  },
}));