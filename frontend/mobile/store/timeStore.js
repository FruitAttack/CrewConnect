import { create } from "zustand";
import { apiCall } from "../utils/api";
import { useOfflineStore } from "./offlineStore";

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

    const now = Date.now();
    const delta = Math.floor((now - state.lastServerUpdateTimestamp) / 1000);
    return state.secondsWorkedShift + delta;
  },

  getSecondsWorkedToday: () => {
    const state = get();
    if (!state.isClockedIn || !state.lastServerUpdateTimestamp)
      return state.secondsWorkedToday;

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

  checkMidnightCrossing: async (session) => {
    const state = get();
    const today = new Date().toDateString();

    if (state._currentDay !== today && state.isClockedIn) {
      console.log("🌙 Midnight crossing detected! Refreshing from server...");
      set({ _currentDay: today });
      await get().hydrateFromServer(session);
      return true;
    }

    if (state._currentDay !== today) {
      set({ _currentDay: today });
    }

    return false;
  },

  startMidnightWatch: (session) => {
    const state = get();

    if (state._midnightCheckInterval) {
      clearInterval(state._midnightCheckInterval);
    }

    const interval = setInterval(() => {
      get().checkMidnightCrossing(session);
    }, 60000);

    set({ _midnightCheckInterval: interval });
    console.log("🌙 Midnight watch started");
  },

  stopMidnightWatch: () => {
    const state = get();

    if (state._midnightCheckInterval) {
      clearInterval(state._midnightCheckInterval);
      set({ _midnightCheckInterval: null });
      console.log("🌙 Midnight watch stopped");
    }
  },

  // --- API / ASYNC Actions ---

  hydrateFromServer: async (session) => {
    if (!session?.access_token) return;

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

    const state = get();
    if (
      state.currentTimeEntryId &&
      newEntryId &&
      state.currentTimeEntryId !== newEntryId
    ) {
      console.log("🌙 Time entry ID changed (midnight split detected)");
    }

    set({
      isClockedIn: isClockedIn,
      currentTimeEntryId: newEntryId,
      isOnBreak: !!breakResp.data,
      currentBreakId: breakResp.data?.id || null,
      _currentDay: new Date().toDateString(),
    });

    await get()._fetchWorkedSeconds(session);
  },

  // 2. Clock In — offline-aware
  doClockIn: async (session, body) => {
    if (!session?.access_token)
      return { success: false, message: "Not authenticated." };

    const offlineStore = useOfflineStore.getState();

    // ── OFFLINE PATH ─────────────────────────────────────────────────
    if (offlineStore.isOffline) {
      const entry = await offlineStore.enqueue("CLOCK_IN", {
        ...body,
        // Record the local time so the server gets an accurate clock_in
        // when it supports a `clock_in` override (your backend already does
        // for the manage endpoint; you can optionally add it to the regular
        // clock-in endpoint too, or let the server use its own time on sync).
        _localTimestamp: new Date().toISOString(),
      });

      // Optimistically update UI with a local "fake" entry ID
      get()._setClockInState(entry.id);

      // Seed the shift timer from local time
      set({
        secondsWorkedShift: 0,
        secondsWorkedToday: 0,
        lastServerUpdateTimestamp: Date.now(),
      });

      get().startMidnightWatch(session);

      return { success: true, data: { id: entry.id }, offline: true };
    }

    // ── ONLINE PATH ──────────────────────────────────────────────────
    const response = await apiCall(
      session.access_token,
      "time-entries/clock-in",
      "POST",
      body
    );

    if (response.success) {
      get()._setClockInState(response.data.id);
      await get()._fetchWorkedSeconds(session);
      get().startMidnightWatch(session);
    }
    return response;
  },

  // 3. Clock Out — offline-aware
  doClockOut: async (session, body = {}) => {
    if (!session?.access_token)
      return { success: false, message: "Not authenticated." };

    const offlineStore = useOfflineStore.getState();

    // ── OFFLINE PATH ─────────────────────────────────────────────────
    if (offlineStore.isOffline) {
      // End break first if needed
      if (get().isOnBreak) {
        await offlineStore.enqueue("END_BREAK", {});
        get()._setBreakEndState();
      }

      await offlineStore.enqueue("CLOCK_OUT", {
        ...body,
        _localTimestamp: new Date().toISOString(),
      });

      get()._setClockOutState();
      get().stopMidnightWatch();
      return { success: true, offline: true };
    }

    // ── ONLINE PATH ──────────────────────────────────────────────────
    if (get().isOnBreak) {
      await get().doEndBreak(session);
    }

    const response = await apiCall(
      session.access_token,
      "time-entries/clock-out",
      "POST",
      body
    );

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

  // 4. Start Break — offline-aware
  doStartBreak: async (session) => {
    if (!session?.access_token)
      return { success: false, message: "Not authenticated." };

    const offlineStore = useOfflineStore.getState();

    if (offlineStore.isOffline) {
      const entry = await offlineStore.enqueue("START_BREAK", {});
      get()._setBreakStartState(entry.id);
      return { success: true, data: { id: entry.id }, offline: true };
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

  // 5. End Break — offline-aware
  doEndBreak: async (session) => {
    if (!session?.access_token)
      return { success: false, message: "Not authenticated." };

    const offlineStore = useOfflineStore.getState();

    if (offlineStore.isOffline) {
      await offlineStore.enqueue("END_BREAK", {});
      get()._setBreakEndState();
      return { success: true, offline: true };
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