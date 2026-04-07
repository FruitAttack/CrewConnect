import { create } from "zustand";
import { apiCall } from "../utils/api";
import { useOfflineStore } from './offlineStore';

export const useTimeStore = create((set, get) => ({
  isClockedIn: false,
  currentTimeEntryId: null,

  isOnBreak: false,
  currentBreakId: null,
  breakStartTime: null,

  secondsWorkedToday: 0,
  secondsWorkedShift: 0,

  lastServerUpdateTimestamp: null,
  
  // Track the current day to detect midnight crossings
  _currentDay: new Date().toDateString(),
  _midnightCheckInterval: null,

  // --- Internal State Setters ---
  _fetchWorkedSeconds: async (session) => {
    if (!session?.access_token) return;

    try {
      const shiftResp = await apiCall(
        session.access_token,
        "time-entries/seconds-worked/shift",
        "GET"
      );
      const todayResp = await apiCall(
        session.access_token,
        "time-entries/seconds-worked/today",
        "GET"
      );

      set({
        secondsWorkedShift: shiftResp.success ? shiftResp.data.seconds : 0,
        secondsWorkedToday: todayResp.success ? todayResp.data.seconds : 0,
        lastServerUpdateTimestamp: Date.now(),
      });
    } catch (err) {
      console.error("Failed to fetch worked seconds:", err);
      set({
        secondsWorkedShift: 0,
        secondsWorkedToday: 0,
        lastServerUpdateTimestamp: Date.now(),
      });
    }
  },

  _setClockInState: (entryId) => {
    console.log("⏰ STATE: Clocked In (ID:", entryId, ")");
    set({
      isOnBreak: false,
      isClockedIn: true,
      currentTimeEntryId: entryId,
      _currentDay: new Date().toDateString(),
    });
  },

  _setClockOutState: () => {
    console.log("⏰ STATE: Clocked Out. Resetting all time state.");
    set({
      isClockedIn: false,
      currentTimeEntryId: null,
      isOnBreak: false,
      currentBreakId: null,
      breakStartTime: null,
      secondsWorkedShift: 0,
      lastServerUpdateTimestamp: null,
    });
  },

  _setBreakStartState: (breakId) => {
    console.log("⏰ STATE: Break Started (Break ID:", breakId, ")");
    set({
      isOnBreak: true,
      currentBreakId: breakId,
      breakStartTime: Date.now(),
    });
  },

  _setBreakEndState: () => {
    console.log("⏰ STATE: Break Ended.");
    set({
      isOnBreak: false,
      currentBreakId: null,
      breakStartTime: null,
    });
  },

  getSecondsWorkedShift: () => {
    const state = get();
    if (!state.isClockedIn || !state.lastServerUpdateTimestamp)
      return state.secondsWorkedShift;

    // Timer keeps running even on break (break time is tracked separately)
    const now = Date.now();
    const delta = Math.floor((now - state.lastServerUpdateTimestamp) / 1000);
    return state.secondsWorkedShift + delta;
  },

  getSecondsWorkedToday: () => {
    const state = get();
    if (!state.isClockedIn || !state.lastServerUpdateTimestamp)
      return state.secondsWorkedToday;

    // Timer keeps running even on break (break time is tracked separately)
    const now = Date.now();
    const delta = Math.floor((now - state.lastServerUpdateTimestamp) / 1000);
    return state.secondsWorkedToday + delta;
  },

  getSecondsOnBreak: () => {
    const state = get();
    if (!state.isOnBreak || !state.breakStartTime) return 0;
    
    const now = Date.now();
    return Math.floor((now - state.breakStartTime) / 1000);
  },

  // --- Midnight Detection ---
  
  /**
   * Check if we've crossed midnight and need to refresh from server.
   * The backend splits entries at midnight, so we need to:
   * 1. Get the new time entry ID (old one was closed at 11:59:59)
   * 2. Reset shift seconds (new day = new shift for display)
   * 3. Update today's seconds
   */
  checkMidnightCrossing: async (session, { isOffline = false } = {}) => {
    const state = get();
    const now = new Date();
    const today = now.toDateString();

    if (state._currentDay === today) {
      return false;
    }

    console.log("🌙 Midnight crossing detected!");
    console.log("   Previous day:", state._currentDay);
    console.log("   Current day:", today);

    // Always advance the tracked day
    set({ _currentDay: today });

    // If not clocked in, we're done
    if (!state.isClockedIn) {
      return true;
    }

    // Offline: do a local rollover only
    if (isOffline) {
      const midnight = new Date(now);
      midnight.setHours(0, 0, 0, 0);

      set({
        pendingMidnightHydration: true,
        secondsWorkedToday: 0,
        secondsWorkedShift: 0,
        lastServerUpdateTimestamp: midnight.getTime(),
      });

      return true;
    }

    // Online: re-hydrate from server to get the split entry / new entry ID
    await get().hydrateFromServer(session);
    return true;
  },

  /**
   * Start the midnight check interval.
   * Call this when the app becomes active or user clocks in.
   */
  startMidnightWatch: (session) => {
    const state = get();

    if (state._midnightCheckInterval) {
      clearInterval(state._midnightCheckInterval);
    }

    const interval = setInterval(() => {
      const isOffline = useOfflineStore.getState().isOffline;
      get().checkMidnightCrossing(session, { isOffline });
    }, 60000);

    set({ _midnightCheckInterval: interval });

    console.log("🌙 Midnight watch started");
  },

  /**
   * Stop the midnight check interval.
   * Call this when user clocks out or app goes to background.
   */
  stopMidnightWatch: () => {
    const state = get();
    
    if (state._midnightCheckInterval) {
      clearInterval(state._midnightCheckInterval);
      set({ _midnightCheckInterval: null });
      console.log("🌙 Midnight watch stopped");
    }
  },

  // For when we have a cold start and need to restore our states
  restoreFromOfflineQueue: (queue) => {
  const entries = [...queue]
    .filter((e) => e.status !== "failed")
    .sort((a, b) => a.localTimestamp - b.localTimestamp);

  let activeClockIn = null;
  let activeBreak = null;

  for (const entry of entries) {
    switch (entry.type) {
      case "CLOCK_IN":
        activeClockIn = entry;
        activeBreak = null;
        break;

      case "START_BREAK":
        if (activeClockIn) activeBreak = entry;
        break;

      case "END_BREAK":
        activeBreak = null;
        break;

      case "CLOCK_OUT":
        activeClockIn = null;
        activeBreak = null;
        break;
    }
  }

  if (!activeClockIn) {
    set({
      isClockedIn: false,
      currentTimeEntryId: null,
      isOnBreak: false,
      currentBreakId: null,
      breakStartTime: null,
      secondsWorkedShift: 0,
      lastServerUpdateTimestamp: null,
      _currentDay: new Date().toDateString(),
    });
    return;
  }

  const clockInMs =
    Date.parse(activeClockIn.payload?.clock_in) || activeClockIn.localTimestamp;

  const breakStartMs = activeBreak
    ? Date.parse(activeBreak.payload?.break_start) || activeBreak.localTimestamp
    : null;

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - clockInMs) / 1000)
  );

  set({
    isClockedIn: true,
    currentTimeEntryId: activeClockIn.id,
    isOnBreak: !!activeBreak,
    currentBreakId: activeBreak?.id || null,
    breakStartTime: breakStartMs,
    secondsWorkedShift: elapsedSeconds,
    secondsWorkedToday: elapsedSeconds,
    lastServerUpdateTimestamp: Date.now(),
    _currentDay: new Date().toDateString(),
  });
},

  // --- API / ASYNC Actions ---

  // 1. Initial hydration for both clock-in and break status
  hydrateFromServer: async (session) => {
    if (!session?.access_token) return;

    // Get current time entry
    const entryResp = await apiCall(
      session.access_token,
      "time-entries/current",
      "GET"
    );
    const breakResp = await apiCall(
      session.access_token,
      "time-entries/break/current",
      "GET"
    );

    const isClockedIn = !!entryResp.data;
    const newEntryId = entryResp.data?.id || null;
    
    // Check if the entry ID changed (indicates a midnight split occurred)
    const state = get();
    if (state.currentTimeEntryId && newEntryId && state.currentTimeEntryId !== newEntryId) {
      console.log("🌙 Time entry ID changed (midnight split detected)");
      console.log("   Old ID:", state.currentTimeEntryId);
      console.log("   New ID:", newEntryId);
    }

    // API returns the entry/break directly in data, not nested
    set({
      isClockedIn: isClockedIn,
      currentTimeEntryId: newEntryId,
      isOnBreak: !!breakResp.data,
      currentBreakId: breakResp.data?.id || null,
      _currentDay: new Date().toDateString(),
      pendingMidnightHydration: false,
    });

    // Fetch authoritative worked seconds
    await get()._fetchWorkedSeconds(session);
  },

  // 2. Clock In Action
  doClockIn: async (session, body) => {
    if (!session?.access_token)
      return { success: false, message: "Not authenticated." };

    const offlineStore = useOfflineStore.getState();

    if (offlineStore.isOffline) {
      const entry = await offlineStore.enqueue("CLOCK_IN", {
        ...body,
        clock_in: new Date().toISOString(),
      });

      get()._setClockInState(entry.id);

      set({
        secondsWorkedShift: 0,
        secondsWorkedToday: 0,
        lastServerUpdateTimestamp: Date.now(),
      });

      get().startMidnightWatch(session);

      return {
        success: true,
        offline: true,
        data: { id: entry.id },
      };
    }

    const response = await apiCall(
      session.access_token,
      "time-entries/clock-in",
      "POST",
      body
    );

    console.log("Clock-in response:", response);

    if (response.success) {
      get()._setClockInState(response.data.id);
      await get()._fetchWorkedSeconds(session);
      get().startMidnightWatch(session);
    }

    return response;
  },

  // 3. Clock Out Action
  doClockOut: async (session, body = {}) => {
    if (!session?.access_token)
      return { success: false, message: "Not authenticated." };

    const offlineStore = useOfflineStore.getState();

    if (offlineStore.isOffline) {
      if (get().isOnBreak) {
        await offlineStore.enqueue("END_BREAK", {
          break_end: new Date().toISOString(),
        });
        get()._setBreakEndState();
      }

      await offlineStore.enqueue("CLOCK_OUT", {
        ...body,
        clock_out: new Date().toISOString(),
      });

      get()._setClockOutState();
      get().stopMidnightWatch();

      return {
        success: true,
        offline: true,
      };
    }

    if (get().isOnBreak) {
      console.log("⏰ Ending break before clock out...");
      await get().doEndBreak(session);
    }

    const response = await apiCall(
      session.access_token,
      "time-entries/clock-out",
      "POST",
      body
    );

    console.log("Clock-out response:", response);

    if (response.success) {
      get()._setClockOutState();
      await get()._fetchWorkedSeconds(session);
      get().stopMidnightWatch();

      if (response.data?._split) {
        console.log(
          "🌙 Clock-out resulted in split entries:",
          response.data._totalSegments,
          "segments"
        );
      }
    }

    return response;
  },

  // 4. Start Break Action
  doStartBreak: async (session) => {
    if (!session?.access_token)
      return { success: false, message: "Not authenticated." };

    const offlineStore = useOfflineStore.getState();

    if (offlineStore.isOffline) {
      const entry = await offlineStore.enqueue("START_BREAK", {
        break_start: new Date().toISOString(),
      });

      get()._setBreakStartState(entry.id);

      return {
        success: true,
        offline: true,
        data: { id: entry.id },
      };
    }

    const response = await apiCall(
      session.access_token,
      "time-entries/break/start",
      "POST",
      {}
    );

    if (response.success && response.data?.id) {
      get()._setBreakStartState(response.data.id);
      await get()._fetchWorkedSeconds(session);
    }

    return response;
  },

  // 5. End Break Action
  doEndBreak: async (session) => {
    if (!session?.access_token)
      return { success: false, message: "Not authenticated." };

    const offlineStore = useOfflineStore.getState();

    if (offlineStore.isOffline) {
      await offlineStore.enqueue("END_BREAK", {
        break_end: new Date().toISOString(),
      });

      get()._setBreakEndState();

      return {
        success: true,
        offline: true,
      };
    }

    const response = await apiCall(
      session.access_token,
      "time-entries/break/end",
      "POST",
      {}
    );

    if (response.success) {
      get()._setBreakEndState();
      await get()._fetchWorkedSeconds(session);
    }

    return response;
  },
}));