import { create } from "zustand";
import { apiCall } from "../utils/api";

export const useTimeStore = create((set) => ({
  isClockedIn: false,
  currentTimeEntryId: null,
  clockInTimestamp: null,

  // compute elapsed seconds live
  getElapsedSeconds: () => {
    const state = useTimeStore.getState();
    if (!state.clockInTimestamp) {
      return 0;
    }
    const now = Date.now();
    const start = new Date(state.clockInTimestamp).getTime();
    return Math.floor((now - start) / 1000);
  },

  setClockIn: (entryId, timestamp) =>
    set({
      isClockedIn: true,
      currentTimeEntryId: entryId,
      clockInTimestamp: timestamp,
    }),

  setClockOut: () =>
    set({
      isClockedIn: false,
      currentTimeEntryId: null,
      clockInTimestamp: null,
    }),

  // Call this on app startup or screen mount
  hydrateFromServer: async (session) => {
    if (!session?.access_token) return;

    const response = await apiCall(
      session.access_token,
      "time-entries/current",
      "GET"
    );

    if (!response.success || !response.data.current_entry?.clock_in) {
      set({
        isClockedIn: false,
        currentTimeEntryId: null,
        clockInTimestamp: null,
      });
      return;
    }

    set({
      isClockedIn: true,
      currentTimeEntryId: response.data.current_entry.id,
      clockInTimestamp: response.data.current_entry.clock_in,
    });
  },
}));
