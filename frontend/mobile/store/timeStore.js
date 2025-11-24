import { create } from "zustand";

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

    const res = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/time-entries/current`,
      {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }
    );

    const data = await res.json();

    if (!data.success || !data.data?.clock_in) {
      set({
        isClockedIn: false,
        currentTimeEntryId: null,
        clockInTimestamp: null,
      });
      return;
    }

    set({
      isClockedIn: true,
      currentTimeEntryId: data.data.time_entry_id,
      clockInTimestamp: data.data.clock_in,
    });
  },
}));
